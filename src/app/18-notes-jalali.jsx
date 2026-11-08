//## ═══ app/18-notes-jalali.jsx ═══
//## ابزار تاریخ جلالی/سررسید (toJalaliInput، getDueUrgency …) و یادداشت‌ها (Notes).
//## ترتیب فایل‌ها در build.py مهم است؛ همه‌ی بخش‌ها یک scope مشترک دارند.
        const PRIORITY_TAGS = ['اولویت ۱', 'اولویت ۲', 'اولویت ۳', 'اولویت ۴', 'اولویت ۵', 'اولویت ۶', 'اولویت ۷', 'اولویت ۸', 'اولویت ۹', 'اولویت ۱۰'];
        const PRIORITY_COLORS = {
            'اولویت ۱': 'bg-red-100 text-red-700 border-red-200',
            'اولویت ۲': 'bg-red-50 text-red-600 border-red-100',
            'اولویت ۳': 'bg-orange-100 text-orange-700 border-orange-200',
            'اولویت ۴': 'bg-orange-50 text-orange-600 border-orange-100',
            'اولویت ۵': 'bg-amber-100 text-amber-700 border-amber-200',
            'اولویت ۶': 'bg-yellow-100 text-yellow-700 border-yellow-200',
            'اولویت ۷': 'bg-lime-100 text-lime-700 border-lime-200',
            'اولویت ۸': 'bg-green-100 text-green-700 border-green-200',
            'اولویت ۹': 'bg-teal-100 text-teal-700 border-teal-200',
            'اولویت ۱۰': 'bg-slate-100 text-slate-600 border-slate-200',
        };

        // تقویم دقیق جلالی: ذخیره‌سازی داخلی همچنان ISO/Gregorian است، نمایش و انتخاب برای کاربر شمسی.
        const div = (a,b) => Math.floor(a/b);
        const gregorianToJalali = (gy, gm, gd) => {
            const gdm=[0,31,59,90,120,151,181,212,243,273,304,334];
            let gy2=gm>2?gy+1:gy, days=355666+365*gy+div(gy2+3,4)-div(gy2+99,100)+div(gy2+399,400)+gd+gdm[gm-1];
            let jy=-1595+33*div(days,12053); days%=12053; jy+=4*div(days,1461); days%=1461;
            if(days>365){jy+=div(days-1,365); days=(days-1)%365;}
            let jm=days<186?1+div(days,31):7+div(days-186,30); let jd=1+(days<186?days%31:(days-186)%30);
            return {jy,jm,jd};
        };
        const jalaliToGregorian = (jy,jm,jd) => {
            jy=Number(jy)-979; jm=Number(jm)-1; jd=Number(jd)-1;
            let jDayNo=365*jy+div(jy,33)*8+div((jy%33)+3,4)+(jm<6?jm*31:jm*30+6)+jd;
            let gDayNo=jDayNo+79, gy=1600+400*div(gDayNo,146097); gDayNo%=146097;
            let leap=true;
            if(gDayNo>=36525){gDayNo--; gy+=100*div(gDayNo,36524); gDayNo%=36524; if(gDayNo>=365)gDayNo++; else leap=false;}
            gy+=4*div(gDayNo,1461); gDayNo%=1461;
            if(gDayNo>=366){leap=false; gDayNo--; gy+=div(gDayNo,365); gDayNo%=365;}
            const sal=[0,31,leap?29:28,31,30,31,30,31,31,30,31,30,31]; let gm=1; while(gDayNo>=sal[gm]){gDayNo-=sal[gm];gm++;}
            return {gy,gm,gd:gDayNo+1};
        };
        // اسفند بسته به کبیسه‌بودن سال ۲۹ یا ۳۰ روز دارد؛ بدون این تابع، انتخاب «۳۰ اسفند» در سال عادی
        // بی‌صدا به «اول فروردینِ سال بعد» تبدیل می‌شد (چون تابع بالا اعتبارسنجی روز نمی‌کند، فقط جمع می‌زند).
        const isJalaliLeapYear = (jy) => {
            if (!jy) return false;
            const g = jalaliToGregorian(jy, 12, 30);
            const back = gregorianToJalali(g.gy, g.gm, g.gd);
            return back.jy === Number(jy) && back.jm === 12 && back.jd === 30;
        };
        const daysInJalaliMonth = (jy, jm) => {
            jm = Number(jm);
            if (!jm) return 31;
            if (jm <= 6) return 31;
            if (jm <= 11) return 30;
            return isJalaliLeapYear(jy) ? 30 : 29;
        };
        const toJalaliInput = (iso) => { if(!iso) return {jy:'',jm:'',jd:'',hh:'',mm:''}; const d=new Date(iso); if(Number.isNaN(d.getTime())) return {jy:'',jm:'',jd:'',hh:'',mm:''}; const j=gregorianToJalali(d.getFullYear(),d.getMonth()+1,d.getDate()); return {jy:j.jy,jm:j.jm,jd:j.jd,hh:String(d.getHours()).padStart(2,'0'),mm:String(d.getMinutes()).padStart(2,'0')}; };
        const fromJalaliInput = (jy,jm,jd,hh='00',mm='00') => { if(!jy||!jm||!jd)return ''; const g=jalaliToGregorian(jy,jm,jd); const d=new Date(g.gy,g.gm-1,g.gd,Number(hh)||0,Number(mm)||0); return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16); };
        const formatJalali = (iso, withTime=false) => { if(!iso)return 'بدون موعد'; const d=new Date(iso); if(Number.isNaN(d.getTime()))return iso; const j=gregorianToJalali(d.getFullYear(),d.getMonth()+1,d.getDate()); const base=`${j.jy}/${String(j.jm).padStart(2,'0')}/${String(j.jd).padStart(2,'0')}`; return withTime?`${base} • ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`:base; };
        // فیلد «تاریخ» فاکتور (مثل «۱۴۰۴/۷/۱۰») یک متن آزاد شمسی است، نه Y/M/D جدا؛ این تابع آن را پارس می‌کند
        // تا بشود با «امروزِ واقعی» مقایسه کرد و در صورت نیاز به Timestamp واقعی تبدیلش کرد.
        const parseJalaliDisplayDate = (val) => {
            if (!val) return null;
            const raw = toEnglishDigits(String(val)).trim();
            const parts = raw.split(/[\/\-]/).map(p => p.trim()).filter(Boolean);
            if (parts.length !== 3 || parts.some(p => !/^\d+$/.test(p))) return null;
            const [jy, jm, jd] = parts.map(Number);
            if (!jy || !jm || !jd || jm < 1 || jm > 12 || jd < 1 || jd > 31) return null;
            return { jy, jm, jd };
        };
        // آیا رشته‌ی تاریخ فاکتور (فیلد آزاد «تاریخ») با امروزِ واقعیِ سیستم فرق دارد؟ (یعنی کاربر دستی تغییرش داده)
        const isJalaliDateStrDifferentFromToday = (val) => {
            const parsed = parseJalaliDisplayDate(val);
            if (!parsed) return false;
            const todayJ = gregorianToJalali(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());
            return !(parsed.jy === todayJ.jy && parsed.jm === todayJ.jm && parsed.jd === todayJ.jd);
        };
        // تبدیل رشته‌ی تاریخ فاکتور به Timestamp واقعی (روزِ همان تاریخِ دستی + ساعت/دقیقه‌ی واقعیِ همین لحظه
        // تا ترتیب چند فاکتور در همان روزِ دستی هم حفظ شود). اگر پارس نشد، null برمی‌گرداند.
        const jalaliDisplayDateToTimestamp = (val) => {
            const parsed = parseJalaliDisplayDate(val);
            if (!parsed) return null;
            const g = jalaliToGregorian(parsed.jy, parsed.jm, parsed.jd);
            const now = new Date();
            const d = new Date(g.gy, g.gm - 1, g.gd, now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
            return d.getTime();
        };
        // اختلاف روز دقیق بین یک تاریخ سررسید (ISO) و «امروز» — بر مبنای شروع روز (نه ساعت لحظه‌ای)
        // تا سررسید امروز ساعت هرچه باشد، به‌عنوان «امروز» شمرده شود نه گذشته یا آینده اشتباه.
        // چون محاسبه بر اساس Date واقعی (نه رشته‌ی شمسی) انجام می‌شود، کبیسه بودن سال شمسی
        // به‌طور خودکار و دقیق در نظر گرفته می‌شود (چون gregorianToJalali/jalaliToGregorian خودشان کبیسه را حساب می‌کنند).
        const daysDiffFromToday = (iso) => {
            if (!iso) return null;
            const d = new Date(iso);
            if (Number.isNaN(d.getTime())) return null;
            const startOfDay = x => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
            return Math.round((startOfDay(d) - startOfDay(new Date())) / 86400000);
        };
        // وضعیت سررسید یک تاریخ: overdue (گذشته) | today (امروز) | soon (تا ۳ روز آینده) | upcoming (آینده‌تر)
        const getDueUrgency = (iso) => {
            const diff = daysDiffFromToday(iso);
            if (diff === null) return null;
            if (diff < 0) return 'overdue';
            if (diff === 0) return 'today';
            if (diff <= 3) return 'soon';
            return 'upcoming';
        };

        const NoteEditModal = ({ note, onClose, onSave, savedCustomTags = [] }) => {
            const [title,setTitle]=useState(note?.title||'');
            const [text,setText]=useState(note?.text||'');
            const [description,setDescription]=useState(note?.description||'');
            const [subtasks,setSubtasks]=useState(note?.subtasks||[]);
            const [tags,setTags]=useState(note?.tags||[]);
            const [priority,setPriority]=useState(note?.priority||'normal');
            const nowForDue = new Date(); const localNowIso = new Date(nowForDue.getTime() - nowForDue.getTimezoneOffset()*60000).toISOString().slice(0,16); const defaultDueIso = note?.dueDate || localNowIso;
            const [dueDate,setDueDate]=useState(defaultDueIso);
            const initialJ=toJalaliInput(defaultDueIso); const [jYear,setJYear]=useState(initialJ.jy||''); const [jMonth,setJMonth]=useState(initialJ.jm||''); const [jDay,setJDay]=useState(initialJ.jd||''); const [jHour,setJHour]=useState(initialJ.hh||''); const [jMinute,setJMinute]=useState(initialJ.mm||'');
            const [color,setColor]=useState(note?.color||'indigo');
            const [pinned,setPinned]=useState(!!note?.pinned);
            const [newSubtask,setNewSubtask]=useState(''); const [newTag,setNewTag]=useState('');
            const addSub=()=>{const value=newSubtask.trim();if(!value)return;setSubtasks(prev=>[...prev,{id:generateId(),text:value,isDone:false}]);setNewSubtask('')};
            const save=()=>{if(!text.trim()&&!title.trim())return;onSave({...note,id:note?.id||generateId(),title:title.trim()||'یادداشت بدون عنوان',text:text.trim(),description,subtasks,tags,priority,dueDate,color,pinned,isDone:note?.isDone||false,date:note?.date||Date.now(),updatedAt:Date.now()});onClose()};
            return <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"><div className="bg-white rounded-[36px] w-full max-w-4xl shadow-2xl max-h-[92vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
                <div className="p-5 border-b bg-[#f5f5f4] flex justify-between items-center"><div><h3 className="font-black text-slate-800 flex items-center gap-2"><Edit3 size={19} className="text-[#e5654a]"/>{note?'ویرایش یادداشت':'یادداشت حرفه‌ای جدید'}</h3><p className="text-[10px] text-slate-400 mt-1">یادداشت، چک‌لیست، اولویت، موعد و برچسب‌ها</p></div><button onClick={onClose} className="p-2 rounded-full hover:bg-white transition"><X size={19}/></button></div>
                <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-5">
                    <div className="lg:col-span-2 space-y-4">
                        <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="عنوان یادداشت" className="w-full text-lg font-black p-3 rounded-2xl border border-slate-200 bg-[#f5f5f4] outline-none focus:border-[#e5654a]" autoFocus/>
                        <textarea value={text} onChange={e=>setText(e.target.value)} placeholder="متن یادداشت..." className="w-full min-h-40 p-4 rounded-3xl border border-slate-200 bg-white outline-none focus:border-[#e5654a] text-sm leading-7"/>
                        <div className="flex items-center gap-2 mb-2"><span className="text-xs font-bold">اولویت:</span><select value={priority} onChange={e=>setPriority(e.target.value)} className="border rounded-lg px-2 py-1 text-xs"><option value="urgent">🔴 فوری</option><option value="high">🟠 مهم</option><option value="normal">🟡 عادی</option><option value="low">⚪ کم</option></select></div><textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="توضیحات تکمیلی..." className="w-full min-h-24 p-3 rounded-2xl border border-slate-200 bg-[#f5f5f4] outline-none focus:border-[#e5654a] text-sm leading-6"/>
                        <div className="bg-[#f5f5f4] rounded-3xl border border-slate-200 p-4"><div className="font-bold text-xs mb-2">چک‌لیست</div><div className="flex gap-2"><input value={newSubtask} onChange={e=>setNewSubtask(e.target.value)} onKeyDown={e=>e.key==='Enter'&&(e.preventDefault(),addSub())} placeholder="مورد جدید..." className="flex-1 p-2.5 rounded-2xl border border-slate-200 text-sm"/><button type="button" onClick={addSub} className="px-4 bg-black text-white rounded-2xl hover:bg-slate-700 active:scale-95 transition"><Plus size={16}/> افزودن</button></div><div className="space-y-1.5 mt-3">{subtasks.map(s=><div key={s.id} className="flex items-center gap-2 p-2 bg-white rounded-2xl border border-slate-100"><button onClick={()=>setSubtasks(subtasks.map(x=>x.id===s.id?{...x,isDone:!x.isDone}:x))}>{s.isDone?<CheckSquare className="text-emerald-500" size={18}/>:<Square className="text-slate-300" size={18}/>}</button><span className={`flex-1 text-sm ${s.isDone?'line-through text-slate-400':''}`}>{s.text}</span><button onClick={()=>setSubtasks(subtasks.filter(x=>x.id!==s.id))}><X size={14} className="text-slate-300 hover:text-red-500"/></button></div>)}</div></div>
                    </div>
                    <div className="space-y-4">
                        <div className="p-4 rounded-3xl border border-slate-200 bg-[#f5f5f4]"><label className="text-xs font-bold text-slate-500 block mb-2">اولویت</label><div className="grid grid-cols-2 gap-2">{[['low','کم'],['normal','عادی'],['high','مهم'],['urgent','فوری']].map(([v,l])=><button key={v} onClick={()=>setPriority(v)} className={`p-2 rounded-full text-xs font-bold border transition ${priority===v?'bg-[#e5654a] text-white border-[#e5654a]':'bg-white text-slate-500 border-slate-200 hover:bg-[#f5f5f4]'}`}>{l}</button>)}</div></div>
                        <div><label className="text-xs font-bold text-slate-500 block mb-1">موعد (تقویم شمسی)</label><div className="grid grid-cols-3 gap-2" dir="rtl"><input inputMode="numeric" value={jYear} onChange={e=>{const ny=e.target.value.replace(/\D/g,'');setJYear(ny);const maxD=daysInJalaliMonth(ny,jMonth);const nd=jDay&&Number(jDay)>maxD?String(maxD):jDay;if(nd!==jDay)setJDay(nd);setDueDate(fromJalaliInput(ny,jMonth,nd,jHour,jMinute))}} placeholder="سال" className="p-2.5 rounded-2xl border border-slate-200 text-sm text-center"/><select value={jMonth} onChange={e=>{const nm=e.target.value;setJMonth(nm);const maxD=daysInJalaliMonth(jYear,nm);const nd=jDay&&Number(jDay)>maxD?String(maxD):jDay;if(nd!==jDay)setJDay(nd);setDueDate(fromJalaliInput(jYear,nm,nd,jHour,jMinute))}} className="p-2.5 rounded-2xl border border-slate-200 text-sm"><option value="">ماه</option>{Array.from({length:12},(_,i)=><option key={i+1} value={i+1}>{i+1}</option>)}</select><select value={jDay} onChange={e=>{setJDay(e.target.value);setDueDate(fromJalaliInput(jYear,jMonth,e.target.value,jHour,jMinute))}} className="p-2.5 rounded-2xl border border-slate-200 text-sm"><option value="">روز</option>{Array.from({length:daysInJalaliMonth(jYear,jMonth)},(_,i)=><option key={i+1} value={i+1}>{i+1}</option>)}</select></div><div className="grid grid-cols-2 gap-2 mt-2"><select value={jHour} onChange={e=>{setJHour(e.target.value);setDueDate(fromJalaliInput(jYear,jMonth,jDay,e.target.value,jMinute))}} className="p-2.5 rounded-2xl border border-slate-200 text-sm"><option value="">ساعت</option>{Array.from({length:24},(_,i)=><option key={i} value={String(i).padStart(2,'0')}>{String(i).padStart(2,'0')}</option>)}</select><select value={jMinute} onChange={e=>{setJMinute(e.target.value);setDueDate(fromJalaliInput(jYear,jMonth,jDay,jHour,e.target.value))}} className="p-2.5 rounded-2xl border border-slate-200 text-sm"><option value="">دقیقه</option>{Array.from({length:12},(_,i)=><option key={i*5} value={String(i*5).padStart(2,'0')}>{String(i*5).padStart(2,'0')}</option>)}</select></div>{dueDate&&<div className="text-[10px] text-[#e5654a] font-bold mt-2">موعد ثبت‌شده: {formatJalali(dueDate,true)}</div>}</div>
                        <label className="flex items-center gap-2 p-3 rounded-2xl border border-slate-200 bg-white text-sm font-bold"><input type="checkbox" checked={pinned} onChange={e=>setPinned(e.target.checked)}/> 📌 سنجاق کردن</label>
                        <div><label className="text-xs font-bold text-slate-500 block mb-2">رنگ یادداشت</label><div className="grid grid-cols-4 gap-2">{['indigo','amber','emerald','rose'].map(c=><button key={c} onClick={()=>setColor(c)} className={`h-9 rounded-full border-2 ${color===c?'border-slate-800':'border-transparent'} ${c==='indigo'?'bg-slate-100':c==='amber'?'bg-[#fdeee3]':c==='emerald'?'bg-[#e7f3ec]':'bg-[#fbe6e1]'}`}/>)}</div></div>
                        <div><label className="text-xs font-bold text-slate-500 block mb-1">تگ‌ها</label><div className="flex gap-2"><input value={newTag} onChange={e=>setNewTag(e.target.value)} onKeyDown={e=>e.key==='Enter'&&(e.preventDefault(),newTag.trim()&&(setTags([...new Set([...tags,newTag.trim()])]),setNewTag('')))} placeholder="#tag" className="flex-1 p-2.5 rounded-2xl border border-slate-200 text-sm"/><button onClick={()=>{if(newTag.trim()){setTags([...new Set([...tags,newTag.trim()])]);setNewTag('')}}} className="px-3 bg-[#e5654a] text-white rounded-2xl"><Plus size={15}/></button></div><div className="flex flex-wrap gap-1 mt-2">{tags.map(t=><span key={t} className="px-2 py-1 rounded-full bg-[#fdeee3] text-[#c94a29] text-[10px] font-bold">#{t}</span>)}</div>{savedCustomTags.filter(t=>!tags.includes(t)).length>0&&<div className="flex flex-wrap gap-1 mt-2">{savedCustomTags.filter(t=>!tags.includes(t)).slice(0,8).map(t=><button key={t} onClick={()=>setTags([...tags,t])} className="px-2 py-1 rounded-full border text-[10px] text-slate-500">+{t}</button>)}</div>}</div>
                    </div>
                </div><div className="p-4 border-t bg-[#f5f5f4] flex gap-2"><button onClick={onClose} className="flex-1 py-3.5 rounded-full border bg-white font-bold text-slate-500 hover:bg-slate-100 transition">لغو</button><button onClick={save} className="flex-1 py-3.5 rounded-full bg-[#e5654a] text-white font-black shadow-lg shadow-[#e5654a]/30 hover:bg-[#d4553a] transition">ذخیره یادداشت</button></div>
            </div></div>
        };

        const Notes = ({ notes, onUpdateNotes }) => {
            const confirmAction=useConfirm(); const [editModal,setEditModal]=useState(null); const [sortBy,setSortBy]=useState('newest'); const [viewMode,setViewMode]=useState(()=>localStorage.getItem('anbaryar_notes_view')||'card'); const [filter,setFilter]=useState('all'); const [searchText,setSearchText]=useState('');
            const [savedCustomTags,setSavedCustomTags]=useState(()=>{try{return JSON.parse(localStorage.getItem('anbaryar_custom_tags')||'[]')}catch(e){return[]}});
            const saveNote=n=>{const normalized={...n,updatedAt:Date.now()};const exists=notes.some(x=>x.id===n.id);onUpdateNotes(exists?notes.map(x=>x.id===n.id?normalized:x):[normalized,...notes]);const custom=(n.tags||[]).filter(t=>!PRIORITY_TAGS.includes(t));const merged=[...new Set([...savedCustomTags,...custom])];setSavedCustomTags(merged);try{localStorage.setItem('anbaryar_custom_tags',JSON.stringify(merged))}catch(e){}};
            const toggleDone=id=>onUpdateNotes(notes.map(n=>n.id===id?{...n,isDone:!n.isDone,updatedAt:Date.now()}:n)); const togglePin=id=>onUpdateNotes(notes.map(n=>n.id===id?{...n,pinned:!n.pinned,updatedAt:Date.now()}:n));
            const remove=async id=>{if(await confirmAction('حذف یادداشت؟'))onUpdateNotes(notes.filter(n=>n.id!==id))};
            const priorityRank=n=>({urgent:4,high:3,normal:2,low:1})[n.priority||'normal']||2;
            const dueRank=n=>n.dueDate?new Date(n.dueDate).getTime():Infinity;
            const isOverdue=n=>n.dueDate && !n.isDone && new Date(n.dueDate).getTime()<Date.now();
            const filtered=useMemo(()=>{let list=[...notes];if(searchText)list=list.filter(n=>`${n.title||''} ${n.text||''} ${n.description||''} ${(n.tags||[]).join(' ')}`.toLowerCase().includes(searchText.toLowerCase()));if(filter==='open')list=list.filter(n=>!n.isDone&&!n.archived);if(filter==='done')list=list.filter(n=>n.isDone);if(filter==='pinned')list=list.filter(n=>n.pinned);if(filter==='urgent')list=list.filter(n=>['urgent','high'].includes(n.priority));if(filter==='archive')list=list.filter(n=>n.archived);list.sort((a,b)=>{if((b.pinned?1:0)!==(a.pinned?1:0))return (b.pinned?1:0)-(a.pinned?1:0);if(sortBy==='due')return dueRank(a)-dueRank(b) || (b.updatedAt||b.date||0)-(a.updatedAt||a.date||0);if(sortBy==='priority')return priorityRank(b)-priorityRank(a);if(sortBy==='oldest')return (a.updatedAt||a.date||0)-(b.updatedAt||b.date||0);return (b.updatedAt||b.date||0)-(a.updatedAt||a.date||0)});return list},[notes,searchText,filter,sortBy]);
            const JM=['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
            const _now=new Date(); const tj=gregorianToJalali(_now.getFullYear(),_now.getMonth()+1,_now.getDate());
            const stOpen=notes.filter(n=>!n.isDone&&!n.archived).length, stDone=notes.filter(n=>n.isDone).length, stUrgent=notes.filter(n=>n.priority==='urgent'&&!n.isDone).length, stOver=notes.filter(n=>isOverdue(n)).length, stPin=notes.filter(n=>n.pinned).length;
            const pct=notes.length?Math.round(stDone/notes.length*100):0; const RR=34, CC=2*Math.PI*RR;
            const tint={indigo:'bg-white',amber:'bg-[#fdeee3]',emerald:'bg-[#e7f3ec]',rose:'bg-[#fbe6e1]'};
            const prioCls=p=>p==='urgent'?'bg-[#e5654a] text-white':p==='high'?'bg-[#fbd9c8] text-[#c94a29]':p==='low'?'bg-white/70 text-slate-400':'bg-white/80 text-slate-500';
            const prioLbl=p=>p==='urgent'?'فوری':p==='high'?'مهم':p==='low'?'کم':'عادی';
            const circ='w-8 h-8 rounded-full bg-white/80 hover:bg-white flex items-center justify-center text-slate-500 transition active:scale-90';
            return <div className="h-full flex flex-col gap-3 bg-[#ededec] rounded-[36px] p-3 sm:p-4 overflow-y-auto" dir="rtl">
                <div className="bg-[#f6f6f5] rounded-[30px] p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-white border border-slate-200 flex flex-col items-center justify-center leading-none shrink-0"><b className="text-2xl font-black text-slate-900">{tj.jd.toLocaleString('fa-IR')}</b><span className="text-[9px] text-slate-400 mt-1">{JM[tj.jm-1]}</span></div>
                        <div><div className="text-2xl font-black text-slate-900">یادداشت‌ها</div><div className="text-xs text-slate-400 mt-1">کارها، پیگیری‌ها و چک‌لیست‌ها</div></div>
                    </div>
                    <button onClick={()=>setEditModal('new')} className="h-12 pr-5 pl-1.5 rounded-full bg-[#e5654a] text-white font-bold text-sm flex items-center gap-3 shadow-[0_12px_22px_-12px_rgba(229,101,74,.95)] hover:bg-[#d4553a] active:scale-95 transition">یادداشت جدید<span className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center"><Plus size={17}/></span></button>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="bg-white rounded-[28px] p-4 flex flex-col justify-between min-h-[112px]"><div className="text-xs text-slate-400 font-bold">باز</div><div><div className="text-4xl font-black text-slate-900 leading-none">{stOpen.toLocaleString('fa-IR')}</div><div className="flex gap-1 mt-3">{Array.from({length:Math.min(notes.length,14)},(_,i)=><i key={i} className={`w-1.5 h-1.5 rounded-full ${i<Math.round((notes.length?stDone/notes.length:0)*Math.min(notes.length,14))?'bg-[#e5654a]':'bg-slate-200'}`}/>)}</div></div></div>
                    <div className="bg-black text-white rounded-[28px] p-4 flex items-center justify-between min-h-[112px]"><div><div className="text-xs text-white/50 font-bold">نرخ انجام</div><div className="text-[10px] text-white/40 mt-1">{stDone.toLocaleString('fa-IR')} از {notes.length.toLocaleString('fa-IR')}</div></div><div className="relative w-[84px] h-[84px]"><svg width="84" height="84" viewBox="0 0 84 84" style={{transform:'rotate(-90deg)'}}><circle cx="42" cy="42" r={RR} fill="none" stroke="rgba(255,255,255,.14)" strokeWidth="7"/><circle cx="42" cy="42" r={RR} fill="none" stroke="#e5654a" strokeWidth="7" strokeLinecap="round" strokeDasharray={CC} strokeDashoffset={CC*(1-pct/100)}/></svg><b className="absolute inset-0 flex items-center justify-center text-sm">{pct.toLocaleString('fa-IR')}٪</b></div></div>
                    <div className="bg-[#fdeee3] rounded-[28px] p-4 flex flex-col justify-between min-h-[112px]"><div className="text-xs text-[#c94a29] font-bold">فوری</div><div className="text-4xl font-black text-[#e5654a] leading-none">{stUrgent.toLocaleString('fa-IR')}</div></div>
                    <div className="bg-[#f6f6f5] rounded-[28px] p-4 flex flex-col justify-between min-h-[112px]"><div className="flex justify-between text-xs text-slate-400 font-bold"><span>عقب‌افتاده</span><span>سنجاق‌شده</span></div><div className="flex justify-between items-end"><span className={`text-4xl font-black leading-none ${stOver?'text-[#e5654a]':'text-slate-900'}`}>{stOver.toLocaleString('fa-IR')}</span><span className="text-2xl font-black text-slate-500 leading-none">{stPin.toLocaleString('fa-IR')}</span></div></div>
                </div>
                <div className="bg-[#f6f6f5] rounded-[28px] p-3 flex flex-col lg:flex-row gap-2 lg:items-center">
                    <div className="relative flex-1 min-w-[180px]"><Search size={16} className="absolute right-4 top-3.5 text-slate-400"/><input value={searchText} onChange={e=>setSearchText(e.target.value)} placeholder="جستجوی عنوان، متن، تگ..." className="w-full h-11 pr-11 pl-4 rounded-full bg-white text-sm outline-none border border-transparent focus:border-[#e5654a] transition"/></div>
                    <div className="flex gap-1.5 flex-wrap">{[['all','همه'],['open','باز'],['urgent','مهم'],['pinned','سنجاق'],['done','انجام‌شده'],['archive','آرشیو']].map(([v,l])=><button key={v} onClick={()=>setFilter(v)} className={`h-10 px-4 rounded-full text-xs font-bold transition ${filter===v?'bg-black text-white':'bg-white text-slate-500 hover:bg-white/60'}`}>{l}</button>)}</div>
                    <select value={sortBy} onChange={e=>setSortBy(e.target.value)} className="h-10 px-4 rounded-full bg-white text-xs font-bold outline-none"><option value="newest">جدیدترین</option><option value="oldest">قدیمی‌ترین</option><option value="priority">اولویت</option><option value="due">نزدیک‌ترین موعد</option></select>
                    <div className="flex gap-1 p-1 rounded-full bg-white">{[['card','کارت'],['list','خطی'],['compact','فشرده']].map(([v,l])=><button key={v} type="button" onClick={()=>{setViewMode(v);localStorage.setItem('anbaryar_notes_view',v)}} className={`h-8 px-3 rounded-full text-[11px] font-bold transition ${viewMode===v?'bg-[#e5654a] text-white':'text-slate-500'}`}>{l}</button>)}</div>
                </div>
                <div className={`${viewMode==='card'?'grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-3':viewMode==='list'?'flex flex-col gap-2':'grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-2'} pb-2`}>{filtered.length===0?<div className="col-span-full bg-white rounded-[28px] p-14 text-center text-slate-400">یادداشتی پیدا نشد.</div>:filtered.map(n=>{const done=(n.subtasks||[]).filter(s=>s.isDone).length;const total=(n.subtasks||[]).length;const small=viewMode!=='card';return <div key={n.id} className={`${tint[n.color]||tint.indigo} ${small?'rounded-[22px] p-3':'rounded-[30px] p-5'} ${n.isDone?'opacity-55':''} ${isOverdue(n)?'ring-1 ring-[#e5654a]/50':''} transition hover:-translate-y-0.5 hover:shadow-[0_16px_30px_-18px_rgba(0,0,0,.35)]`}>
                    <div className="flex items-start gap-3"><button onClick={()=>toggleDone(n.id)} className="mt-0.5 shrink-0">{n.isDone?<CheckSquare className="text-[#e5654a]" size={viewMode==='compact'?17:21}/>:<Square className="text-slate-300" size={viewMode==='compact'?17:21}/>}</button>
                        <div className="flex-1 min-w-0"><div className="flex items-center gap-2"><h3 className={`font-black text-slate-900 truncate ${viewMode==='compact'?'text-xs':'text-base'} ${n.isDone?'line-through':''}`}>{n.title||n.text}</h3>{n.pinned&&<Pin size={13} className="text-[#e5654a] shrink-0"/>}</div>
                            {viewMode!=='compact'&&<p className={`text-sm text-slate-500 mt-1.5 whitespace-pre-wrap leading-6 ${viewMode==='list'?'line-clamp-1':'line-clamp-3'}`}>{n.text}</p>}
                            <div className="flex flex-wrap items-center gap-1.5 mt-3"><span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${prioCls(n.priority)}`}>{prioLbl(n.priority)}</span>{n.dueDate&&<span className={`px-2.5 py-1 rounded-full bg-white/80 text-[10px] font-bold flex items-center gap-1 ${isOverdue(n)?'text-[#e5654a]':'text-slate-500'}`}><Calendar size={11}/>{formatJalali(n.dueDate,true)}{isOverdue(n)?' • عقب‌افتاده':''}</span>}{viewMode!=='compact'&&(n.tags||[]).map(t=><span key={t} className="px-2.5 py-1 rounded-full bg-white/60 text-slate-500 text-[10px] font-bold">#{t}</span>)}</div>
                            {total>0&&<div className="flex items-center gap-2 mt-3"><div className="flex gap-1">{Array.from({length:Math.min(total,12)},(_,i)=><i key={i} className={`w-2 h-2 rounded-full ${i<Math.round(done/total*Math.min(total,12))?'bg-[#e5654a]':'bg-slate-300/70'}`}/>)}</div><span className="text-[10px] text-slate-400 font-bold">{done.toLocaleString('fa-IR')}/{total.toLocaleString('fa-IR')}</span></div>}
                        </div>
                        <div className={`flex ${small?'flex-row':'flex-col'} gap-1.5 shrink-0`}><button onClick={()=>togglePin(n.id)} className={circ} title="سنجاق">{n.pinned?<PinOff size={14}/>:<Pin size={14}/>}</button><button onClick={()=>setEditModal(n)} className={circ} title="ویرایش"><Edit3 size={14}/></button><button onClick={()=>remove(n.id)} className={circ+' !text-[#e5654a]'} title="حذف"><Trash2 size={14}/></button></div>
                    </div></div>})}</div>
                {editModal&&<NoteEditModal note={editModal==='new'?null:editModal} onClose={()=>setEditModal(null)} onSave={saveNote} savedCustomTags={savedCustomTags}/>}
            </div>;
        };

