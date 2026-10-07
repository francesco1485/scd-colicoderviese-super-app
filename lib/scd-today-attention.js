'use strict';

const { isWithdrawnSCDTeamRecord }=require('./scd-season-status.js');

function asArray(value){return Array.isArray(value)?value:[]}
function stableId(item,index=0){return String(item?.recordId||item?.id||item?.evidence?.recordId||'item-'+index)}
function validDue(value){
  if(!value)return null;
  const time=Date.parse(String(value));
  return Number.isFinite(time)?time:null;
}
function rankAttention(items){
  return asArray(items).map((item,index)=>({item,index})).sort((a,b)=>{
    const pa=Number(a.item?.explicitPriorityScore)||0;
    const pb=Number(b.item?.explicitPriorityScore)||0;
    if(pb!==pa)return pb-pa;
    const da=validDue(a.item?.due||a.item?.due_at);
    const db=validDue(b.item?.due||b.item?.due_at);
    if(da!==null&&db!==null&&da!==db)return da-db;
    if(da!==null&&db===null)return -1;
    if(da===null&&db!==null)return 1;
    const idCmp=stableId(a.item,a.index).localeCompare(stableId(b.item,b.index));
    return idCmp||a.index-b.index;
  }).map(x=>x.item);
}
function sourceStateFromBrain(brain){
  const entries=Object.values(brain?.channels||{});
  if(entries.length){
    const verified=entries.filter(x=>x?.state==='VERIFIED').length;
    if(verified===entries.length)return 'VERIFIED';
    if(verified>0)return 'PARTIAL';
    return 'UNVERIFIED';
  }
  const verified=Number(brain?.health?.verifiedChannels)||0;
  const total=Number(brain?.health?.totalChannels)||0;
  if(total>0&&verified===total)return 'VERIFIED';
  if(verified>0)return 'PARTIAL';
  return 'UNVERIFIED';
}
function coverageFromBrain(brain){
  const entries=Object.entries(brain?.channels||{});
  if(entries.length){
    return {
      verified:entries.filter(([,x])=>x?.state==='VERIFIED').map(([id])=>id),
      missing:entries.filter(([,x])=>x?.state!=='VERIFIED').map(([id,x])=>({id,error:String(x?.error||'SOURCE_UNAVAILABLE')}))
    };
  }
  return {
    verified:[],
    missing:asArray(brain?.health?.unavailable).map(x=>({id:String(x?.id||'source'),error:String(x?.error||'SOURCE_UNAVAILABLE')}))
  };
}
function itemVerificationState(item,brain){
  const explicit=String(item?.verificationState||item?.verification_state||'').toUpperCase();
  if(explicit)return explicit;
  const channel=String(item?.channel||item?.evidence?.channel||'');
  if(channel&&brain?.channels?.[channel]?.state==='VERIFIED')return 'VERIFIED';
  return 'UNVERIFIED';
}
function safeNextAction(item){
  const raw=String(item?.nextAction||item?.next_action||'').trim();
  if(!raw)return {label:'Apri la fonte verificata',mode:'READ'};
  const requested=String(item?.actionMode||item?.action_mode||'READ').toUpperCase();
  return {
    label:raw,
    mode:requested==='READ'?'READ':'HUMAN_GATE'
  };
}
function reasonFrom(item){
  const parts=[];
  if(item?.priority)parts.push('Priorità esplicita: '+String(item.priority));
  if(item?.due||item?.due_at)parts.push('Scadenza: '+String(item.due||item.due_at));
  if(item?.status)parts.push('Stato: '+String(item.status));
  return parts.join(' · ')||'Elemento operativo verificato dalla fonte indicata.';
}
function projectItem(item,brain,index=0){
  return {
    id:stableId(item,index),
    title:String(item?.title||item?.nextAction||item?.status||'Elemento operativo'),
    reason:reasonFrom(item),
    owner:item?.owner?String(item.owner):null,
    due_at:item?.due||item?.due_at?String(item.due||item.due_at):null,
    source:String(item?.source||item?.evidence?.source||item?.evidence?.channel||'R20'),
    verification_state:itemVerificationState(item,brain),
    next_action:safeNextAction(item)
  };
}
function buildTodayAttentionProjection({brain={},roleScope=[],commandTrigger='/today',now=new Date().toISOString()}={}){
  const source_state=sourceStateFromBrain(brain);
  const coverage=coverageFromBrain(brain);
  const filtered=asArray(brain?.actionQueue).filter(item=>!isWithdrawnSCDTeamRecord(item));
  const verified=filtered.filter(item=>itemVerificationState(item,brain)==='VERIFIED');
  const ranked=rankAttention(verified);
  const projected=ranked.map((item,index)=>projectItem(item,brain,index));
  const primary_attention=projected[0]||null;
  const next=projected.slice(1,4);
  const changed=projected.filter((_,index)=>index>0).filter((row,index)=>{
    const src=ranked[index+1]||{};
    return Boolean(src.changedAt||src.changed_at||String(src.status||'').toUpperCase()==='CHANGED');
  }).slice(0,3);

  let fail_closed=null;
  if(source_state==='UNVERIFIED'){
    fail_closed={
      code:'SOURCE_UNVERIFIED',
      message:'Le fonti operative non sono verificabili in questo momento. Nessun dato viene stimato o ricostruito.',
      missing_sources:coverage.missing.map(x=>x.id),
      next_action:{label:'Riprova la verifica delle fonti',mode:'READ'}
    };
  }else if(!primary_attention){
    fail_closed={
      code:'NO_VERIFIED_ATTENTION',
      message:'Non risultano azioni esplicite verificate nelle fonti attualmente disponibili.',
      missing_sources:coverage.missing.map(x=>x.id),
      next_action:{label:'Controlla le fonti disponibili',mode:'READ'}
    };
  }

  return {
    generated_at:String(now),
    command_trigger:String(commandTrigger||'/today'),
    source_state,
    role_scope:asArray(roleScope).map(String),
    primary_attention,
    changed,
    next,
    coverage,
    fail_closed
  };
}

module.exports={buildTodayAttentionProjection,rankAttention,sourceStateFromBrain};
