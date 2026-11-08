// تست سریع splitWeightIntoBags: node tools/check-split.js
const fs = require('fs'), assert = require('assert');
const src = fs.readFileSync(__dirname + '/../src/app/06-calculations.jsx', 'utf8');
const body = src.slice(src.indexOf('const splitWeightIntoBags'));
const split = new Function(body.replace('const splitWeightIntoBags =', 'return') .replace(/\};\s*$/, '};'))();
assert.deepStrictEqual(split(100, 5), { clean: true, perBag: 20, groups: [] });
assert.deepStrictEqual(split(100, 3).groups, [{ count: 1, kg: 34 }, { count: 2, kg: 33 }]);
assert.deepStrictEqual(split(100, 7).groups, [{ count: 2, kg: 15 }, { count: 5, kg: 14 }]);
const g = split(100.01, 3).groups; assert.strictEqual(Math.round(g.reduce((s, x) => s + x.count * x.kg, 0) * 100), 10001);
assert.deepStrictEqual(split(100, 2.5).groups, []); assert.strictEqual(split(0, 3).clean, false);
console.log('OK');
