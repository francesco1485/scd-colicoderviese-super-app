import fs from 'node:fs';

function ok(condition,message){if(!condition)throw new Error(message)}
const html=fs.readFileSync('cepa-maglia-os-static/index.html','utf8');
const js=fs.readFileSync('cepa-maglia-os-static/app.js','utf8');
const css=fs.readFileSync('cepa-maglia-os-static/visual-master-shell.css','utf8');
const cepaStyles=fs.readFileSync('cepa-maglia-os-static/styles.css','utf8');

ok(html.includes('id="systemReadinessPanel"'),'CEPA-01 readiness panel missing');
ok(html.includes('id="systemReadinessGrid"'),'CEPA-01 readiness grid missing');
ok(html.includes('id="systemReadinessActions"'),'CEPA-02 readiness action surface missing');
ok(html.includes('id="publicCepaPointGrid"'),'verified territorial points DOM target missing');
for(const id of ['client360Search','client360Status','client360Producer','pipelineTypeFilter','agendaTypeFilter','distKindFilter','distStageFilter','territoryHubFilter','territoryStageFilter','actionLaneFilter','actionStatusFilter','aiChatInput']){
  ok(new RegExp(`id="${id}"[^>]*aria-label="[^"]+"`).test(html),`${id} must have an accessible name`);
}
ok(js.includes("supabase.from('integration_registry')"),'canonical integration registry source missing');
ok(js.includes('publicCepaPoints=cepaResult.data?.points||[]'),'territorial points must come from the public CEPA feed');
ok(js.includes("if($('publicCepaPointGrid'))"),'territorial points renderer must guard its DOM target');
ok(js.includes('publicCepaPoints.map(x=>'),'territorial points data is not rendered');
ok(js.includes('esc(x.cover_url)'),'territorial point cover URL must remain escaped');
ok(js.includes('function integrationStateMeta('),'integration state normalization missing');
ok(js.includes('function renderSystemReadiness()'),'readiness renderer missing');
ok(js.includes('function readinessNextAction('),'readiness next-action classifier missing');
ok(js.includes("code==='cepa_shared_calendar'"),'shared-calendar blocker must stay explicit');
ok(js.includes("code==='supabase_auth_email'"),'auth-email blocker must stay explicit');
ok(js.includes("data-readiness-view"),'readiness actions must remain internal navigation only');
ok(js.includes("value==='connected_chat_only'"),'chat-only state must be explicit');
ok(js.includes("value==='pending'"),'pending state must be explicit');
ok(js.includes("value==='disabled'"),'disabled state must be explicit');
ok(js.includes('renderSystemReadiness();'),'readiness renderer not wired into home');
ok(css.includes('CEPA-01 · factual integration readiness'),'readiness styling missing');
ok(css.includes('CEPA-02 · readiness next-safe-actions'),'readiness next-action styling missing');
ok(css.includes('@media(max-width:700px)'),'mobile readiness composition missing');
ok(cepaStyles.includes('.cepa-point-grid{'),'territorial points styling missing');
const cepaPointsCacheRevision='20261004-v21-cepa-points';
for(const asset of ['styles.css','visual-master-shell.css','app.js']){
  ok(html.includes(`./${asset}?v=${cepaPointsCacheRevision}`),`CEPA points cache revision missing for ${asset}`);
}

console.log('CEPA-01 READINESS CONTRACT PASS');
