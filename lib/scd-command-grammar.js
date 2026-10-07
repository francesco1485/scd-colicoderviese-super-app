'use strict';

const contract=require('../config/scd-command-grammar.v1.json');
const registry=Object.freeze((contract.commands||[]).map(command=>Object.freeze({...command})));

function identityRoles(identityContext={}){
  const values=[
    ...(Array.isArray(identityContext.roles)?identityContext.roles:[]),
    ...(Array.isArray(identityContext.role_scope)?identityContext.role_scope:[]),
    identityContext.role,
    identityContext.coreRole,
    identityContext.user?.role,
    identityContext.user?.coreRole,
    identityContext.user?.type
  ].filter(Boolean);
  const normalized=values.map(value=>String(value).trim().toUpperCase());
  const aliases=[];
  for(const role of normalized){
    if(role==='ADMIN'||role==='PRESIDENTE'||role.includes('DIRETTORE')||role.includes('DIREZIONE'))aliases.push('DIRECTION');
    if(role.includes('SEGRETAR'))aliases.push('SEGRETERIA');
  }
  const directionPermission=identityContext.permissions?.direction===true||identityContext.user?.permissions?.direction===true;
  if(directionPermission)aliases.push('DIRECTION');
  return [...new Set([...normalized,...aliases])];
}

function roleAllowed(command,identityContext){
  const roles=identityRoles(identityContext);
  const allowed=(command.allowed_roles||[]).map(value=>String(value).toUpperCase());
  return roles.some(role=>allowed.includes(role));
}

function resolveCommand(trigger,identityContext={}){
  const normalized=String(trigger||'').trim().toLowerCase();
  const command=registry.find(item=>String(item.trigger).toLowerCase()===normalized);
  if(!command)return {ok:false,command:null,reason:'UNKNOWN_COMMAND'};
  if(!roleAllowed(command,identityContext))return {ok:false,command:null,reason:'ROLE_SCOPE_DENIED'};
  if(command.implementation_state!=='IMPLEMENTED')return {ok:false,command:null,reason:command.implementation_state};
  return {ok:true,command,reason:null};
}

function listImplementedCommands(identityContext={}){
  return registry.filter(command=>command.implementation_state==='IMPLEMENTED'&&roleAllowed(command,identityContext));
}

module.exports={contract,registry,identityRoles,resolveCommand,listImplementedCommands};
