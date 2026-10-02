import fs from 'node:fs';

function fail(m){console.error('Community benefit contract FAIL:',m);process.exit(1)}
function assert(c,m){if(!c)fail(m)}

const snapshot=JSON.parse(fs.readFileSync(new URL('../config/community-benefits.snapshot.json',import.meta.url),'utf8'));
const server=fs.readFileSync(new URL('../server.js',import.meta.url),'utf8');
const bridge=fs.readFileSync(new URL('../backend_patch_R21_6_http_api.gs',import.meta.url),'utf8');
const js=fs.readFileSync(new URL('../sponsor/app.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../sponsor/app.html',import.meta.url),'utf8');

assert(snapshot.sourceTable==='CONVENZIONI_MASTER','snapshot source must remain canonical master');
assert(snapshot.sourceMode==='CANONICAL_MASTER_SNAPSHOT_FALLBACK','fallback mode missing');
assert(snapshot.privacy==='PUBLIC_SAFE_PROJECTION_NO_CONTACTS','snapshot privacy contract missing');
assert(Array.isArray(snapshot.rows)&&snapshot.rows.length>=2,'community fallback rows missing');

const serialized=JSON.stringify(snapshot).toLowerCase();
assert(!serialized.includes('@'),'fallback must not expose email addresses');
assert(!serialized.includes('gmail 1a0c'),'fallback must not expose Gmail source ids');

assert(bridge.includes("case 'private.community.summary':"),'Apps Script community route missing');
assert(bridge.includes("r216CrmTable_('CONVENZIONI_MASTER')"),'community action must read canonical master');
assert(bridge.includes("policy:'NO_PUBLICATION_BEFORE_FORMALIZATION'"),'formalization publication policy missing');

assert(server.includes("'/api/sponsor/community'"),'protected community endpoint missing');
assert(server.includes("callAppsScript('private.community.summary'"),'community endpoint must prefer live master');
assert(server.includes("sourceMode:'SNAPSHOT_FALLBACK'"),'community fallback state missing');
assert(server.includes("LIVE_MASTER_BRIDGE_NOT_AVAILABLE"),'community fallback reason missing');

assert(!js.includes('const conventions=['),'hard-coded convention registry must not return');
assert(js.includes("fetch('/api/sponsor/community'"),'Partner OS community loader missing');
assert(js.includes('function renderConventions()'),'community renderer missing');
assert(js.includes("communityState.sourceMode==='LIVE_MASTER'"),'live source state missing in UI');
assert(js.includes('Nessuna pubblicazione come attiva prima della formalizzazione'),'formalization warning missing in UI');
assert(html.includes('id="convenzioniGrid"'),'Benefit Network grid missing');

console.log('Community benefit contract PASS');
