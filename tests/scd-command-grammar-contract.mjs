import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require=createRequire(import.meta.url);
const { registry, resolveCommand, listImplementedCommands, validateCommandInput }=require('../lib/scd-command-grammar.js');

function run(name,fn){
  try{fn();console.log('PASS',name)}
  catch(error){console.error('FAIL',name,error);process.exitCode=1}
}

const required=['command_id','trigger','intent','allowed_roles','input_schema','source_requirements','output_types','human_gate','audit_event','fail_closed_state','implementation_state'];

run('every_command_has_complete_contract',()=>{
  assert.ok(Array.isArray(registry));
  assert.ok(registry.length>=7);
  for(const command of registry){
    for(const key of required)assert.ok(Object.hasOwn(command,key),command.trigger+' missing '+key);
  }
});

run('triggers_are_unique_and_slash_prefixed',()=>{
  const triggers=registry.map(x=>x.trigger);
  assert.equal(new Set(triggers).size,triggers.length);
  assert.ok(triggers.every(x=>x.startsWith('/')));
});

run('today_and_attention_are_implemented_for_authorized_core_roles',()=>{
  for(const trigger of ['/today','/attention']){
    const out=resolveCommand(trigger,{roles:['DIRECTION']});
    assert.equal(out.ok,true);
    assert.equal(out.command.implementation_state,'IMPLEMENTED');
  }
});

run('trusted_direction_aliases_are_normalized',()=>{
  for(const context of [
    {roles:['DIRETTORE GENERALE']},
    {roles:['PRESIDENTE']},
    {permissions:{direction:true}}
  ]){
    const out=resolveCommand('/today',context);
    assert.equal(out.ok,true,JSON.stringify(context));
  }
});

run('verified_staff_flag_maps_to_authorized_staff',()=>{
  const out=resolveCommand('/today',{user:{role:'STAFF',staff:true}});
  assert.equal(out.ok,true);
  assert.equal(out.command.trigger,'/today');
});

run('command_input_schema_rejects_unknown_properties',()=>{
  const command=registry.find(x=>x.trigger==='/today');
  assert.equal(validateCommandInput(command,{}).ok,true);
  const invalid=validateCommandInput(command,{action:'DELETE'});
  assert.equal(invalid.ok,false);
  assert.equal(invalid.reason,'INVALID_COMMAND_INPUT');
});

run('unauthorized_role_returns_role_scope_denied',()=>{
  const out=resolveCommand('/today',{roles:['PUBLIC']});
  assert.equal(out.ok,false);
  assert.equal(out.reason,'ROLE_SCOPE_DENIED');
});

run('unknown_trigger_returns_unknown_command',()=>{
  const out=resolveCommand('/magia',{roles:['DIRECTION']});
  assert.equal(out.ok,false);
  assert.equal(out.reason,'UNKNOWN_COMMAND');
});

run('unimplemented_command_is_not_advertised_as_available',()=>{
  const visible=listImplementedCommands({roles:['DIRECTION']}).map(x=>x.trigger);
  assert.deepEqual(visible.sort(),['/attention','/today']);
  for(const trigger of ['/brand','/layers','/people','/calendar','/deadlines']){
    const out=resolveCommand(trigger,{roles:['DIRECTION']});
    assert.equal(out.ok,false);
    assert.ok(['CONTRACT_DEFINED','BLOCKED_SOURCE'].includes(out.reason));
  }
});

run('registry_has_the_required_p0_commands',()=>{
  const triggers=new Set(registry.map(x=>x.trigger));
  for(const trigger of ['/today','/attention','/calendar','/people','/deadlines','/brand','/layers'])assert.ok(triggers.has(trigger));
});

if(process.exitCode)process.exit(process.exitCode);
console.log('SCD COMMAND GRAMMAR CONTRACT PASS');
