(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.SCDSeasonStatus=api;
})(typeof globalThis==='object'?globalThis:null,()=>{
  'use strict';
  const WITHDRAWN_TEAM_SEASON='2026/27';

  function normalizeTeamLabel(value){
    return String(value||'')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g,'')
      .toLowerCase()
      .replace(/\b20\d{2}\s*[/–-]\s*\d{2,4}\b/g,' ')
      .replace(/[^a-z0-9]+/g,' ')
      .trim();
  }

  function isWithdrawnSCDTeam(value){
    return /^(?:u\s*18|under\s*18)(?:\s+elite)?$/.test(normalizeTeamLabel(value));
  }

  function isWithdrawnSCDTeamRecord(record){
    if(!record||typeof record!=='object')return false;
    return ['team','teamName','squadra','category','categoria','ageGroup','annata']
      .some(key=>isWithdrawnSCDTeam(record[key]));
  }

  return Object.freeze({
    withdrawnTeamSeason:WITHDRAWN_TEAM_SEASON,
    isWithdrawnSCDTeam,
    isWithdrawnSCDTeamRecord
  });
});
