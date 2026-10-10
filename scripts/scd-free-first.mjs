#!/usr/bin/env node
/**
 * SCD_FREE_FIRST internal read-only command router.
 * This does NOT query billing services, install plugins, change external accounts,
 * start trials, charge cards, or silently treat submitted evidence as verified.
 * It builds a reproducible assessment for the authorized human operator/agent.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const policy=Object.freeze(JSON.parse(fs.readFileSync(path.join(root,'config/scd-free-first.v1.json'),'utf8')));
const REQUIRED=Object.freeze({
  duplicate_tools:'DENY',
  unofficial_claims:'VERIFY_FIRST',
  credits_balance:'UNKNOWN_UNTIL_CHECKED',
  payments:'HUMAN_APPROVAL',
  external_actions:'HUMAN_APPROVAL'
});
const SENSITIVE_KEY=/password|secret|api.?key|access.?token|refresh.?token|credit.?card|cvv|iban|tax.?code|codice.?fiscale/i;
const clean=(value,max=180)=>String(value??'').replace(/[\x00-\x1F\x7F]/g,' ').trim().slice(0,max);
const validUrl=value=>typeof value==='string'&&/^https:\/\/[^/\s?#]+/i.test(value);
const numberOrNull=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0?value:null;
const allowed=["/credits","/freefirst","/nonprofit","/trialgate","/toolscore","/skillreuse","/creditbudget","/sourcecheck"];

function assertPolicy(){
 if(policy.id!=='SCD_FREE_FIRST')throw Error('SCD_FREE_FIRST policy missing');
 for(const [k,v] of Object.entries(REQUIRED))if(policy.rules?.[k]!==v)throw Error('Unsafe SCD_FREE_FIRST rule '+k);
 const cmds=Object.keys(policy.commands||{});
 if(cmds.length!==allowed.length||cmds.some(x=>!allowed.includes(x)))throw Error('SCD_FREE_FIRST command drift');
}
assertPolicy();
function commandOf(raw){
 const id=clean(raw,60).toLowerCase();
 if(!allowed.includes(id))throw Error('Comando non previsto: '+id+'. Comandi: '+allowed.join(', '));
 return id;
}
function toolsFromEvidence(evidence){
 const items=Array.isArray(evidence?.tools)?evidence.tools:[];
 if(items.length>100)throw Error('Limite: max 100 strumenti per audit');
 return items.map((tool,i)=>{
  if(!tool||typeof tool!=='object'||Array.isArray(tool))throw Error('Strumento non valido in posizione '+i);
  const capabilities=Array.isArray(tool.capabilities)?
   [...new Set(tool.capabilities.filter(x=>typeof x==='string').map(x=>clean(x.toLowerCase(),70)).filter(Boolean))].slice(0,20):[];
  const score=value=>Number.isInteger(value)&&value>=0&&value<=5?value:null;
  return {
   id:clean(tool.id||tool.name||'tool-'+(i+1),90),
   name:clean(tool.name||tool.id||'Da identificare',130),
   alreadyAvailable:tool.alreadyAvailable===true,
   capabilities,
   monthlyCostEUR:numberOrNull(tool.monthlyCostEUR),
   costEvidenceUrl:validUrl(tool.costEvidenceUrl)?clean(tool.costEvidenceUrl,450):null,
   creditBalance:numberOrNull(tool.creditBalance),
   creditCheckedAt:typeof tool.creditCheckedAt==='string'&&/^\d{4}-\d{2}-\d{2}T/.test(tool.creditCheckedAt)?clean(tool.creditCheckedAt,80):null,
   officialEvidence:tool.officialEvidence===true,
   benefitScore:score(tool.benefitScore),
   riskScore:score(tool.riskScore)
  };
 });
}
function overlaps(a,b){
 return a.capabilities.some(cap=>b.capabilities.includes(cap));
}
function assessTools(tools){
 const already=tools.filter(t=>t.alreadyAvailable);
 const ranked=tools.map((t,i)=>{
  const duplicate=(!t.alreadyAvailable&&already.some(x=>overlaps(x,t)))||
   (!t.alreadyAvailable&&tools.some((x,j)=>j<i&&!x.alreadyAvailable&&overlaps(x,t)));
  const evidenceReady=t.officialEvidence&&Boolean(t.costEvidenceUrl)&&t.monthlyCostEUR!==null&&t.benefitScore!==null&&t.riskScore!==null;
  const score=evidenceReady?(t.benefitScore*50+(5-t.riskScore)*30+(t.monthlyCostEUR===0?20:Math.max(0,20-Math.min(20,t.monthlyCostEUR)))):null;
  const state=duplicate?'DENIED_DUPLICATE':!evidenceReady?'NOT_COMPARABLE_UNTIL_VERIFIED':t.alreadyAvailable?'PREFER_EXISTING_IF_FIT':'HUMAN_APPROVAL_REQUIRED';
  return {name:t.name,alreadyAvailable:t.alreadyAvailable,capabilities:t.capabilities,
    monthlyCostEUR:t.monthlyCostEUR,costEvidenceUrl:t.costEvidenceUrl,
    evidenceLabel:evidenceReady?'SUBMITTED_OFFICIAL_LINK_NOT_INDEPENDENTLY_VERIFIED':'UNKNOWN_UNTIL_CHECKED',
    decision:state,score,needsHumanApproval:!t.alreadyAvailable};
 });
 return ranked.sort((a,b)=>Number(b.decision==='PREFER_EXISTING_IF_FIT')-Number(a.decision==='PREFER_EXISTING_IF_FIT')|| (b.score??-1)-(a.score??-1));
}
function budgetReport(tools){
 return tools.map(t=>({
  name:t.name,
  creditBalance:t.creditBalance!==null&&t.creditCheckedAt? t.creditBalance : null,
  state:t.creditBalance!==null&&t.creditCheckedAt?'REPORTED_UNVERIFIED_FROM_INPUT':'UNKNOWN_UNTIL_CHECKED',
  asOf:t.creditCheckedAt,
  action:'Confirm with official provider billing or authorized read-only connector; no assumption of included credits'
 }));
}
export function runFreeFirst(rawCommand,evidence={}){
 const command=commandOf(rawCommand);
 if(!evidence||typeof evidence!=='object'||Array.isArray(evidence))throw Error('L’evidenza deve essere un oggetto JSON');
 if(Object.keys(evidence).some(k=>SENSITIVE_KEY.test(k)))throw Error('Non fornire credenziali o dati riservati');
 const tools=toolsFromEvidence(evidence);
 const def=policy.commands[command];
 const result={
  policy:policy.id,
  command,
  scope:'SCD_INTERNAL_ONLY',
  mode:'READ_ONLY_NO_EXTERNAL_WRITES',
  request:def.label,
  intent:def.intent,
  status:'CHECK_REQUIRED',
  checks:def.requires,
  evidenceStatus:'NO_LIVE_PROVIDER_CHECK_PERFORMED',
  guards:REQUIRED,
  decision:'HOLD_EXTERNAL_ACTIONS',
  existingToolsCount:tools.filter(t=>t.alreadyAvailable).length,
  toolInventoryCount:tools.length,
  nextAction:'Run authorized read-only official checks. Review evidence before spending or connecting services.'
 };
 if(command==='/freefirst'||command==='/toolscore'||command==='/skillreuse')result.toolComparison=assessTools(tools);
 if(command==='/credits'||command==='/creditbudget')result.creditBalances=budgetReport(tools);
 if(command==='/nonprofit')result.eligibility='UNKNOWN_UNTIL_OFFICIAL_PROGRAM_AND_SCD_ENTITY_DOCS_VERIFIED';
 if(command==='/trialgate')result.renewals='UNKNOWN_UNTIL_PROVIDER_BILLING_AND_TERMS_VERIFIED';
 if(command==='/skillreuse')result.skillDiscovery='USE_CURRENT_SKILLS_REGISTRY_DONT_INSTALL_DUPLICATE_SKILLS';
 if(command==='/sourcecheck'){
  const claim=clean(evidence.claim,200);
  result.claim=claim||null;
  result.claimStatus='UNOFFICIAL_UNVERIFIED';
  result.officialVerificationNeeded=true;
  result.sourceUrl=validUrl(evidence.sourceUrl)?clean(evidence.sourceUrl,450):null;
 }
 return result;
}
function main(){
 const args=process.argv.slice(2);
 if(args.length>2)throw Error('Uso: npm run scd:freefirst -- /comando [--evidence=percorso.json]');
 const command=args[0];
 const evidenceArg=args[1];
 if(!command)throw Error('SCD_FREE_FIRST richiede un comando: '+allowed.join(', '));
 if(evidenceArg&&!evidenceArg.startsWith('--evidence='))throw Error('Opzione non supportata: '+evidenceArg);
 let evidence={};
 if(evidenceArg){
  const file=path.resolve(process.cwd(),evidenceArg.slice('--evidence='.length));
  if(fs.statSync(file).size>100000)throw Error('Evidenza troppo grande: limite 100 KB');
  evidence=JSON.parse(fs.readFileSync(file,'utf8'));
 }
 process.stdout.write(JSON.stringify(runFreeFirst(command,evidence),null,2)+'\n');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{main()}catch(error){process.stderr.write('SCD_FREE_FIRST: '+clean(error.message,240)+'\n');process.exitCode=2}
}
