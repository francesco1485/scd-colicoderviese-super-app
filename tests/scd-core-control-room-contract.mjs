import '../lib/scd-core-control-room.js';

const Core=globalThis.ScdCoreControlRoom;
function ok(condition,message){if(!condition)throw new Error(message)}
function source(state='VERIFIED'){return {state,checkedAt:'2026-10-03T16:00:00Z'}}

ok(Core&&typeof Core.build==='function','Control Room engine must expose build()');
ok(JSON.stringify(Core.LANE_ORDER)===JSON.stringify(['TODAY','PRIORITY','TODO','APPROVALS','DEADLINES','CHANGES']),'canonical lane order mismatch');

const model=Core.build({
  today:'2026-10-03',
  sources:{
    agenda:source(),
    evolution:source(),
    mailactions:source(),
    diagnostics:source(),
    datafabric:source(),
    dashboard:source()
  },
  agenda:{
    upcoming:[
      {id:'EV-TODAY',title:'Riunione tecnica',startAt:'2026-10-03T18:00:00+02:00',endAt:'2026-10-03T19:00:00+02:00',location:'Sede SCD'},
      {id:'EV-DEADLINE',title:'Scadenza documentale',startAt:'2026-10-05T09:00:00+02:00',description:'AGENDA SCD\nTipo: DEADLINE\nCorrelation ID: FLOW-1'}
    ]
  },
  mailactions:{
    rows:[
      {id:'MAIL-1',title:'Variazione gara ricevuta',priority:'ALTA',status:'DA LAVORARE',nextAction:'Verificare EVENT_ID e proporre aggiornamento calendario; conferma umana obbligatoria.'},
      {id:'MAIL-2',title:'Documento da verificare',priority:'MEDIA',status:'NUOVA',nextAction:'Collegare documento amministrativo e sottoporre a verifica contabile.'}
    ]
  },
  evolution:{
    rows:[
      {id:'EVO-1',title:'Verifica pratica',priority:'HIGH',status:'DA FARE',nextAction:'Controlla documentazione',deadline:'2026-10-04'},
      {id:'EVO-2',title:'Decisione Direzione',status:'DA APPROVARE',requiresApproval:true},
      {id:'EVO-3',title:'Variazione registrata',type:'CHANGE',change:'Fonte aggiornata',status:'OPEN'},
      {id:'EVO-4',title:'Titolo con parola approvazione ma senza stato esplicito',status:'CHIUSO'}
    ]
  }
});

ok(model.lanes.TODAY.some(x=>x.id==='EV-TODAY'),'today lane must use verified agenda event');
ok(model.lanes.DEADLINES.some(x=>x.id==='EV-DEADLINE'),'explicit agenda DEADLINE must enter deadline lane');
ok(model.lanes.DEADLINES.some(x=>x.id==='EVO-1'),'explicit evolution deadline must enter deadline lane');
ok(model.lanes.PRIORITY.some(x=>x.id==='EVO-1'),'explicit HIGH priority must enter priority lane');
ok(model.lanes.TODO.some(x=>x.id==='EVO-1'),'explicit next action/open status must enter todo lane');
ok(model.lanes.APPROVALS.some(x=>x.id==='EVO-2'),'explicit approval state must enter approvals lane');
ok(!model.lanes.APPROVALS.some(x=>x.id==='EVO-4'),'approval must not be inferred from a free-text title');
ok(model.lanes.CHANGES.some(x=>x.id==='EVO-3'),'explicit change evidence must enter changes lane');
ok(model.lanes.PRIORITY.some(x=>x.id==='MAIL-1'),'high-priority mail action must enter priority lane');
ok(model.lanes.TODO.some(x=>x.id==='MAIL-1'),'mail action queue must enter todo lane');
ok(model.lanes.TODO.some(x=>x.id==='MAIL-2'),'normal verified mail action must remain actionable');
ok(model.lanes.APPROVALS.some(x=>x.id==='MAIL-1'),'explicit human confirmation mail action must enter approvals lane');
ok(model.laneStates.TODAY==='VERIFIED','today source state must remain VERIFIED');

const unavailable=Core.build({
  today:'2026-10-03',
  sources:{agenda:source('UNAVAILABLE'),evolution:source('UNAVAILABLE'),mailactions:source('UNAVAILABLE')}
});
ok(unavailable.lanes.TODAY.length===0,'unavailable agenda must not generate fake today items');
ok(unavailable.lanes.PRIORITY.length===0,'unavailable evolution must not generate fake priority items');
ok(unavailable.laneStates.TODAY==='UNAVAILABLE','unavailable source must remain explicit');
ok(unavailable.laneStates.PRIORITY==='UNAVAILABLE','unavailable evolution must remain explicit');

console.log('SCD CORE CONTROL ROOM CONTRACT PASS',model.totals);
