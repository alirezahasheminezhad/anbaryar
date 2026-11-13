#!/usr/bin/env node
// پیش‌کامپایل JSX → JS (runtime کلاسیک) برای build.py.
// ورودی: stdin (محتوای بلوک <script type="text/babel">)، خروجی: stdout (JS کامپایل‌شده).
// فقط preset-react اعمال می‌شود؛ syntax مدرن (optional chaining، nullish و ...) دست‌نخورده
// می‌ماند چون مرورگر هدف مدرن است و این دقیقاً همان کاری است که Babel مرورگر انجام می‌داد.
let Babel;
try {
    Babel = require('@babel/standalone');
} catch (e) {
    process.stderr.write('وابستگی @babel/standalone نصب نیست. ابتدا اجرا کن: npm install\n');
    process.exit(1);
}

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { input += c; });
process.stdin.on('end', () => {
    try {
        const out = Babel.transform(input, {
            presets: [['react', { runtime: 'classic' }]],
            sourceType: 'script',
            compact: false,
            comments: true,
        });
        // ایمنی: اگر روزی رشته‌ای شامل </script> باشد، تگ اسکریپت زود بسته نشود.
        process.stdout.write(out.code.replace(/<\/script>/gi, '<\\/script>'));
    } catch (e) {
        process.stderr.write('خطای کامپایل JSX: ' + (e.message || e) + '\n');
        process.exit(1);
    }
});