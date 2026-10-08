import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const file=new URL('../backend_patch_R60_grow_proposal_draft.gs',import.meta.url);
const source=fs.existsSync(file)?fs.readFileSync(file,'utf8'):'';
function fixture({privacy='SI',policy='MANUALE',duplicates=0,auditFails=false}={}){
  const request={REQUEST_ID:'REQ-2026-01',TYPE:'SPONSOR',EMAIL:'lead@example.org',NOME:'Referente QA',CONSENSO_PRIVACY:privacy};
  const stakeholder={STAKEHOLDER_ID:'ST-2026-01',NOME:'Azienda QA',EMAIL:'lead@example.org',CONTACT_POLICY:policy};
  const tables={
    'APP PUBLIC REQUESTS':[request],
    'STAKEHOLDERS_MASTER':[stakeholder,...Array.from({length:duplicates},(_,i)=>({...stakeholder,STAKEHOLDER_ID:'ST-DUP-'+i}))],
    'COMMERCIALE_OPPORTUNITA':[]
  };
  let locks=0,releases=0;
  const writes=[],audits=[];
  const scope={
    LockService:{getScriptLock:()=>({waitLock:()=>{locks++},releaseLock:()=>{releases++}})},
    Utilities:{getUuid:()=> '12345678-aabb-ccdd-eeff-123456789abc'},
    r216SponsorLeadInbox_:(token)=>{if(token!=='good-token')throw new Error('SPONSOR_SCOPE_REQUIRED');return {readOnly:true}},
    r216CrmActor_:(token)=>{if(token!=='good-token')throw new Error('SESSION_REQUIRED');return {email:'operator@example.org'}},
    r216CrmTable_:(name)=>tables[name]||[],
    r216AppendByHeader_:(name,data)=>{
      writes.push(name);
      if(name==='APP AUDIT'){
        if(auditFails)throw new Error('AUDIT_UNAVAILABLE');
        audits.push({...data});return;
      }
      if(name==='COMMERCIALE_OPPORTUNITA'){tables[name].push({...data});return}
      throw new Error('INVALID_WRITE_TARGET');
    },
    clean_:(v,n)=>String(v??'').trim().slice(0,n||9999),
    email_:v=>String(v??'').trim().toLowerCase(),
    console
  };
  vm.createContext(scope);
  vm.runInContext(source,scope,{filename:'backend_patch_R60_grow_proposal_draft.gs'});
  const make=(patch={},token='good-token')=>{
    assert.equal(typeof scope.r60CreateSponsorProposalDraft_,'function','R60 sponsor draft function must exist');
    return scope.r60CreateSponsorProposalDraft_(token,{
      requestId:'REQ-2026-01',stakeholderId:'ST-2026-01',asset:'LED bordo campo',
      objective:'Proposta da valutare',associationReviewed:true,confirm:true,...patch
    });
  };
  return {make,tables,writes,audits,request,stakeholder,scope,locks:()=>locks,releases:()=>releases};
}

test('R60 provides a canonical draft creation function, not a second CRM database',()=>{
  const t=fixture();
  assert.equal(typeof t.scope.r60CreateSponsorProposalDraft_,'function');
});
test('R60 requires explicit human confirmation and authorized R20 actor before writing',()=>{
  const t=fixture();
  assert.throws(()=>t.make({confirm:false}),/CONFIRM_REQUIRED/);
  assert.throws(()=>t.make({associationReviewed:false}),/REVIEW_REQUIRED/);
  assert.throws(()=>t.make({},'invalid-token'),/SPONSOR_SCOPE_REQUIRED|SESSION_REQUIRED/);
  assert.equal(t.writes.length,0);
});
test('R60 matches request and canonical stakeholder by requestId, stakeholderId and email, not name alone',()=>{
  const t=fixture();
  assert.throws(()=>t.make({stakeholderId:'ST-MISSING'}),/STAKEHOLDER_NOT_FOUND|STAKEHOLDER_MISMATCH/);
  t.request.EMAIL='different@example.org';
  assert.throws(()=>t.make(),/EMAIL_MISMATCH/);
  assert.equal(t.writes.length,0);
});
test('R60 rejects ambiguous company link and missing sponsor privacy consent',()=>{
  const a=fixture({duplicates:1});
  assert.throws(()=>a.make(),/AMBIGUOUS_CRM_LINK/);
  const b=fixture({privacy:'NO'});
  assert.throws(()=>b.make(),/CONSENT_REQUIRED/);
});
test('R60 blocks suspended or NO_CONTACT canonical stakeholder',()=>{
  const a=fixture({policy:'SOSPESO_NON_INVIARE'});
  assert.throws(()=>a.make(),/CONTACT_BLOCKED/);
  const b=fixture({policy:'NO_CONTACT'});
  assert.throws(()=>b.make(),/CONTACT_BLOCKED/);
  assert.equal(a.writes.length+b.writes.length,0);
});
test('R60 writes one idempotent unsent opportunity in exact canonical header layout',()=>{
  const t=fixture();
  const created=t.make();
  assert.equal(created.persisted,true);
  assert.equal(created.created,true);
  assert.equal(created.deliveryState,'NOT_SENT');
  assert.equal(created.contractCreated,false);
  assert.equal(t.tables['COMMERCIALE_OPPORTUNITA'].length,1);
  const row=t.tables['COMMERCIALE_OPPORTUNITA'][0];
  assert.equal(row.PARTNER,'Azienda QA');
  assert.equal(row.STAGE,'DA SVILUPPARE');
  assert.equal(row.STATO,'APERTO');
  assert.equal(row.ORIGINE,'SPONSOR');
  assert.equal(row.RESPONSABILE,'operator@example.org');
  assert.equal(row.CORRELATION_ID,'FLOW-GROW-REQ-2026-01');
  assert.equal(row.VALORE_POTENZIALE,'');
  assert.equal(row.PROBABILITA,'');
  assert.equal(row.VALORE_PONDERATO,'');
  assert.equal(t.audits[0].EMAIL,'operator@example.org');
  assert.equal(t.audits[0].RESOURCE,'SCD_GROW_OPPORTUNITY');
  assert.equal(t.writes.join(','),'APP AUDIT,COMMERCIALE_OPPORTUNITA');
  const repeated=t.make();
  assert.equal(repeated.created,false);
  assert.equal(repeated.opportunityId,created.opportunityId);
  assert.equal(t.tables['COMMERCIALE_OPPORTUNITA'].length,1);
  assert.equal(t.releases(),2);
});
test('R60 rejects idempotency correlation collision with a different company',()=>{
  const t=fixture();
  t.tables['COMMERCIALE_OPPORTUNITA'].push({OPPORTUNITY_ID:'OPP-OTHER',PARTNER:'Company X',CORRELATION_ID:'FLOW-GROW-REQ-2026-01'});
  assert.throws(()=>t.make(),/SOURCE_COLLISION/);
  assert.equal(t.writes.length,0);
});
test('R60 fails closed without an audit row and releases its lock',()=>{
  const t=fixture({auditFails:true});
  assert.throws(()=>t.make(),/AUDIT_UNAVAILABLE/);
  assert.equal(t.tables['COMMERCIALE_OPPORTUNITA'].length,0);
  assert.equal(t.releases(),1);
});
test('R60 escapes spreadsheet formula injection from untrusted asset fields',()=>{
  const t=fixture();
  t.make({asset:'=IMPORTDATA("https://example.org")'});
  const row=t.tables['COMMERCIALE_OPPORTUNITA'][0];
  assert.equal(row.OFFERTA.startsWith("'="),true);
});
