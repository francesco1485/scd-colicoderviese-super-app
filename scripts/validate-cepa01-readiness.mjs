import fs from 'node:fs';

function ok(condition,message){if(!condition)throw new Error(message)}
const html=fs.readFileSync('cepa-maglia-os-static/index.html','utf8');
const js=fs.readFileSync('cepa-maglia-os-static/app.js','utf8');
const css=fs.readFileSync('cepa-maglia-os-static/visual-master-shell.css','utf8');

ok(html.includes('id="systemReadinessPanel"'),'CEPA-01 readiness panel missing');
ok(html.includes('id="systemReadinessGrid"'),'CEPA-01 readiness grid missing');
ok(js.includes("supabase.from('integration_registry')"),'canonical integration registry source missing');
ok(js.includes('function integrationStateMeta('),'integration state normalization missing');
ok(js.includes('function renderSystemReadiness()'),'readiness renderer missing');
ok(js.includes("value==='connected_chat_only'"),'chat-only state must be explicit');
ok(js.includes("value==='pending'"),'pending state must be explicit');
ok(js.includes("value==='disabled'"),'disabled state must be explicit');
ok(js.includes('renderSystemReadiness();'),'readiness renderer not wired into home');
ok(css.includes('CEPA-01 · factual integration readiness'),'readiness styling missing');
ok(css.includes('@media(max-width:700px)'),'mobile readiness composition missing');

console.log('CEPA-01 READINESS CONTRACT PASS');
