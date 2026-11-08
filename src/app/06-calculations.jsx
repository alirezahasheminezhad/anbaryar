//## ═══ app/06-calculations.jsx ═══
//## قوانین محاسبه: هزینه‌ی بارگیری، وزن مؤثر ردیف، کیسه‌ی مادر و قالب‌های توضیحات.
//## ترتیب فایل‌ها در build.py مهم است؛ همه‌ی بخش‌ها یک scope مشترک دارند.
        // ------------------------------------------------------------------
        // گرد کردن وزن و هزینه بارگیری
        // به‌جای گرد کردن ثابت به نزدیک‌ترین ۵۰۰ کیلو، حالا واحد گرد کردن (پیش‌فرض ۱ تن) و
        // آستانه‌ی «نزدیک بودن به واحد بعدی» (پیش‌فرض ۹۰٪) از تنظیمات خوانده می‌شوند:
        // ابتدا به پایین‌ترین واحدِ کامل گرد می‌شود (floor) و فقط اگر باقیمانده به اندازه‌ی
        // کافی (بر اساس آستانه) به واحد کامل بعدی نزدیک بود، یک واحد اضافه به بالا گرد می‌شود.
        // مثال با واحد ۱۰۰۰ کیلو و آستانه ۹۰٪: وزن ۸۰۰ کیلو → همان صفر (باقیمانده ۸۰٪، کمتر از
        // آستانه) و بارگیری برایش لحاظ نمی‌شود؛ وزن ۱۵۰۰ کیلو → ۱ تن (باقیمانده ۵۰۰ از ۱ تن دوم،
        // که به آستانه نمی‌رسد) نه ۲ تن.
        const roundWeightToIncrement = (weightKg, incrementKg = 1000, roundUpThreshold = 0.9) => {
            if (weightKg <= 0 || incrementKg <= 0) return 0;
            const floorUnits = Math.floor(weightKg / incrementKg);
            const remainder = weightKg - (floorUnits * incrementKg);
            const shouldRoundUp = (remainder / incrementKg) >= roundUpThreshold;
            return (floorUnits + (shouldRoundUp ? 1 : 0)) * incrementKg;
        };
        const calculateLoadingCost = (totalWeightKg, costPerTon, incrementKg = 1000, roundUpThreshold = 0.9, minWeightKg = 0) => {
            if (totalWeightKg <= 0 || costPerTon <= 0) return 0;
            // اگر آستانه‌ی حداقل وزن برای احتساب بارگیری فعال باشد و وزن کل به آن نرسیده باشد، اصلاً
            // بارگیری حساب نمی‌شود (نه این‌که فقط به پایین‌ترین واحد گرد کردن، صفر یا کم برگردد).
            if (minWeightKg > 0 && totalWeightKg < minWeightKg) return 0;
            const rounded = roundWeightToIncrement(totalWeightKg, incrementKg, roundUpThreshold);
            return Math.round((rounded / 1000) * costPerTon);
        };

        // موتور محاسباتی مشترک وزن/مبلغِ یک ردیفِ فاکتور — تنها جایی که این حساب انجام می‌شود؛
        // getItemEffectiveWeight/Total و getItemRemainingWeight همه از همین یک تابع می‌آیند.
        //
        // رفع باگ مهم: قبلاً برای هر محموله‌ی ثبت‌شده، وزن/قیمتِ «در لحظه‌ی ارسال» به‌صورت یک عددِ ثابت ذخیره
        // و برای همیشه همان استفاده می‌شد — یعنی اگر بعداً کاربر یک اشتباه را (مثلاً قیمتِ اشتباهی که موقع ثبت
        // زده بود) در خودِ ردیف اصلاح می‌کرد، آن اصلاح در گزارش‌ها/جمع‌های نمایشی دیده نمی‌شد، چون عددِ قدیمیِ
        // محموله همچنان ملاک بود. حالا فقط زمانی عددِ ثبت‌شده‌ی محموله ثابت می‌ماند که واقعاً «دستی/Override»
        // بوده (sh.weightManual / sh.priceManual — همان چک‌باکسِ «این بخش وزن/قیمتش فرق دارد؟»)؛ برای محموله‌های
        // معمولی (فقط نسبتی محاسبه‌شده، نه دستی) همیشه از رویِ وزن/قیمتِ زنده‌ی فعلیِ ردیف (it.weight / it.price)
        // و همان نسبتِ تعدادِ آن محموله (sh.qty ÷ کل تعداد) دوباره حساب می‌شود — یعنی هر اصلاحی در ردیف اصلی،
        // خودش را در همه‌جا (پرینت، جزئیات فاکتور، گزارش‌ها) به‌روز نشان می‌دهد.
        const computeItemShipmentBreakdown = (it) => {
            const baseWeight = Number(it.weight) || 0;
            const basePrice = Number(it.price) || 0;
            if (!it.shipments || it.shipments.length === 0) {
                return { shipmentsWeight: 0, shipmentsTotal: 0, remainingWeight: baseWeight, remainingTotal: baseWeight * basePrice, totalWeight: baseWeight, totalPrice: baseWeight * basePrice };
            }
            const totalQty = Number(it.qty) || 0;
            const shipped = Number(it.shippedQty) || 0;
            const remaining = totalQty - shipped;
            let shipmentsWeight = 0, shipmentsTotal = 0;
            it.shipments.forEach(sh => {
                const ratio = totalQty > 0 ? (Number(sh.qty) || 0) / totalQty : 0;
                const w = sh.weightManual ? (Number(sh.weight) || 0) : baseWeight * ratio;
                const p = sh.priceManual ? (Number(sh.price) || 0) : basePrice;
                shipmentsWeight += w;
                shipmentsTotal += w * p;
            });
            const remainingWeight = remaining > 0.0001 ? Math.max(0, baseWeight - shipmentsWeight) : 0;
            const remainingTotal = remaining > 0.0001 ? remainingWeight * basePrice : 0;
            return { shipmentsWeight, shipmentsTotal, remainingWeight, remainingTotal, totalWeight: shipmentsWeight + remainingWeight, totalPrice: shipmentsTotal + remainingTotal };
        };
        const getItemEffectiveWeight = (it) => computeItemShipmentBreakdown(it).totalWeight;
        const getItemEffectiveTotal = (it) => computeItemShipmentBreakdown(it).totalPrice;
        // وزنِ باقیمانده (هنوز نرفته)ی یک ردیف — برای گزارش‌هایی مثل «خروجی‌های در انتظار» که فقط بخشِ
        // هنوز‌نرفته برایشان مهم است.
        const getItemRemainingWeight = (it) => computeItemShipmentBreakdown(it).remainingWeight;

        // ------------------------------------------------------------------
        // پیش‌بینی مصرف «کیسه‌ی مادر» — موتور مشترک، تا هم موقع «ثبت سفارش (رزرو)» و هم موقع «تایید نهایی/
        // ثبت ارسال» دقیقاً همان یک فرمول استفاده شود، نه دو حساب‌وکتاب جدا که ممکن است با هم فرق کنند.
        // محصولات سابیده‌ی بسته‌بندی‌شده در کیسه‌های ۵ کیلویی، هر ۶ کیسه (= ۳۰ کیلو) داخل یک کیسه‌ی مادر
        // می‌رود؛ وقتی تعداد کیسه‌ی در حال رزرو/ارسال دقیقاً مضربی از ۶ باشد، تعداد کیسه‌ی مادرِ لازم و
        // موجودیِ فعلیِ همان رنگ/محصول (اگر در «موجودی کیسه مادر» ثبت شده باشد) برگردانده می‌شود.
        // ------------------------------------------------------------------
        const normalizeFaText = (s) => String(s || '').replace(/[يى]/g, 'ی').replace(/ك/g, 'ک').trim().toLocaleLowerCase('fa-IR');
        // وزن کیسه‌ی ورودی و کیسه‌ی مادر هر ردیف (قابل‌تنظیم در همان ردیف)؛ پیش‌فرض ۵ و ۳۰ کیلو.
        const getMotherBagCfg = (e) => {
            const bagKg = Number(e?.bagKg) > 0 ? Number(e.bagKg) : 5;
            const motherKg = Number(e?.motherKg) > 0 ? Number(e.motherKg) : 30;
            return { bagKg, motherKg, perMother: motherKg / bagKg };
        };
        const findMotherBagStockFor = (name, motherBagStock) => {
            const n = normalizeFaText(name);
            if (!n) return null;
            return (motherBagStock || []).find(s => {
                const p = normalizeFaText(s.product);
                return p && (n.includes(p) || p.includes(n));
            }) || null;
        };
        // it: ردیفی با شکل {name, qty, weight} — qty تعداد کل (مثلاً کیسه‌های ۵ کیلویی) و weight وزن کل
        // همان qty بر حسب کیلوگرم است (همان شکلی که هم در سبدِ فاکتور و هم در ردیف‌های فاکتورِ ذخیره‌شده هست).
        // shipQty: همان تعداد (از همان واحدِ qty) که الان دارد رزرو/ارسال می‌شود.
        const getMotherBagPrediction = (it, shipQty, motherBagStock) => {
            const name = String(it?.name || '');
            // دیگر هیچ تشخیصِ خودکار بر اساس کلمه‌ی «سابیده» در نام وجود ندارد — کاربر خودش هر کالایی را
            // که بخواهد (با هر نامی) در «موجودی کیسه مادر» با جستجو لینک می‌کند؛ فقط همان لیستِ ثبت‌شده
            // مبنا است.
            const stockEntryEarly = findMotherBagStockFor(name, motherBagStock);
            if (!stockEntryEarly) return null;
            const totalQty = Number(it.qty) || 0;
            const perUnitKg = totalQty > 0 ? (Number(it.weight) || 0) / totalQty : 0;
            const { bagKg, perMother } = getMotherBagCfg(stockEntryEarly);
            if (Math.abs(perUnitKg - bagKg) > 0.05) return null; // فقط کیسه‌های هم‌وزنِ تنظیم‌شده‌ی همین ردیف
            const q = Number(shipQty) || 0;
            // فقط وقتی دقیقاً مضربی از «کیسه در هر مادر» باشد کسر از موجودی؛ وگرنه معادل‌سازی عادی (وزن کل ÷ وزن مادر) فقط در توضیحات می‌آید
            if (q <= 0 || Math.abs(q / perMother - Math.round(q / perMother)) > 1e-6) return null;
            const motherBags = Math.round(q / perMother);
            const stockEntry = stockEntryEarly;
            const availableQty = stockEntry ? (Number(stockEntry.qty) || 0) : null;
            const shortfall = availableQty !== null ? Math.max(0, motherBags - availableQty) : null;
            return { name, bags: q, motherBags, totalKg: q * bagKg, stockEntry, availableQty, shortfall };
        };

        // قالبِ پیش‌فرضِ متنِ «معادلِ کیسه‌ی مادر» که در توضیحاتِ خودکارِ فاکتور اضافه می‌شود؛ هر محصول (هر ردیفِ
        // «موجودی کیسه مادر») می‌تواند قالبِ خودش را داشته باشد و کاربر خودش متنِ دلخواهش را بنویسد. جای‌گذاری‌ها:
        // {COUNT}=تعداد کیسه‌ی مادر، {KG}=وزن هر کیسه‌ی مادر (۳۰)، {BAGS}=تعداد کیسه‌ی ۵ کیلویی، {WEIGHT}=وزن کل (kg).
        const DEFAULT_MOTHER_BAG_TEMPLATE = 'معادل {COUNT} کیسه مادر {KG} کیلویی';
        // قالب سطر اول (عنوان کالا) و سطر «مشخصه» — هر دو در همان ردیفِ «موجودی کیسه مادر» قابل‌ویرایش‌اند.
        // جای‌گذاری‌ها: {BAGS} تعداد کیسه، {PERBAG} وزن هر کیسه، {NAME} نام کالا، {BRAND} برند، {TAG} مشخصه، {WEIGHT} وزن کل
        const DEFAULT_TITLE_TEMPLATE = '{BAGS} کیسه {PERBAG} کیلویی {NAME} {BRAND}';
        const DEFAULT_TAG_TEMPLATE = 'وزن کیسه ( مشخصه ) : {TAG}';
        // داده‌ی نمونه‌ی مثال زنده در تنظیمات (۱۰ کیسه‌ی مادر)
        const exampleVars = (r) => {
            const c = getMotherBagCfg(r);
            const bags = 10 * c.perMother, kg = 10 * c.motherKg;
            return { COUNT: 10, KG: c.motherKg, BAGS: formatNumber(bags), WEIGHT: formatNumber(kg), PERBAG: formatNumber(c.bagKg), NAME: r.product || 'نام کالا', BRAND: 'برند نمونه', TAG: `${formatNumber(c.bagKg)} کیلویی` };
        };
        const applyMotherBagTemplate = (template, vars, fallback = DEFAULT_MOTHER_BAG_TEMPLATE) => {
            return String(template || fallback)
                .replace(/\{(COUNT|KG|BAGS|WEIGHT|PERBAG|NAME|BRAND|TAG)\}/g, (_, k) => vars[k] ?? '')
                .replace(/ {2,}/g, ' ').trim();
        };

