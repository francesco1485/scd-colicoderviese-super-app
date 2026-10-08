import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const bridge=fs.readFileSync(new URL('../backend_patch_R56_identity_access.gs',import.meta.url),'utf8');
function runtime({append,actor={email:'tester@example.org'}}={}){
  const logs=[];
  const scope={sessionActor_:()=>actor,console:{error:(...args)=>logs.push(args)}};
  if(append!==undefined)scope.r216AppendByHeader_=append;
  vm.runInNewContext(bridge,scope,{filename:'backend_patch_R56_identity_access.gs'});
  return {call:(token='good',eventType='PRIVATE_DESK_OPEN')=>scope.r56RecordAccess_(token,{eventType,clientKind:'WEB'}),logs};
}
test('R56 never reports stored when audit sink is unavailable',()=>{
  const r=runtime();
  assert.throws(()=>r.call(),/AUDIT_STORE_UNAVAILABLE/);
});
test('R56 propagates audit append failure before confirming private desk entry',()=>{
  const r=runtime({append:()=>{throw new Error('sheet unavailable')}});
  assert.throws(()=>r.call(),/AUDIT_WRITE_FAILED/);
});
test('R56 confirms access only after canonical audit append',()=>{
  let entry;
  const r=runtime({append:(sheet,payload)=>{entry={sheet,payload}}});
  const result=r.call();
  assert.equal(result.stored,true);
  assert.equal(entry.sheet,'APP AUDIT');
  assert.equal(entry.payload.ACTION,'ACCESS_PRIVATE_DESK_OPEN');
  // Verified against the real R20 Core APP AUDIT A1:J1 header (2026-10-08).
  const realHeaders=['TIMESTAMP','EMAIL','ACTION','RESOURCE','RECORD_ID','TEAM','PLAYER_ID','OLD_VALUE','NEW_VALUE','DETAILS'];
  const saved=Object.fromEntries(realHeaders.map(key=>[key,entry.payload[key]??'']));
  assert.equal(saved.EMAIL,'tester@example.org');
  assert.equal(saved.RESOURCE,'R56_ACCESS');
  assert.equal(saved.ACTION,'ACCESS_PRIVATE_DESK_OPEN');
  assert.equal(JSON.parse(saved.DETAILS).clientKind,'WEB');
  assert.ok(!String(saved.DETAILS).includes('qa-token'),'never store auth tokens in audit details');
});
test('R56 denies unidentified actors and unapproved access event names',()=>{
  assert.throws(()=>runtime({append:()=>{},actor:{}}).call(),/Sessione non valida/);
  assert.throws(()=>runtime({append:()=>{}}).call('good','ROLE_ELEVATION'),/Evento accesso non ammesso/);
});
