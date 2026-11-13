// کانفیگ Tailwind برای ساخت نسخه‌ی آفلاین: دقیقاً همان theme سربرگ (src/00-html-head.html).
// محتوا از روی index.html ساخته‌شده اسکن می‌شود تا همه‌ی کلاس‌ها (حتی رشته‌های داخل JS) پوشش داده شوند.
module.exports = {
  content: ['./index.html'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Vazirmatn', 'sans-serif']
      },
      colors: {
        indigo: {
          50:'#eef3ff', 100:'#e0e9ff', 200:'#c4d4fd', 300:'#9bb6fa', 400:'#6b91f5',
          500:'#3a6df0', 600:'#1d5eea', 700:'#1749c2', 800:'#1a2a6c', 900:'#14214f', 950:'#0d1536'
        },
        brass: {
          50:'#fef4ec', 100:'#fde9d9', 200:'#fad1b2', 300:'#f8b381', 400:'#f88f49',
          500:'#f47125', 600:'#e25812', 700:'#b84514', 800:'#8c3817', 900:'#652b15', 950:'#39190e'
        },
        slate: { 50:'#f5f8fc', 100:'#eef2f8', 200:'#e1e8f2', 400:'#6b7a94' }
      },
      borderRadius: {
        lg: '0.625rem', xl: '0.875rem', '2xl': '1.125rem', '3xl': '1.75rem'
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgba(20,33,79,0.06)',
        DEFAULT: '0 1px 3px 0 rgba(20,33,79,0.08), 0 1px 2px -1px rgba(20,33,79,0.06)',
        md: '0 4px 8px -2px rgba(20,33,79,0.08), 0 2px 4px -2px rgba(20,33,79,0.05)',
        lg: '0 12px 20px -6px rgba(20,33,79,0.10), 0 4px 8px -4px rgba(20,33,79,0.06)',
        xl: '0 22px 32px -8px rgba(20,33,79,0.12), 0 8px 12px -6px rgba(20,33,79,0.06)',
        '2xl': '0 30px 60px -15px rgba(20,33,79,0.20)'
      }
    }
  }
};