'use strict';

const HOURS_48=48*60*60*1000;
const DAYS_14=14*24*60*60*1000;

function instant(value){
  const n=Date.parse(String(value||''));
  return Number.isFinite(n)?n:null;
}
function verifiedPublicSource(row){
  if(!row||!String(row.verification||'').startsWith('WEB_VERIFIED'))return false;
  try{return new URL(String(row.sourceUrl||'')).protocol==='https:'}catch{return false}
}
function sortedByTime(rows,field){
  return [...rows].sort((a,b)=>(instant(a[field])??Number.MAX_SAFE_INTEGER)-(instant(b[field])??Number.MAX_SAFE_INTEGER));
}
function buildDirectionHome(snapshot={},nowIso=new Date().toISOString()){
  const now=instant(nowIso);
  if(now===null)throw new Error('INVALID_REFERENCE_TIME');
  const verified=(Array.isArray(snapshot.verifiedItems)?snapshot.verifiedItems:[]).filter(verifiedPublicSource);
  const sourceHealth=Array.isArray(snapshot.sourceHealth)?snapshot.sourceHealth:[];
  const sourceErrors=sourceHealth.filter(x=>x.status!=='OK').map(x=>({
    sourceId:x.sourceId, status:x.status||'UNVERIFIED', error:x.error||'NOT_AVAILABLE', checkedAt:x.checkedAt||null
  }));
  const scanTime=instant(snapshot.generatedAt);
  const scanState=!sourceHealth.length?'NOT_SCANNED':sourceErrors.length?'DEGRADED':(scanTime===null||now-scanTime>HOURS_48?'STALE':'HEALTHY');
  const opportunities=sortedByTime(verified.filter(x=>
    x.category==='OPPORTUNITIES' &&
    !['CLOSED','EXPIRED','CANCELLED'].includes(String(x.status||'')) &&
    (instant(x.closesAt)===null||instant(x.closesAt)>=now)
  ).map(x=>({
    id:x.id,title:x.title,authority:x.authority,sourceUrl:x.sourceUrl,
    status:x.status||'UNVERIFIED',opensAt:x.opensAt||null,closesAt:x.closesAt||null,
    relevance:x.relevance||'UNVERIFIED',
    audiences:Array.isArray(x.audiences)?x.audiences:[],
    eligibility:'REQUIRES_HUMAN_REVIEW',
    verification:x.verification
  })),'closesAt');
  const territory=sortedByTime(verified.filter(x=>
    x.category==='TERRITORY'&&(instant(x.startsAt)===null||instant(x.startsAt)>=now)
  ).map(x=>({
    id:x.id,title:x.title,territory:x.territory||null,startsAt:x.startsAt||null,
    venue:x.venue||null,authority:x.authority,sourceUrl:x.sourceUrl,
    verification:x.verification,
    calendarSignal:x.calendarReconciliation?.signal||'UNVERIFIED',
    calendarLevel:x.calendarReconciliation?.level||'UNVERIFIED',
    calendarNote:x.calendarReconciliation?.note||null
  })),'startsAt');
  const opportunityDeadlines=opportunities.filter(x=>{
    const closes=instant(x.closesAt);
    return closes!==null&&closes>=now&&closes-now<=DAYS_14;
  });
  const territoryCoordination=territory.filter(x=>
    x.calendarLevel==='HIGH'&&x.calendarSignal!=='UNVERIFIED'
  );
  const candidates=Array.isArray(snapshot.candidates)?snapshot.candidates:[];
  return {
    id:'SCD_DIRECTION_HOME_READ_MODEL_V1',
    mode:'READ_ONLY',
    asOf:nowIso,
    source:{
      state:scanState,
      generatedAt:snapshot.generatedAt||null,
      verifiedAt:snapshot.verifiedAt||null,
      calendarReconciledAt:snapshot.calendarReconciledAt||null,
      checkedSources:sourceHealth.length,
      sourceErrors
    },
    summary:{
      verifiedOpportunities:opportunities.length,
      upcomingTerritoryEvents:territory.length,
      deadlinesWithin14Days:opportunityDeadlines.length,
      territoryCoordinationSignals:territoryCoordination.length,
      unverifiedCandidates:candidates.length
    },
    attention:{opportunityDeadlines,territoryCoordination},
    opportunities,
    territory,
    territoryCoverage:Array.isArray(snapshot.territoryStatus)?snapshot.territoryStatus:[],
    candidateReview:{count:candidates.length,status:'DISCOVERED_NEEDS_REVIEW',requiresHumanReview:true},
    visualState:'PENDING_VISUAL_APPROVAL'
  };
}

module.exports={buildDirectionHome,verifiedPublicSource,instant};
