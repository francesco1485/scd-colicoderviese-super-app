import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';

const require=createRequire(import.meta.url);
const contracts=require('../lib/scd-r57-operational-contracts.js');
const seasonStatus=require('../lib/scd-season-status.js');
const manifest=require('../SCD_SYSTEM_MANIFEST.json');
const readiness=JSON.parse(await readFile(new URL('../config/r57-launch-readiness.v1.json',import.meta.url),'utf8'));
const host='127.0.0.1';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const listen=server=>new Promise((resolve,reject)=>{
  server.once('error',reject);
  server.listen(0,host,()=>resolve(server.address().port));
});
const close=server=>new Promise(resolve=>server.close(()=>resolve()));

assert.equal(seasonStatus.withdrawnTeamSeason,'2026/27');
assert.equal(seasonStatus.isWithdrawnSCDTeam('U18'),true);
assert.equal(seasonStatus.isWithdrawnSCDTeam('Under 18 Élite 2026/27'),true);
assert.equal(seasonStatus.isWithdrawnSCDTeam('U16'),false);
assert.equal(seasonStatus.isWithdrawnSCDTeamRecord({teamName:'Under 18 Élite'}),true);
assert.deepEqual(seasonStatus.filterActiveSCDTeamRows([{team:'U18'}]),[]);
assert.deepEqual(seasonStatus.filterPublicSCDPayload({ok:true,data:{items:[{team:'U18'}]}}),{ok:true,data:{items:[]}});
assert.deepEqual(contracts.normalizeTournamentRows({data:[{team:'U18'}]}),[]);

const sponsorHtml=await readFile(new URL('../sponsor/app.html',import.meta.url),'utf8');
const sponsorJs=await readFile(new URL('../sponsor/app.js',import.meta.url),'utf8');
const statsSelector=sponsorHtml.match(/<select id="statsSelector">([\s\S]*?)<\/select>/i)?.[1]||'';
assert.notEqual(statsSelector,'');
assert.doesNotMatch(statsSelector,/\b(?:u18|under\s*18)\b/i);
assert.match(sponsorJs,/u18WithdrawnHistory:\{title:[^}]*WITHDRAWN \/ HISTORICAL/);
assert.match(sponsorJs,/questa categoria non è attiva nella stagione 2026\/27/);

let calendarAvailable=true;
const seenActions=[];
const upstream=http.createServer((req,res)=>{
  let raw='';
  req.on('data',chunk=>raw+=chunk);
  req.on('end',()=>{
    const body=JSON.parse(raw||'{}');
    seenActions.push(String(body.action||''));
    res.writeHead(200,{'content-type':'application/json'});
    if(body.action==='public.calendar'&&calendarAvailable)return res.end(JSON.stringify({ok:true,data:[{team:'U18'}]}));
    if(body.action==='public.feed')return res.end(JSON.stringify({ok:true,data:{items:[{team:'U18'}]}}));
    if(body.action==='public.calendar')return res.end(JSON.stringify({ok:false,error:'SOURCE_UNAVAILABLE'}));
    return res.end(JSON.stringify({ok:false,error:'UNEXPECTED_ACTION'}));
  });
});
const upstreamPort=await listen(upstream);
const portReservation=http.createServer();
const appPort=await listen(portReservation);
await close(portReservation);
const app=spawn(process.execPath,['server.js'],{
  cwd:process.cwd(),
  env:{
    ...process.env,
    PORT:String(appPort),
    SCD_APPS_SCRIPT_URL:`http://${host}:${upstreamPort}/`,
    SCD_PREVIEW_SAFE_MODE:'true'
  },
  stdio:['ignore','pipe','pipe']
});
let logs='';
app.stdout.on('data',data=>logs+=data);
app.stderr.on('data',data=>logs+=data);
const base=`http://${host}:${appPort}`;

