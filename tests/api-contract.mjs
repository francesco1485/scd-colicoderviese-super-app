import fs from 'node:fs';

const server=fs.readFileSync(new URL('../server.js',import.meta.url),'utf8');
const bridge=fs.readFileSync(new URL('../backend_patch_R21_6_http_api.gs',import.meta.url),'utf8');

const setBlock=(server.match(/const allowedActions = new Set\(\[([\s\S]*?)\]\);/)||[])[1]||'';
const serverActions=[...setBlock.matchAll(/'([^']+)'/g)].map(m=>m[1]);
const bridgeActions=[...bridge.matchAll(/case '([^']+)'/g)].map(m=>m[1]);
const isolated=new Set(['safeguarding.submit']);
const serverOnly=serverActions.filter(x=>!bridgeActions.includes(x));
const bridgeOnly=bridgeActions.filter(x=>!serverActions.includes(x)&&!isolated.has(x));

if(serverOnly.length||bridgeOnly.length){
  console.error('API contract mismatch',{serverOnly,bridgeOnly});
  process.exit(1);
}

const required=[
  'public.feed','public.register','public.registration','public.partnerLead','public.communitySubmit','public.ticketSubmit','public.telemetry','public.datafabric.contract',
  'auth.request','auth.login','auth.validate','auth.pin.change',
  'dashboard.summary','account.requests','private.request.submit','private.transport.request','private.message.send',
  'private.convocation.create','private.convocation.reply','private.attendance.get','private.attendance.save',
  'direction.access.set','direction.pin.set','direction.player.approve','direction.player.reject','direction.diagnostics','direction.evolution',
  'direction.datafabric.status','direction.datafabric.scan.gmail','direction.datafabric.scan.drive'
];
const missing=required.filter(x=>!serverActions.includes(x));
if(missing.length){
  console.error('Missing official actions',missing);
  process.exit(1);
}

if(serverActions.includes('safeguarding.submit')){
  console.error('Safeguarding must remain outside ordinary API');
  process.exit(1);
}

console.log('SCD API contract PASS',{official:serverActions.length,isolated:[...isolated]});
