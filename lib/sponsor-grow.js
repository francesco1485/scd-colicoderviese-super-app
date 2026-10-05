(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.SponsorGrow=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const STAGES=[
    'DISCOVER','VERIFY','QUALIFY','CONTACT','MEETING','PROPOSAL','NEGOTIATION',
    'WON','LOST','ACTIVATE','PROVE','RENEW','EXPAND'
  ];
  const PROOF_LOCATORS=[
    'PROOF_URL','EVIDENCE_URL','LINK_DOCUMENTO','URL_DOCUMENTO','DRIVE_FILE_ID',
    'DOCUMENT_ID','ID_DOCUMENTO'
  ];
  const first=(record,keys)=>keys.map(key=>record?.[key]).find(value=>value!==undefined&&value!==null&&String(value).trim()!=='');
  const normalizeName=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const isProspect=row=>/PROSPECT|LEAD/i.test([row?.type,row?.category,row?.relationshipStatus,row?.tags].join(' '));
  const canonicalStage=row=>{
    const raw=first(row,['pipelineStage','PIPELINE_STAGE','FASE_PIPELINE']);
    const value=String(raw||'').trim().toUpperCase();
    return STAGES.includes(value)?value:'UNMAPPED';
  };
  function deduplicateRows(rows=[]){
    const byId=new Map();
    let missingId=0,validRows=0;
    rows.forEach(row=>{
      if(!row||typeof row!=='object')return;
      validRows++;
      const id=String(row.id||row.STAKEHOLDER_ID||'').trim();
      if(!id){missingId++;return}
      if(!byId.has(id))byId.set(id,row);
    });
    const unique=[...byId.values()];
    const prospectNames=new Map();
    unique.filter(isProspect).forEach(row=>{
      const key=normalizeName(row.name||row.NOME);
      if(!key)return;
      if(!prospectNames.has(key))prospectNames.set(key,[]);
      prospectNames.get(key).push(row);
    });
    const possibleDuplicates=[...prospectNames.entries()]
      .filter(([,group])=>group.length>1)
      .map(([normalizedName,group])=>({normalizedName,ids:group.map(row=>String(row.id||row.STAKEHOLDER_ID)),records:group}));
    return {rows:unique,missingId,duplicateIds:validRows-missingId-unique.length,possibleDuplicates};
  }
  function pipelineProjection(rows=[]){
    const unique=deduplicateRows(rows);
    const counts=Object.fromEntries(STAGES.map(stage=>[stage,0]));
    let unmapped=0;
    const unmappedRecords=[];
    unique.rows.forEach(row=>{
      const stage=canonicalStage(row);
      if(stage==='UNMAPPED')unmapped++;
      else counts[stage]++;
      if(stage==='UNMAPPED')unmappedRecords.push({
        id:String(row.id||row.STAKEHOLDER_ID),
        name:String(row.name||row.NOME||'Profilo senza nome'),
        relationshipStatus:String(row.relationshipStatus||row.STATO_RELAZIONE||'')
      });
    });
    return {stages:STAGES.map(id=>({id,count:counts[id]})),unmapped,unmappedRecords,records:unique.rows};
  }
  function dateState(value,now=new Date()){
    if(!value)return 'NO_DEADLINE';
    const date=new Date(value);
    if(Number.isNaN(date.getTime()))return 'UNVERIFIED_DATE';
    const due=new Date(date.getFullYear(),date.getMonth(),date.getDate()).getTime();
    const today=new Date(now.getFullYear(),now.getMonth(),now.getDate()).getTime();
    if(due<today)return 'OVERDUE';
    if(due===today)return 'DUE_TODAY';
    return 'UPCOMING';
  }
  function followUpQueue(rows=[],now=new Date()){
    const unique=deduplicateRows(rows);
    return unique.rows
      .map(row=>({
        id:String(row.id||row.STAKEHOLDER_ID),
        name:String(row.name||row.NOME||'Profilo senza nome'),
        relationshipStatus:String(row.relationshipStatus||row.STATO_RELAZIONE||''),
        action:String(row.nextAction||''),
        suggestion:String(row.contactPolicy&&/SOSPESO|NO_CONTACT/i.test(row.contactPolicy)
          ?'Verifica la policy prima di qualsiasi azione esterna.'
          :'Verifica la relazione e definisci una prossima azione nel CRM.'),
        deadline:String(row.nextDeadline||''),
        deadlineState:dateState(row.nextDeadline,now),
        owner:String(row.owner||row.OWNER||''),
        contactPolicy:String(row.contactPolicy||row.CONTACT_POLICY||'')
      }))
      .sort((a,b)=>{
        const aDate=Date.parse(a.deadline),bDate=Date.parse(b.deadline);
        if(Number.isFinite(aDate)&&Number.isFinite(bDate))return aDate-bDate;
        if(Number.isFinite(aDate))return -1;
        if(Number.isFinite(bDate))return 1;
        return a.name.localeCompare(b.name);
      });
  }
  function activationProofs(touchpoints=[]){
    return (Array.isArray(touchpoints)?touchpoints:[]).flatMap(item=>{
      const kind=String(first(item,['TIPO','TIPO_ATTIVITA','CANALE','OGGETTO'])||'').toUpperCase();
      if(!/ATTIVAZION|ACTIVATION|PROOF|VISIBILIT/.test(kind))return [];
      const locator=first(item,PROOF_LOCATORS);
      if(!locator)return [];
      return [{
        kind:String(first(item,['TIPO','TIPO_ATTIVITA','CANALE','OGGETTO'])||'Prova di attivazione'),
        timestamp:String(first(item,['TIMESTAMP','DATA','CREATED_AT'])||''),
        actor:String(first(item,['ACTOR','ATTORE','SISTEMA'])||''),
        document:String(locator),
        documentUrl:String(first(item,['PROOF_URL','EVIDENCE_URL','LINK_DOCUMENTO','URL_DOCUMENTO'])||'')
      }];
    });
  }
  function safeEvidenceUrl(value){
    try{
      const url=new URL(String(value||''));
      return url.protocol==='https:'||url.protocol==='http:'?url.href:'';
    }catch{return ''}
  }
  return {STAGES,deduplicateRows,pipelineProjection,followUpQueue,activationProofs,safeEvidenceUrl};
});