try{
  let started=false;
  for(let attempt=0;attempt<50;attempt++){
    try{
      const response=await fetch(`${base}/health`);
      if(response.ok){started=true;break}
    }catch{}
    await sleep(100);
  }
  assert.equal(started,true,'server failed to start: '+logs);

  const calendarProxyResponse=await fetch(`${base}/api/scd`,{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({action:'public.calendar',payload:{rangeKey:'ALL'},sessionToken:''})
  });
  assert.deepEqual((await calendarProxyResponse.json()).data,[]);

  const tournamentResponse=await fetch(`${base}/api/tournaments`);
  const tournaments=await tournamentResponse.json();
  assert.equal(tournamentResponse.status,200);
  assert.equal(tournaments.state,'UPDATING');
  assert.deepEqual(tournaments.events,[]);
  assert.equal(tournaments.source.contract,'public.calendar');

  const newsroomResponse=await fetch(`${base}/api/newsroom`);
  const newsroom=await newsroomResponse.json();
  assert.equal(newsroomResponse.status,200);
  assert.deepEqual(newsroom.calendar.rows,[]);
  const publicFeedResponse=await fetch(`${base}/api/public`);
  assert.deepEqual((await publicFeedResponse.json()).data.items,[]);

  calendarAvailable=false;
  const unavailableResponse=await fetch(`${base}/api/tournaments`);
  const unavailable=await unavailableResponse.json();
  assert.equal(unavailableResponse.status,503);
  assert.equal(unavailable.state,'SOURCE_UNAVAILABLE');
  assert.deepEqual(unavailable.events,[]);

  const membershipResponse=await fetch(`${base}/api/membership-services`);
  const membership=await membershipResponse.json();
  assert.equal(membershipResponse.status,200);
  assert.equal(membership.state,'SOURCE_BINDING_UNVERIFIED');
  assert.equal(membership.season,manifest.product.season_model.current_season);
  assert.equal(membership.identityAuthority,'R20');
  assert.deepEqual(membership.services,[]);
  assert.equal(Object.hasOwn(membership,'members'),false);

  const facilitiesResponse=await fetch(`${base}/api/facility-logistics`);
  const facilities=await facilitiesResponse.json();
  assert.equal(facilitiesResponse.status,200);
  assert.equal(facilities.state,'UNVERIFIED');
  assert.deepEqual(facilities.catalogue,[]);
  assert.deepEqual(facilities.logistics,{
    occupancy:'UNKNOWN',
    rotation:'UNKNOWN',
    homologation:'UNVERIFIED',
    categoryEligibility:'UNVERIFIED',
    transport:'UNVERIFIED',
    availability:'UNKNOWN'
  });

  const readinessResponse=await fetch(`${base}/api/launch-readiness`);
  const launch=await readinessResponse.json();
  assert.equal(readinessResponse.status,200);
  assert.equal(launch.state,'NOT_READY');
  assert.equal(launch.policy,'FAIL_CLOSED_NO_INFERRED_READINESS');
  assert.equal(launch.criticalGateCount,readiness.gates.filter(gate=>gate.critical).length);
  assert.equal(launch.gates.find(gate=>gate.id==='PREVIEW_EXACT_HEAD')?.state,'PENDING');
  assert.equal(Object.hasOwn(launch.gates[0],'evidence'),false);
  assert.match(readiness.gates.find(gate=>gate.id==='PREVIEW_EXACT_HEAD')?.limitation||'',/separate preview/i);

  for(const route of ['/app/tournaments','/app/services','/app/fields']){
    const page=await fetch(`${base}${route}`);
    const html=await page.text();
    assert.equal(page.status,200,`${route} did not resolve to the existing app shell`);
    assert.match(html,/id="view-tournaments"/);
    assert.match(html,/id="view-services"/);
    assert.match(html,/id="view-facilities"/);
  }

  const methodResponse=await fetch(`${base}/api/facility-logistics`,{method:'POST'});
  assert.equal(methodResponse.status,405);
  assert.deepEqual(seenActions,['public.calendar','public.calendar','public.calendar','public.feed','public.feed','public.calendar']);
  console.log('R57 OPERATIONAL SURFACES PASS',{seenActions,launchState:launch.state,criticalGateCount:launch.criticalGateCount});
}finally{
  app.kill('SIGTERM');
  await new Promise(resolve=>app.once('exit',resolve));
  await close(upstream);
}
