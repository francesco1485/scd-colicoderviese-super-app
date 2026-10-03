(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.SCDOneProfile=api;
})(typeof globalThis==='object'?globalThis:null,function(){
  'use strict';

  function text(value){return value==null?'':String(value).trim()}
  function bool(value){return value===true}

  function completeness(twin={}){
    const fields=[text(twin.name),text(twin.role),text(twin.kit),text(twin.tone),text(twin.hair)];
    const complete=fields.filter(Boolean).length;
    return {complete,total:fields.length,percent:Math.round((complete/fields.length)*100)};
  }

  function nextTeamActivity(model){
    if(!model)return null;
    return model.nextMatch||model.next||null;
  }

  function build(input={}){
    const twin=input.twin||{};
    const followedTeam=text(input.followedTeam);
    const teamModel=input.teamModel||null;
    const next=nextTeamActivity(teamModel);
    const calendarSourceState=text(input.calendarSourceState||'UNVERIFIED').toUpperCase();
    const appMode=text(input.appMode||'WEB').toUpperCase();
    const privateVerified=bool(input.privateVerified);
    const c=completeness(twin);

    return {
      identity:{
        name:text(twin.name)||'Il mio Twin',
        role:text(twin.role)||'Profilo locale',
        completeness:c
      },
      team:{
        name:followedTeam||'Nessuna squadra seguita',
        next:next?{
          id:text(next.id),
          date:text(next.date),
          time:text(next.time),
          kind:text(next.kind),
          opponent:text(next.opponent),
          venue:text(next.venue),
          source:text(next.source)
        }:null,
        sourceState:calendarSourceState
      },
      app:{
        mode:appMode,
        installed:appMode==='STANDALONE',
        installable:appMode==='INSTALLABLE'
      },
      access:{
        state:privateVerified?'VERIFIED':'PUBLIC',
        label:privateVerified?'Area riservata verificata':'Esperienza pubblica'
      }
    };
  }

  return {build,completeness,nextTeamActivity};
});
