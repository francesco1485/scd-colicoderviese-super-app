import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {reconcileCanonicalEvent,matchIncomingToCanonical}=require('../lib/scd-calendar-fusion.js');

const fail=m=>{console.error('SCD R56 CALENDAR FUSION FAIL: '+m);process.exitCode=1};

const base={
  eventId:'EV-1',eventType:'MATCH',competition:'Promozione',
  homeTeam:'SCD',awayTeam:'Avversaria',startsAt:'2026-10-04T15:30:00+02:00',
  venue:'Colico',status:'CONFIRMED',sources:[]
};

const manager=reconcileCanonicalEvent(base,{
  sourceCode:'R20_MANAGER',externalEventKey:'RM-1',meetingAt:'2026-10-04T13:45:00+02:00',
  meetingPlace:'Colico',internalNotes:'Portare kit gara'
});
if(manager.meetingPlace!=='Colico')fail('R20 internal fields not applied');
if(manager.startsAt!==base.startsAt)fail('R20 must not override official fixture fields by default');

const federation=reconcileCanonicalEvent(manager,{
  sourceCode:'FEDERATION_OFFICIAL',externalEventKey:'FIGC-1',
  startsAt:'2026-10-04T16:00:00+02:00',venue:'Dervio',status:'CHANGED',
  verifiedAt:'2026-10-02T12:00:00Z'
});
if(federation.startsAt!=='2026-10-04T16:00:00+02:00')fail('Federation must control official kickoff');
if(federation.venue!=='Dervio')fail('Federation must control official venue');
if(federation.meetingPlace!=='Colico')fail('Federation update must preserve R20 internal logistics');

const tc=reconcileCanonicalEvent(federation,{
  sourceCode:'TUTTOCAMPO_VERIFIED',externalEventKey:'TC-1',
  startsAt:'2026-10-04T17:00:00+02:00',venue:'Altro campo'
});
if(tc.startsAt!=='2026-10-04T16:00:00+02:00')fail('Tuttocampo must not override federation kickoff');
if(tc.venue!=='Dervio')fail('Tuttocampo must not override federation venue');

const noLink=matchIncomingToCanonical([tc],{sourceCode:'FEDERATION_OFFICIAL',externalEventKey:'OTHER-1'});
if(noLink.state!=='PENDING_REVIEW')fail('Unknown source record must fail closed to review');

const byId=matchIncomingToCanonical([tc],{eventId:'EV-1',sourceCode:'R20_MANAGER',externalEventKey:'RM-2'});
if(byId.state!=='MATCHED'||byId.method!=='EVENT_ID')fail('Canonical EVENT_ID must match directly');

if(!process.exitCode)console.log('SCD R56 CALENDAR FUSION PASS',{
  federationPriority:true,
  r20InternalFields:true,
  noSyntheticMerge:true,
  tuttocampoNoOverride:true
});
