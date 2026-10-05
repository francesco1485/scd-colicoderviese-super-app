(function(root){
  'use strict';

  const STAGES=['RESEARCH','VERIFY','QUALIFY','CONNECT','PROPOSE','ACTIVATE','PROVE','REPORT','RENEW','EXPAND'];
  const PROOF_LOCATORS=['PROOF_URL','EVIDENCE_URL','LINK_DOCUMENTO','URL_DOCUMENTO','DRIVE_FILE_ID','DOCUMENT_ID','ID_DOCUMENTO'];

  function text(v){return v==null?'':String(v).trim()}
  function first(row,keys){for(const key of keys){const value=row&&row[key];if(value!==undefined&&value!==null&&text(value)!=='')return value}return ''}
  function normalizeName(value){return text(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()}
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
  function diagnose(rows=[]){
    const input=Array.isArray(rows)?rows.filter(row=>row&&typeof row==='object'):[];
    const ids=new Map(),duplicateIds=[],missingId=[];
    const prospects=new Map();
    input.forEach((row,index)=>{
      const id=text(row.id||row.STAKEHOLDER_ID);
      if(!id)missingId.push({index,name:text(row.name||row.NOME)||'Profilo senza nome'});
      else if(ids.has(id))duplicateIds.push({id,firstIndex:ids.get(id),duplicateIndex:index});
      else ids.set(id,index);
      const prospectLike=/PROSPECT|LEAD/i.test([row.type,row.category,row.relationshipStatus,row.tags].join(' '));
      if(prospectLike){
        const key=normalizeName(row.name||row.NOME);
        if(key){
          if(!prospects.has(key))prospects.set(key,[]);
          prospects.get(key).push({id:id||'',name:text(row.name||row.NOME)||'Profilo senza nome'});
        }
      }
    });
    const possibleDuplicateProspects=[...prospects.entries()]
      .filter(([,items])=>items.length>1)
      .map(([normalizedName,items])=>({normalizedName,items}));
    return {records:input.length,missingId,duplicateIds,possibleDuplicateProspects};
  }
  function safeEvidenceUrl(value){
    try{
      const url=new URL(text(value));
      return url.protocol==='https:'||url.protocol==='http:'?url.href:'';
    }catch{return ''}
  }
  function activationProofs(touchpoints=[]){
    return (Array.isArray(touchpoints)?touchpoints:[]).flatMap(item=>{
      const kind=text(first(item,['TIPO','TIPO_ATTIVITA','CANALE','OGGETTO'])).toUpperCase();
      if(!/ATTIVAZION|ACTIVATION|PROOF|VISIBILIT/.test(kind))return [];
      const locator=first(item,PROOF_LOCATORS);
      if(!locator)return [];
      const document=text(locator);
      return [{
        kind:text(first(item,['TIPO','TIPO_ATTIVITA','CANALE','OGGETTO']))||'Prova di attivazione',
        timestamp:text(first(item,['TIMESTAMP','DATA','CREATED_AT'])),
        actor:text(first(item,['ACTOR','ATTORE','SISTEMA'])),
        source:text(first(item,['SOURCE','FONTE']))||'R20 · TOUCHPOINTS_MASTER',
        document,
        documentUrl:safeEvidenceUrl(document)
      }];
    });
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
        blocked:[],
        diagnostics:diagnose(rows)
      };
    }
    const sourceRows=Array.isArray(rows)?rows:[];
    const diagnostics=diagnose(sourceRows);
    const normalized=sourceRows.map(normalize);
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
      blocked:normalized.filter(item=>item.blocked),
      diagnostics
    };
  }

  const api={STAGES,build,classify,isoDate,diagnose,activationProofs,safeEvidenceUrl};
  root.ScdGrowPipeline=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
