import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require=createRequire(import.meta.url);
const { buildTodayAttentionProjection, rankAttention, sourceStateFromBrain }=require('../lib/scd-today-attention.js');

const now='2026-10-07T14:00:00.000Z';

function brain({items=[],channels={},health=null}={}){
  const resolvedChannels=Object.keys(channels).length?channels:{
    dashboard:{state:'VERIFIED'},
    agenda:{state:'VERIFIED'}
  };
  return {
    generatedAt:now,
    actionQueue:items,
    channels:resolvedChannels,
    health:health||{
      state:Object.values(resolvedChannels).some(x=>x.state!=='VERIFIED')?'DEGRADED':'VERIFIED',
      verifiedChannels:Object.values(resolvedChannels).filter(x=>x.state==='VERIFIED').length,
      totalChannels:Object.keys(resolvedChannels).length,
      unavailable:Object.entries(resolvedChannels).filter(([,x])=>x.state!=='VERIFIED').map(([id,x])=>({id,error:x.error||'UNAVAILABLE'}))
    },
    provenance:{authority:'R20',orchestration:'SCD_COMMAND_R22'}
  };
}

const item=(overrides={})=>({
  recordId:'A-1',
  title:'Documento federale da verificare',
  status:'APERTO',
  priority:'ALTA',
  explicitPriorityScore:3,
  due:'2026-10-08T12:00:00.000Z',
  owner:'Segreteria',
  source:'SCD_DRIVE',
  verificationState:'VERIFIED',
  nextAction:'Apri il documento verificato',
  actionMode:'READ',
  evidence:{channel:'dashboard',recordId:'A-1',source:'SCD_DRIVE'},
  ...overrides
});

function run(name,fn){
  try{fn();console.log('PASS',name)}
  catch(error){console.error('FAIL',name,error);process.exitCode=1}
}

run('verified_priority_becomes_single_primary_attention',()=>{
  const projection=buildTodayAttentionProjection({brain:brain({items:[item()]}),roleScope:['DIRECTION'],commandTrigger:'/today',now});
  assert.equal(projection.source_state,'VERIFIED');
  assert.equal(projection.primary_attention.id,'A-1');
  assert.equal(projection.primary_attention.title,'Documento federale da verificare');
  assert.equal(projection.primary_attention.source,'SCD_DRIVE');
  assert.equal(projection.primary_attention.verification_state,'VERIFIED');
});

run('ranking_is_deterministic',()=>{
  const ranked=rankAttention([
    item({recordId:'C',explicitPriorityScore:3,due:'2026-10-10'}),
    item({recordId:'B',explicitPriorityScore:3,due:'2026-10-08'}),
    item({recordId:'A',explicitPriorityScore:3,due:'2026-10-08'}),
    item({recordId:'D',explicitPriorityScore:2,due:'2026-10-01'})
  ]);
  assert.deepEqual(ranked.map(x=>x.recordId),['A','B','C','D']);
});

run('no_source_creates_useful_fail_closed_projection',()=>{
  const b=brain({items:[],channels:{dashboard:{state:'UNAVAILABLE',error:'HTTP_503'},agenda:{state:'UNAVAILABLE',error:'HTTP_503'}}});
  const projection=buildTodayAttentionProjection({brain:b,roleScope:['DIRECTION'],commandTrigger:'/today',now});
  assert.equal(projection.source_state,'UNVERIFIED');
  assert.equal(projection.primary_attention,null);
  assert.ok(projection.fail_closed);
  assert.match(projection.fail_closed.message,/verific/i);
  assert.ok(projection.fail_closed.next_action);
  assert.ok(projection.coverage.missing.length>=1);
});

run('partial_sources_keep_verified_primary',()=>{
  const b=brain({
    items:[item()],
    channels:{dashboard:{state:'VERIFIED'},agenda:{state:'UNAVAILABLE',error:'HTTP_503'}}
  });
  const projection=buildTodayAttentionProjection({brain:b,roleScope:['DIRECTION'],commandTrigger:'/attention',now});
  assert.equal(projection.source_state,'PARTIAL');
  assert.equal(projection.primary_attention.id,'A-1');
  assert.deepEqual(projection.coverage.missing.map(x=>x.id),['agenda']);
});

run('changed_and_next_are_capped_at_three',()=>{
  const rows=Array.from({length:8},(_,i)=>item({recordId:'A-'+i,title:'Elemento '+i,due:'2026-10-'+String(8+i).padStart(2,'0')}));
  const projection=buildTodayAttentionProjection({brain:brain({items:rows}),roleScope:['DIRECTION'],commandTrigger:'/today',now});
  assert.ok(projection.changed.length<=3);
  assert.ok(projection.next.length<=3);
});

run('withdrawn_u18_is_filtered_before_ranking',()=>{
  const projection=buildTodayAttentionProjection({
    brain:brain({items:[
      item({recordId:'U18',team:'U18',category:'Under 18',title:'Elemento U18',explicitPriorityScore:4}),
      item({recordId:'ACTIVE',team:'U16',category:'Under 16',title:'Elemento U16',explicitPriorityScore:3})
    ]}),
    roleScope:['DIRECTION'],commandTrigger:'/today',now
  });
  assert.equal(projection.primary_attention.id,'ACTIVE');
  assert.ok(!JSON.stringify(projection).includes('Elemento U18'));
});

run('no_synthetic_item_is_created',()=>{
  const projection=buildTodayAttentionProjection({brain:brain({items:[]}),roleScope:['DIRECTION'],commandTrigger:'/today',now});
  assert.equal(projection.primary_attention,null);
  assert.deepEqual(projection.changed,[]);
  assert.deepEqual(projection.next,[]);
});

run('next_action_mode_is_read_or_human_gate_only',()=>{
  const projection=buildTodayAttentionProjection({
    brain:brain({items:[item({actionMode:'WRITE',nextAction:'Cancella record'})]}),
    roleScope:['DIRECTION'],commandTrigger:'/attention',now
  });
  assert.ok(['READ','HUMAN_GATE'].includes(projection.primary_attention.next_action.mode));
  assert.notEqual(projection.primary_attention.next_action.mode,'WRITE');
});

run('sourceStateFromBrain reports verified partial unverified',()=>{
  assert.equal(sourceStateFromBrain(brain({channels:{a:{state:'VERIFIED'}}})),'VERIFIED');
  assert.equal(sourceStateFromBrain(brain({channels:{a:{state:'VERIFIED'},b:{state:'UNAVAILABLE'}}})),'PARTIAL');
  assert.equal(sourceStateFromBrain(brain({channels:{a:{state:'UNAVAILABLE'}}})),'UNVERIFIED');
});

if(process.exitCode)process.exit(process.exitCode);
console.log('SCD TODAY ATTENTION CONTRACT PASS');
