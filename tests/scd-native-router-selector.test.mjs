import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
const source=fs.readFileSync(new URL('../scd-ng.js',import.meta.url),'utf8');
const native=fs.readFileSync(new URL('../scd-one-native.js',import.meta.url),'utf8');
test('SCD router selects multiple views safely, including direct #pulse route',()=>{
 assert.match(source,/\$\$\('\[data-view\]'\)\.forEach/);
 assert.doesNotMatch(source,/[^$]\$\('\[data-view\]'\)\.forEach/);
});
test('native ONE uses canonical public adapter, never a second API database',()=>{
 assert.match(native,/app\.publicSnapshot\(\)/);
 assert.match(native,/app\.loadCalendar\(\)/);
 assert.doesNotMatch(native,/fetch\s*\(/);
});
test('native public data adapter filters private visibility',()=>{
 assert.match(source,/row\.private!==true/);
 assert.match(source,/row\.safeguarding!==true/);
 assert.match(source,/verifiedPublicEvents/);
});
