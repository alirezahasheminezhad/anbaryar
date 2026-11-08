//## ═══ app/04-excel-services.jsx ═══
//## سرویس‌های اکسل: خروجی موجودی/فاکتورها و خواندن فایل اکسل.
//## ترتیب فایل‌ها در build.py مهم است؛ همه‌ی بخش‌ها یک scope مشترک دارند.
        // --- Services ---
        const exportToExcel = (items, warehouses) => {
            const data = items.map(item => ({
                'نام کالا': item.name,
                'برند': item.brand,
                'تگ / دسته بندی': item.tag,
                'انبار': (getWarehouseById(warehouses, item.warehouseId) || {}).name || '',
                'تعداد موجودی': item.quantity,
                'واحد': item.unit || 'عدد',
                'آخرین بروزرسانی': new Date(item.lastUpdated || Date.now()).toLocaleDateString('fa-IR')
            }));
            const worksheet = XLSX.utils.json_to_sheet(data);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "موجودی انبار");
            XLSX.writeFile(workbook, `Mojooodi_${new Date().toLocaleDateString('fa-IR').replace(/\//g, '-')}.xlsx`);
        };

        // Export فاکتورهای فروش — بر اساس همان لیستِ فیلترشده/مرتب‌شده/انتخاب‌شده‌ای که به آن پاس داده می‌شود
        // (نه همه‌ی فاکتورها همیشه)، تا خروجی دقیقاً همان چیزی باشد که کاربر الان روی صفحه می‌بیند.
        const exportInvoicesToExcel = (invoiceList, label = 'گزارش_فاکتورها') => {
            const data = invoiceList.map(inv => {
                const weight = (inv.items || []).reduce((s, it) => s + getItemEffectiveWeight(it), 0);
                const qty = (inv.items || []).reduce((s, it) => s + (Number(it.qty) || 0), 0);
                return {
                    'شماره سند': inv.id.slice(-6),
                    'تاریخ': inv.date,
                    'مشتری': inv.customer,
                    'کالاها': (inv.items || []).map(it => it.name).join('، '),
                    'تعداد': qty,
                    'وزن (kg)': weight,
                    'مبلغ کل (تومان)': inv.totalPrice || 0,
                    'وضعیت': inv.status === 'pending' ? 'در انتظار ارسال' : (inv.status === 'cancelled' ? 'لغوشده' : 'تکمیل'),
                    'توضیحات': inv.description || '',
                };
            });
            const worksheet = XLSX.utils.json_to_sheet(data);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "فاکتورها");
            XLSX.writeFile(workbook, `${label}_${new Date().toLocaleDateString('fa-IR').replace(/\//g, '-')}.xlsx`);
        };

        // گزارش کامل چندشیتی (بند ۱۴): همان لیستِ فیلترشده/مرتب‌شده/انتخاب‌شده‌ای که به آن پاس داده می‌شود،
        // از چند زاویه‌ی مختلف در یک فایل اکسل با چند شیت — بدون اینکه هیچ منطق محاسباتی جدید بسازد،
        // فقط همان اعداد را (weight از getItemEffectiveWeight/Total) دوباره از زوایای مختلف جمع می‌زند.
        const exportInvoicesFullReport = (invoiceList, label = 'گزارش_کامل') => {
            const workbook = XLSX.utils.book_new();

            // ۱) ساده
            const simple = invoiceList.map(inv => ({
                'شماره سند': inv.id.slice(-6), 'تاریخ': inv.date, 'مشتری': inv.customer,
                'کالاها': (inv.items || []).map(it => it.name).join('، '),
                'تعداد': (inv.items || []).reduce((s, it) => s + (Number(it.qty) || 0), 0),
                'وزن (kg)': (inv.items || []).reduce((s, it) => s + getItemEffectiveWeight(it), 0),
                'مبلغ کل (تومان)': inv.totalPrice || 0,
                'وضعیت': inv.status === 'pending' ? 'در انتظار ارسال' : (inv.status === 'cancelled' ? 'لغوشده' : 'تکمیل'),
            }));
            XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(simple), 'ساده');

            // ۲) تفکیک مشتری
            const byCustomer = {};
            invoiceList.forEach(inv => {
                const key = inv.customer || 'بدون نام';
                if (!byCustomer[key]) byCustomer[key] = { 'مشتری': key, 'تعداد فاکتور': 0, 'جمع تعداد': 0, 'جمع وزن (kg)': 0, 'جمع مبلغ (تومان)': 0 };
                byCustomer[key]['تعداد فاکتور'] += 1;
                byCustomer[key]['جمع تعداد'] += (inv.items || []).reduce((s, it) => s + (Number(it.qty) || 0), 0);
                byCustomer[key]['جمع وزن (kg)'] += (inv.items || []).reduce((s, it) => s + getItemEffectiveWeight(it), 0);
                byCustomer[key]['جمع مبلغ (تومان)'] += inv.totalPrice || 0;
            });
            XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(Object.values(byCustomer).sort((a, b) => b['جمع مبلغ (تومان)'] - a['جمع مبلغ (تومان)'])), 'تفکیک مشتری');

            // ۳) تفکیک کالا
            const byItem = {};
            invoiceList.forEach(inv => {
                (inv.items || []).forEach(it => {
                    const key = `${it.name}${it.brand ? ' ' + it.brand : ''}`;
                    if (!byItem[key]) byItem[key] = { 'کالا': key, 'تعداد فاکتور': 0, 'جمع تعداد': 0, 'جمع وزن (kg)': 0, 'جمع مبلغ (تومان)': 0 };
                    byItem[key]['تعداد فاکتور'] += 1;
                    byItem[key]['جمع تعداد'] += Number(it.qty) || 0;
                    byItem[key]['جمع وزن (kg)'] += getItemEffectiveWeight(it);
                    byItem[key]['جمع مبلغ (تومان)'] += getItemEffectiveTotal(it);
                });
            });
            XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(Object.values(byItem).sort((a, b) => b['جمع مبلغ (تومان)'] - a['جمع مبلغ (تومان)'])), 'تفکیک کالا');

            // ۴) گزارش مالی
            const completedInvs = invoiceList.filter(i => i.status !== 'cancelled');
            const totalAmount = completedInvs.reduce((s, i) => s + (i.totalPrice || 0), 0);
            const totalWeight = completedInvs.reduce((s, i) => s + (i.items || []).reduce((ss, it) => ss + getItemEffectiveWeight(it), 0), 0);
            const financial = [
                { 'شاخص': 'تعداد کل فاکتور (بدون لغوشده)', 'مقدار': completedInvs.length },
                { 'شاخص': 'فاکتورهای تکمیل‌شده', 'مقدار': completedInvs.filter(i => i.status === 'completed').length },
                { 'شاخص': 'فاکتورهای در انتظار/بخشی', 'مقدار': completedInvs.filter(i => i.status === 'pending').length },
                { 'شاخص': 'جمع کل مبلغ (تومان)', 'مقدار': totalAmount },
                { 'شاخص': 'جمع کل وزن (kg)', 'مقدار': totalWeight },
                { 'شاخص': 'میانگین مبلغ هر فاکتور (تومان)', 'مقدار': completedInvs.length ? Math.round(totalAmount / completedInvs.length) : 0 },
                { 'شاخص': 'تعداد مشتریان یکتا', 'مقدار': new Set(completedInvs.map(i => i.customer)).size },
            ];
            XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(financial), 'گزارش مالی');

            // ۵) گزارش کسری — فقط بر اساس اطلاعاتِ صرفاً اطلاعاتیِ کسری هر کیسه که هنگام افزودن کالا از انبار کپی می‌شود
            // (deductionPerBag)؛ هیچ اثری در مبلغ/وزن واقعیِ فاکتور ندارد، صرفاً یک گزارش تحلیلی جداگانه است.
            const deficitRows = [];
            invoiceList.forEach(inv => {
                (inv.items || []).forEach(it => {
                    const perBag = Number(it.deductionPerBag) || 0;
                    if (!perBag) return;
                    const qty = Number(it.qty) || 0;
                    deficitRows.push({ 'شماره سند': inv.id.slice(-6), 'تاریخ': inv.date, 'مشتری': inv.customer, 'کالا': it.name, 'تعداد کیسه': qty, 'کسری هر کیسه (kg)': perBag, 'جمع کسری (kg)': qty * perBag });
                });
            });
            if (deficitRows.length) XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(deficitRows), 'گزارش کسری');

            XLSX.writeFile(workbook, `${label}_${new Date().toLocaleDateString('fa-IR').replace(/\//g, '-')}.xlsx`);
        };

        // Export گزارش مرکزی موجودی — بر اساس همان لیستِ فیلترشده/مرتب‌شده‌ی فعلیِ صفحه
        const exportInventoryMasterToExcel = (rows) => {
            const data = rows.map(r => ({
                'کالا': r.it.name, 'برند': r.it.brand || '', 'تگ': r.it.tag || '', 'واحد': r.it.unit || '',
                'فیزیکی': r.physical, 'معادل کیلوگرم': r.it.bagWeight > 0 ? r.physical * (Number(r.it.bagWeight) / 1000) : '', 'رزرو': r.reserved, 'آزاد': r.available,
                'در راه': r.incoming, 'پیش‌فروش': r.sellableIncoming, 'قابل فروش نهایی': r.finalSellable,
            }));
            const worksheet = XLSX.utils.json_to_sheet(data);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "موجودی مرکزی");
            XLSX.writeFile(workbook, `موجودی_مرکزی_${new Date().toLocaleDateString('fa-IR').replace(/\//g, '-')}.xlsx`);
        };

        const parseExcelFile = (file) => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const workbook = XLSX.read(e.target.result, { type: 'binary' });
                        const sheet = workbook.Sheets[workbook.SheetNames[0]];
                        const json = XLSX.utils.sheet_to_json(sheet);
                        const items = json.map(row => ({
                            name: row['نام کالا'] || row['نام'] || row['Name'],
                            brand: row['برند'] || row['Brand'] || '',
                            tag: row['تگ / دسته بندی'] || row['تگ'] || row['Tag'] || 'عمومی',
                            quantity: Number(row['تعداد موجودی'] || row['تعداد'] || row['Quantity'] || 0),
                            unit: row['واحد'] || row['Unit'] || 'عدد'
                        })).filter(i => i.name && i.quantity !== undefined);
                        resolve(items);
                    } catch(err) { reject(err); }
                };
                reader.readAsBinaryString(file);
            });
        };

