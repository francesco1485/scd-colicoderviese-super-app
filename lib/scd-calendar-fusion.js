'use strict';

const SOURCE_RANK=Object.freeze({
  FEDERATION_OFFICIAL:100,
  R20_MANAGER:85,
  GOOGLE_CALENDAR:75,
  CLUB_EVENT:70,
  TUTTOCAMPO_VERIFIED:60,
  MANUAL_DIRECTION:90
});

const OFFICIAL_FIXTURE_FIELDS=Object.freeze([
  'competition','homeTeam','awayTeam','startsAt','venue','status'
]);
const INTERNAL_FIELDS=Object.freeze([
  'meetingAt','meetingPlace','transport','responsibleIds','internalNotes','notificationPolicy'
]);

function sourceRank(code){return SOURCE_RANK[String(code||'').toUpperCase()]||0}
function clone(v){return JSON.parse(JSON.stringify(v||{}))}

function reconcileCanonicalEvent(canonical,incoming){
  if(!canonical?.eventId) throw new Error('CANONICAL_EVENT_ID_REQUIRED');
  if(!incoming?.sourceCode) throw new Error('SOURCE_CODE_REQUIRED');
  if(!incoming?.externalEventKey) throw new Error('EXTERNAL_EVENT_KEY_REQUIRED');

  const next=clone(canonical);
  next.sources=Array.isArray(next.sources)?next.sources:[];
  const sourceCode=String(incoming.sourceCode).toUpperCase();
  const rank=sourceRank(sourceCode);
  const currentOfficialRank=Number(next.officialSourceRank||0);

  if(sourceCode==='FEDERATION_OFFICIAL'||sourceCode==='MANUAL_DIRECTION'){
    if(rank>=currentOfficialRank){
      OFFICIAL_FIXTURE_FIELDS.forEach(k=>{
        if(incoming[k]!==undefined&&incoming[k]!==null&&incoming[k]!=='')next[k]=incoming[k];
      });
      next.officialSource=sourceCode;
      next.officialSourceRank=rank;
      next.officialVerifiedAt=incoming.verifiedAt||null;
    }
  }else if(sourceCode==='TUTTOCAMPO_VERIFIED'){
    // Tuttocampo may enrich, never silently override official federation fixture fields.
    OFFICIAL_FIXTURE_FIELDS.forEach(k=>{
      if((next[k]===undefined||next[k]===null||next[k]==='')&&incoming[k]!==undefined)next[k]=incoming[k];
    });
  }

  if(['R20_MANAGER','MANUAL_DIRECTION'].includes(sourceCode)){
    INTERNAL_FIELDS.forEach(k=>{
      if(incoming[k]!==undefined&&incoming[k]!==null)next[k]=incoming[k];
    });
  }

  if(sourceCode==='CLUB_EVENT'&&String(next.eventType||'').toUpperCase()!=='MATCH'){
    ['title','startsAt','endsAt','venue','status'].forEach(k=>{
      if(incoming[k]!==undefined&&incoming[k]!==null)next[k]=incoming[k];
    });
  }

  next.sources.push({
    sourceCode,
    externalEventKey:String(incoming.externalEventKey),
    verifiedAt:incoming.verifiedAt||null,
    payloadHash:incoming.payloadHash||null
  });
  next.sources=next.sources.filter((s,i,a)=>a.findIndex(x=>x.sourceCode===s.sourceCode&&x.externalEventKey===s.externalEventKey)===i);

  return next;
}

function matchIncomingToCanonical(canonicalEvents,incoming){
  if(incoming?.eventId){
    const hit=(canonicalEvents||[]).find(x=>String(x.eventId)===String(incoming.eventId));
    if(hit)return {state:'MATCHED',event:hit,method:'EVENT_ID'};
  }
  if(incoming?.externalEventKey&&incoming?.sourceCode){
    const hit=(canonicalEvents||[]).find(x=>(x.sources||[]).some(s=>String(s.sourceCode)===String(incoming.sourceCode)&&String(s.externalEventKey)===String(incoming.externalEventKey)));
    if(hit)return {state:'MATCHED',event:hit,method:'SOURCE_EXTERNAL_KEY'};
  }
  return {state:'PENDING_REVIEW',event:null,method:'NO_STRONG_LINK'};
}

module.exports={SOURCE_RANK,OFFICIAL_FIXTURE_FIELDS,INTERNAL_FIELDS,sourceRank,reconcileCanonicalEvent,matchIncomingToCanonical};
