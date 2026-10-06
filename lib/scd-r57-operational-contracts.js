'use strict';

const manifest=require('../SCD_SYSTEM_MANIFEST.json');
const {isWithdrawnSCDTeamRecord}=require('./scd-season-status.js');
const CURRENT_SEASON=manifest.product.season_model.current_season;

function unwrap(raw){
  if(raw&&raw.ok===true&&raw.data!=null)return raw.data;
  if(raw&&raw.data!=null&&Object.keys(raw).length<=4)return raw.data;
  return raw;
}

function rowsFrom(raw){
  const data=unwrap(raw);
  if(Array.isArray(data))return data;
  return data?.rows||data?.items||data?.events||data?.calendar||[];
}

function value(row,...keys){
  for(const key of keys){
    const found=row?.[key];
    if(found!=null&&String(found).trim()!=='')return String(found).trim();
  }
  return '';
}

function isoDate(value){
  const text=String(value||'').trim();
  const iso=text.match(/^(\d{4}-\d{2}-\d{2})/);
  if(iso)return iso[1];
  const local=text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if(local)return `${local[3]}-${String(local[2]).padStart(2,'0')}-${String(local[1]).padStart(2,'0')}`;
  return '';
}

function tournamentKind(row){
  const kind=[value(row,'kind','type','eventType'),value(row,'title','event','name','subject')].join(' ').toLowerCase();
  if(/allenament|training/.test(kind))return false;
  if(/gara|partita|campionato|coppa|amichevole|match/.test(kind))return false;
  return /torneo|tournament/.test(kind);
}

function normalizeTournamentRows(raw){
  const seen=new Set();
  return rowsFrom(raw).filter(row=>row&&typeof row==='object'&&tournamentKind(row)&&!isWithdrawnSCDTeamRecord(row))
    .map(row=>{
      const eventId=value(row,'eventId','id','uid');
      const title=value(row,'title','event','name','subject');
      const date=isoDate(value(row,'date','data','startDate'));
      if(!eventId||!title||!date||seen.has(eventId))return null;
      seen.add(eventId);
      return {
        eventId,
        title,
        date,
        time:value(row,'time','ora','startTime'),
        team:value(row,'team','teamName','squadra'),
        category:value(row,'category','categoria','ageGroup','annata'),
        venue:value(row,'venue','luogo','field','location'),
        competition:value(row,'competition','campionato','league'),
        provenance:{
          sourceId:'R20',
          sourceRecordId:eventId,
          sourceUpdatedAt:value(row,'sourceUpdatedAt','updatedAt','lastUpdated')||null
        }
      };
    }).filter(Boolean);
}

function tournamentSurface(raw,fetchedAt=new Date().toISOString()){
  const events=normalizeTournamentRows(raw);
  return {
    ok:true,
    state:events.length?'SOURCE_REPORTED':'UPDATING',
    season:CURRENT_SEASON,
    events,
    source:{id:'R20',contract:'public.calendar',state:'AVAILABLE',fetchedAt}
  };
}

function unavailableTournamentSurface(){
  return {
    ok:false,
    state:'SOURCE_UNAVAILABLE',
    season:CURRENT_SEASON,
    events:[],
    source:{id:'R20',contract:'public.calendar',state:'UNAVAILABLE'}
  };
}

function membershipServicesSurface(){
  return {
    ok:true,
    state:'SOURCE_BINDING_UNVERIFIED',
    season:CURRENT_SEASON,
    services:[],
    source:{id:'SCD_OPERATIVO_PILOTA',recordSet:'ISCRIZIONI_CONFIG',state:'UNVERIFIED'},
    identityAuthority:'R20'
  };
}

function facilityLogisticsSurface(){
  return {
    ok:true,
    state:'UNVERIFIED',
    catalogue:[],
    source:{recordSets:['IMPIANTI_MASTER','IMPIANTI_SPAZI'],state:'UNVERIFIED'},
    logistics:{
      occupancy:'UNKNOWN',
      rotation:'UNKNOWN',
      homologation:'UNVERIFIED',
      categoryEligibility:'UNVERIFIED',
      transport:'UNVERIFIED',
      availability:'UNKNOWN'
    }
  };
}

function launchReadinessSurface(config){
  const gates=Array.isArray(config?.gates)?config.gates:[];
  if(!gates.length)throw new TypeError('Launch readiness gates are required');
  const publicGates=gates.map(gate=>{
    if(!gate||typeof gate.id!=='string'||typeof gate.state!=='string')throw new TypeError('Invalid launch readiness gate');
    return {id:gate.id,label:String(gate.label||gate.id),state:gate.state,critical:gate.critical===true};
  });
  const criticalGates=publicGates.filter(gate=>gate.critical);
  const verifiedCriticalGates=criticalGates.filter(gate=>gate.state==='VERIFIED');
  return {
    ok:true,
    schema:'SCD_R57_LAUNCH_READINESS_V1',
    release:String(config.release||'R57.PRODUCT'),
    evidenceAsOf:config.evidenceAsOf||null,
    policy:'FAIL_CLOSED_NO_INFERRED_READINESS',
    state:criticalGates.length===verifiedCriticalGates.length?'READY':'NOT_READY',
    criticalGateCount:criticalGates.length,
    verifiedCriticalGateCount:verifiedCriticalGates.length,
    gates:publicGates
  };
}

module.exports={
  normalizeTournamentRows,
  tournamentSurface,
  unavailableTournamentSurface,
  membershipServicesSurface,
  facilityLogisticsSurface,
  launchReadinessSurface
};
