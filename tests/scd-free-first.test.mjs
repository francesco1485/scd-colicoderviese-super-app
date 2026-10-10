import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runFreeFirst } from '../scripts/scd-free-first.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const policy=JSON.parse(fs.readFileSync(path.join(root,'config/scd-free-first.v1.json'),'utf8'));

test('SCD_FREE_FIRST has exactly eight directives and all non-negotiable human gates',()=>{
 assert.equal(policy.id,'SCD_FREE_FIRST');
 assert.deepEqual(Object.keys(policy.commands),['/credits','/freefirst','/nonprofit','/trialgate','/toolscore','/skillreuse','/creditbudget','/sourcecheck']);
 assert.deepEqual(policy.rules,{
  duplicate_tools:'DENY',unofficial_claims:'VERIFY_FIRST',
  credits_balance:'UNKNOWN_UNTIL_CHECKED',payments:'HUMAN_APPROVAL',
  external_actions:'HUMAN_APPROVAL'
 });
 assert.equal(policy.commandAccess,'INTERNAL_DIRECTION_AND_AUTHORIZED_AI_OPERATIONS_ONLY_NOT_PUBLIC_SKY_CHAT_OR_MINOR_DATA');
 assert.equal(policy.execution.noNewInfrastructure,true);
 assert.equal(policy.execution.noAutomaticPurchases,true);
});
test('all command outputs are read only and cannot trigger provider-side effects',()=>{
 for(const command of Object.keys(policy.commands)){
  const r=runFreeFirst(command);
  assert.equal(r.command,command);
  assert.equal(r.mode,'READ_ONLY_NO_EXTERNAL_WRITES');
  assert.equal(r.status,'CHECK_REQUIRED');
  assert.equal(r.decision,'HOLD_EXTERNAL_ACTIONS');
  assert.equal(r.evidenceStatus,'NO_LIVE_PROVIDER_CHECK_PERFORMED');
  assert.equal(r.guards.external_actions,'HUMAN_APPROVAL');
 }
});
test('missing credits are UNKNOWN, not free or zero',()=>{
 const r=runFreeFirst('/creditbudget',{tools:[{name:'Lovable Business',alreadyAvailable:true,capabilities:['app-builder']}]});
 assert.equal(r.creditBalances.length,1);
 assert.equal(r.creditBalances[0].creditBalance,null);
 assert.equal(r.creditBalances[0].state,'UNKNOWN_UNTIL_CHECKED');
 const c=runFreeFirst('/credits');
 assert.deepEqual(c.creditBalances,[]);
});
test('duplicate tools with an existing capability are denied before any recommendation',()=>{
 const x=runFreeFirst('/toolscore',{tools:[
  {name:'Existing editor',alreadyAvailable:true,capabilities:['design-to-code'],
   monthlyCostEUR:0,officialEvidence:true,costEvidenceUrl:'https://example.org/pricing',benefitScore:4,riskScore:1},
  {name:'New competing editor',alreadyAvailable:false,capabilities:['design-to-code'],
   monthlyCostEUR:0,officialEvidence:true,costEvidenceUrl:'https://example.org/pricing',benefitScore:5,riskScore:0}
 ]});
 assert.equal(x.toolComparison[0].name,'Existing editor');
 assert.equal(x.toolComparison[0].decision,'PREFER_EXISTING_IF_FIT');
 const rejected=x.toolComparison.find(t=>t.name==='New competing editor');
 assert.equal(rejected.decision,'DENIED_DUPLICATE');
 assert.equal(rejected.needsHumanApproval,true);
});
test('toolscore does not invent scores or prices if official evidence is unavailable',()=>{
 const x=runFreeFirst('/toolscore',{tools:[{name:'Unknown offer',capabilities:['analytics'],benefitScore:5,riskScore:1,monthlyCostEUR:0,officialEvidence:false}]});
 assert.equal(x.toolComparison[0].score,null);
 assert.equal(x.toolComparison[0].decision,'NOT_COMPARABLE_UNTIL_VERIFIED');
 assert.equal(x.toolComparison[0].evidenceLabel,'UNKNOWN_UNTIL_CHECKED');
});
test('submitted official-looking URL is not treated as independently verified',()=>{
 const r=runFreeFirst('/sourcecheck',{claim:'Sconto del 100%',sourceUrl:'https://social.example/promo'});
 assert.equal(r.claimStatus,'UNOFFICIAL_UNVERIFIED');
 assert.equal(r.officialVerificationNeeded,true);
 assert.equal(r.status,'CHECK_REQUIRED');
 assert.equal(runFreeFirst('/nonprofit').eligibility,'UNKNOWN_UNTIL_OFFICIAL_PROGRAM_AND_SCD_ENTITY_DOCS_VERIFIED');
 assert.equal(runFreeFirst('/trialgate').renewals,'UNKNOWN_UNTIL_PROVIDER_BILLING_AND_TERMS_VERIFIED');
});
test('skillreuse reuses dynamic skills registry and never installs a duplicate',()=>{
 const x=runFreeFirst('/skillreuse');
 assert.equal(x.skillDiscovery,'USE_CURRENT_SKILLS_REGISTRY_DONT_INSTALL_DUPLICATE_SKILLS');
 assert.deepEqual(x.toolComparison,[]);
});
test('invalid slash commands, malicious data, malformed tools or excess items fail closed',()=>{
 assert.throws(()=>runFreeFirst('/buycredits'),/Comando non previsto/);
 assert.throws(()=>runFreeFirst('/freefirst',{apiKey:'should not be accepted'}),/Non fornire credenziali/);
 assert.throws(()=>runFreeFirst('/freefirst',{tools:[null]}),/Strumento non valido/);
});
test('evidence objects are bounded and never interpreted as provider connection authorization',()=>{
 const tools=Array.from({length:101},(_,i)=>({name:'n'+i}));
 assert.throws(()=>runFreeFirst('/toolscore',{tools}),/max 100/);
 const r=runFreeFirst('/creditbudget',{tools:[{name:'Known',creditBalance:0,creditCheckedAt:'2026-10-10T08:00:00Z'}]});
 assert.equal(r.creditBalances[0].state,'REPORTED_UNVERIFIED_FROM_INPUT');
 assert.equal(r.creditBalances[0].creditBalance,0);
 assert.equal(r.decision,'HOLD_EXTERNAL_ACTIONS');
});
