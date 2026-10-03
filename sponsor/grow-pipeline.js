(function(root){
  'use strict';

  const STAGES=['RESEARCH','VERIFY','QUALIFY','CONNECT','PROPOSE','ACTIVATE','PROVE','REPORT','RENEW','EXPAND'];

  function text(v){return v==null?'':String(v).trim()}
  function upper(v){return text(v).toUpperCase()}
  function isoDate(v){
    const raw=text(v);if(!raw)return '';
    const m=raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if(m)return m[1]+'-'+m[2]+'-'+m[3];
    const d=new Date(v);return Number.isFinite(d.getTime())?d.toISOString().slice(0,10):'';
  }
  function blocked(row){
    return /SOSPESO|NO_CONTACT/.test(upper(row&&row.contactPolicy));
  }
  function classify(status){
    const s=upper(status);
    if(!s)return {stage:'VERIFY',basis:'STATUS_MISSING',verified:false};
    if(/RINNOV|RENEW/.test(s))return {stage:'RENEW',basis:'RELATIONSHIP_STATUS',verified:true};
    if(/ESPANS|UPSELL|CROSS.?SELL|AMPLI/.test(s))return {stage:'EXPAND',basis:'RELATIONSHIP_STATUS',verified:true};
    if(/REPORT|RENDICONT/.test(s))return {stage:'REPORT',basis:'RELATIONSHIP_STATUS',verified:true};
    if(/PROOF|EVIDENZ|EROGAT|CONSEGN/.test(s))return {stage:'PROVE',basis:'RELATIONSHIP_STATUS',verified:true};
    if(/ATTIV|FIRMAT|CONTRATT|ACCORD|PARTNER|SPONSOR/.test(s))return {stage:'ACTIVATE',basis:'RELATIONSHIP_STATUS',verified:true};
    if(/PROPOST|OFFERT|PREVENTIV|NEGOZI/.test(s))return {stage:'PROPOSE',basis:'RELATIONSHIP_STATUS',verified:true};
    if(/CONTATT|INCONTRO|CALL|RELAZIONE APERTA/.test(s))return {stage:'CONNECT',basis:'RELATIONSHIP_STATUS',verified:true};
    if(/QUALIFIC|INTERESSE|VALUTAZ/.test(s))return {stage:'QUALIFY',basis:'RELATIONSHIP_STATUS',verified:true};
    if(/VERIFIC|DA VERIFICARE/.test(s))return {stage:'VERIFY',basis:'RELATIONSHIP_STATUS',verified:true};
    if(/PROSPECT|SCOUT|RICERCA|RADAR|DA CONTATTARE|LEAD/.test(s))return {stage:'RESEARCH',basis:'RELATIONSHIP_STATUS',verified:true};
    return {stage:'VERIFY',basis:'UNMAPPED_RELATIONSHIP_STATUS',verified:false};
  }
  function normalize(row,index){
    const classification=classify(row&&row.relationshipStatus);
    return {
      id:text(row&&row.id)||'grow-'+String(index+1),
      name:text(row&&row.name)||'Profilo senza nome',
      type:text(row&&row.type),
      category:text(row&&row.category),
      area:text(row&&row.area),
      sourceStatus:text(row&&row.relationshipStatus),
      owner:text(row&&row.owner),
      nextAction:text(row&&row.nextAction),
      nextDeadline:text(row&&row.nextDeadline),
      lastContact:text(row&&row.lastContact),
      contactPolicy:text(row&&row.contactPolicy),
      opportunityCount:Number(row&&row.opportunities)||0,
      openTasks:Number(row&&row.openTasks)||0,
      touchpoints:Number(row&&row.touchpoints)||0,
      stage:classification.stage,
      stageBasis:classification.basis,
      stageVerified:classification.verified,
      blocked:blocked(row),
      source:'CRM_CANONICO',
      sourceState:'VERIFIED'
    };
  }
  function sortQueue(a,b){
    const ad=isoDate(a.nextDeadline),bd=isoDate(b.nextDeadline);
    if(ad&&bd&&ad!==bd)return ad.localeCompare(bd);
    if(ad&&!bd)return -1;
    if(!ad&&bd)return 1;
    if(Boolean(a.nextAction)!==Boolean(b.nextAction))return a.nextAction?-1:1;
    return a.name.localeCompare(b.name,'it');
  }
  function build(rows=[],options={}){
    const sourceState=upper(options.sourceState||'UNVERIFIED');
    if(sourceState!=='VERIFIED'){
      return {
        sourceState,
        generatedAt:text(options.generatedAt),
        stages:Object.fromEntries(STAGES.map(x=>[x,[]])),
        counts:Object.fromEntries(STAGES.map(x=>[x,null])),
        queue:[],
        needsVerification:[],
        blocked:[]
      };
    }
    const normalized=(Array.isArray(rows)?rows:[]).map(normalize);
    const stages=Object.fromEntries(STAGES.map(x=>[x,[]]));
    normalized.forEach(item=>stages[item.stage].push(item));
    Object.values(stages).forEach(items=>items.sort(sortQueue));
    const queue=normalized.filter(item=>item.nextAction||item.nextDeadline||item.openTasks>0).sort(sortQueue);
    return {
      sourceState:'VERIFIED',
      generatedAt:text(options.generatedAt),
      stages,
      counts:Object.fromEntries(STAGES.map(x=>[x,stages[x].length])),
      queue,
      needsVerification:normalized.filter(item=>!item.stageVerified),
      blocked:normalized.filter(item=>item.blocked)
    };
  }

  const api={STAGES,build,classify,isoDate};
  root.ScdGrowPipeline=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
