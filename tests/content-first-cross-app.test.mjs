import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const root=new URL('../',import.meta.url);
const read=path=>fs.readFileSync(new URL(path,root),'utf8');
const exists=path=>fs.existsSync(new URL(path,root));

test('SCD ONE public calendar projection survives integration and rejects private events',()=>{
 assert.ok(exists('lib/scd-public-calendar-projection.js'),'public calendar projection from #147 is required');
 const {projectPublicCalendar}=require('../lib/scd-public-calendar-projection.js');
 const rows=projectPublicCalendar([
  {eventId:'CAL-REAL-1',title:'Allenamento squadra',date:'2026-10-08',visibility:'PUBLIC'},
  {eventId:'CAL-PRIVATE-1',title:'Appuntamento privato',date:'2026-10-08',visibility:'PRIVATE'}
 ]);
 assert.equal(rows.length,1);
 assert.equal(rows[0].id,'CAL-REAL-1');
 const server=read('server.js');
 assert.match(server,/projectPublicCalendar\(rowsFrom\(calendarRaw\)\)/,'weekly newsroom must use the shared safe projection');
 assert.doesNotMatch(server,/id:pick\(row,'id','eventId','uid'\)\|\|'CAL-'\+i/,'no synthetic calendar IDs');
});

test('SCD CORE R20 private desk must verify persisted audit and canonical identity',()=>{
 assert.ok(exists('tests/r56-audit-failclosed.test.mjs'),'R56 audit tests from #149 required');
 const bridge=read('backend_patch_R56_identity_access.gs');
 const client=read('scd-ng.js');
 assert.match(bridge,/AUDIT_WRITE_FAILED/);
 assert.match(bridge,/EMAIL:String\(actor\.email/,'audit has a canonical operator identity');
 assert.match(client,/ACCESS_AUDIT_UNCONFIRMED/);
 assert.match(client,/eventType:'PRIVATE_DESK_OPEN'/);
});

test('SCD GROW remains the one canonical CRM after cross-app integration',()=>{
 const server=read('server.js');
 const manifest=JSON.parse(read('SCD_SYSTEM_MANIFEST.json'));
 assert.match(server,/handleSponsorProposalDraftSave/);
 assert.match(server,/handleSponsorLeadInbox/);
 assert.equal(manifest.manifest.version,'3.27.3');
 assert.ok(exists('backend_patch_R60_grow_proposal_draft.gs'));
 const r60=read('backend_patch_R60_grow_proposal_draft.gs');
 assert.match(r60,/R60_WRITE_DISABLED/,'writing must be disabled unless explicitly configured');
});

test('shared CI includes ONE, GROW and CORE gates',()=>{
 const yaml=read('.github/workflows/e2e.yml');
 assert.match(yaml,/Public calendar privacy and ID projection gate/);
 assert.match(yaml,/Sponsor lead workflow and HTTP integration gate/);
 assert.match(yaml,/CORE R56 fail-closed audit and private desk entry gate/);
});
