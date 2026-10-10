import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('SCD ONE displays new sidebar-led editorial interface, not legacy centered screen',()=>{
 const html=read('index.html'),css=read('scd-reboot-2026.css');
 assert.match(html,/scd-reboot-2026\.css\?v=2\.0\.0/);
 assert.match(html,/class="scd-control-deck"/);
 assert.match(html,/href="\/sponsor\/"/);
 assert.match(html,/id="scdDeckSky"/);
 assert.match(html,/data-design-system="scd-reboot-2026"/);
 assert.match(css,/grid-template-columns:242px minmax\(0,1fr\)/);
 assert.match(css,/\.world-switch\{/);
 assert.match(css,/\.home-secondary-hero\{/);
});
test('SCD GROW public and CRM protected use the same real stylesheet',()=>{
 for(const path of ['sponsor/index.html','sponsor/app.html']){
  const html=read(path);
  assert.match(html,/\.\.\/scd-reboot-2026\.css\?v=1\.0\.0/);
  assert.match(html,/class="scd-reboot"/);
 }
 const css=read('scd-reboot-2026.css');
 assert.match(css,/\.sidebar\{/);
 assert.match(css,/\.main\{/);
});
test('design replacement does not discard existing functional IDs or invent sport data',()=>{
 const one=read('index.html'),grow=read('sponsor/app.html');
 for(const id of ['weekRail','nextMatch','view-pulse','view-desk','mirror']) assert.ok(one.includes('id="'+id+'"'),id);
 for(const id of ['crmLeadInbox','crmInspector','mainContent']) assert.ok(grow.includes('id="'+id+'"'),id);
 const css=read('scd-reboot-2026.css');
 assert.doesNotMatch(css,/ColicoDerviese 3\s*[-:]\s*1|256K|95 contratti/);
});
