/* SCD GROW R60: writes a draft to the EXISTING COMMERCIALE_OPPORTUNITA
 * master. To be installed on the existing R20 Apps Script runtime only after
 * authorized staging review. Never sends mail, creates a contract or books income.
 */
function r60SafeSheetText_(value,limit){
  var text=String(value==null?'':value).trim().slice(0,limit||500);
  return /^[=+\-@\t\r]/.test(text)?"'"+text:text;
}
function r60CreateSponsorProposalDraft_(token,payload){
  payload=payload||{};
  if(payload.confirm!==true)throw new Error('CONFIRM_REQUIRED');
  if(payload.associationReviewed!==true)throw new Error('REVIEW_REQUIRED');
  // Feature OFF by default. An explicit staging target is mandatory for writes.
  if(typeof PropertiesService==='undefined'||typeof PropertiesService.getScriptProperties!=='function'){
    throw new Error('R60_WRITE_DISABLED');
  }
  var props=PropertiesService.getScriptProperties();
  if(String(props.getProperty('SCD_R60_DRAFT_WRITE_ENABLED')||'').trim().toLowerCase()!=='true'){
    throw new Error('R60_WRITE_DISABLED');
  }
  if(!String(props.getProperty('SCD_OPERATIVO_PILOTA_ID')||'').trim()){
    throw new Error('CANONICAL_TARGET_NOT_CONFIGURED');
  }
  if(typeof r216SponsorLeadInbox_!=='function'||typeof r216CrmActor_!=='function'){
    throw new Error('R20_SPONSOR_MODULE_NOT_INSTALLED');
  }
  // Reuse current R20 sponsor role/scope gate; never accept a role from the client.
  r216SponsorLeadInbox_(token,{limit:1});
  var actor=r216CrmActor_(token);
  var requestId=String(payload.requestId||'').trim();
  var stakeholderId=String(payload.stakeholderId||'').trim();
  if(!/^[A-Z0-9_-]{3,128}$/i.test(requestId)||!/^[A-Z0-9_-]{3,128}$/i.test(stakeholderId)){
    throw new Error('INVALID_SOURCE_IDS');
  }
  var asset=r60SafeSheetText_(payload.asset,280);
  var objective=r60SafeSheetText_(payload.objective,600);
  if(!asset)throw new Error('ASSET_REQUIRED');
  if(typeof LockService==='undefined'||typeof LockService.getScriptLock!=='function'){
    throw new Error('LOCK_UNAVAILABLE');
  }
  var lock=LockService.getScriptLock();
  if(!lock||typeof lock.waitLock!=='function'||typeof lock.releaseLock!=='function'){
    throw new Error('LOCK_UNAVAILABLE');
  }
  lock.waitLock(20000);
  try{
    var requests=r216CrmTable_('APP PUBLIC REQUESTS').filter(function(row){
      return String(row.REQUEST_ID||'').trim()===requestId;
    });
    if(requests.length!==1||String(requests[0].TYPE||'').trim().toUpperCase()!=='SPONSOR'){
      throw new Error('LEAD_NOT_FOUND');
    }
    var lead=requests[0];
    if(String(lead.CONSENSO_PRIVACY||'').trim().toUpperCase()!=='SI'){
      throw new Error('CONSENT_REQUIRED');
    }
    var stakeholders=r216CrmTable_('STAKEHOLDERS_MASTER');
    var selected=stakeholders.filter(function(row){
      return String(row.STAKEHOLDER_ID||'').trim()===stakeholderId;
    });
    if(selected.length!==1)throw new Error('STAKEHOLDER_NOT_FOUND');
    var stakeholder=selected[0];
    var email=String(lead.EMAIL||'').trim().toLowerCase();
    if(!email||email!==String(stakeholder.EMAIL||'').trim().toLowerCase()){
      throw new Error('EMAIL_MISMATCH');
    }
    var similar=stakeholders.filter(function(row){
      return String(row.STAKEHOLDER_ID||'').trim()&&
        String(row.EMAIL||'').trim().toLowerCase()===email;
    });
    if(similar.length!==1)throw new Error('AMBIGUOUS_CRM_LINK');
    if(/SOSPESO|NO_CONTACT/i.test(String(stakeholder.CONTACT_POLICY||''))){
      throw new Error('CONTACT_BLOCKED');
    }
    var corr='FLOW-GROW-'+requestId;
    var existing=r216CrmTable_('COMMERCIALE_OPPORTUNITA').filter(function(row){
      return String(row.CORRELATION_ID||'').trim()===corr;
    });
    if(existing.length>1)throw new Error('SOURCE_COLLISION');
    if(existing.length===1){
      if(String(existing[0].PARTNER||'').trim().toLowerCase()!==String(stakeholder.NOME||'').trim().toLowerCase()){
        throw new Error('SOURCE_COLLISION');
      }
      return {
        persisted:true,created:false,opportunityId:String(existing[0].OPPORTUNITY_ID||''),
        requestId:requestId,stakeholderId:stakeholderId,
        stage:String(existing[0].STAGE||''),
        deliveryState:'NOT_SENT',contractCreated:false,correlationId:corr
      };
    }
    var now=new Date();
    var opportunityId='OPP-GROW-'+Utilities.getUuid().slice(0,8).toUpperCase();
    var entry={
      OPPORTUNITY_ID:opportunityId,
      PARTNER:r60SafeSheetText_(stakeholder.NOME,180),
      TIPO:'PARTNERSHIP',
      ORIGINE:'SPONSOR',
      OFFERTA:asset,
      VALORE_POTENZIALE:'',
      PROBABILITA:'',
      VALORE_PONDERATO:'',
      STAGE:'DA SVILUPPARE',
      RESPONSABILE:String(actor.email||''),
      PROSSIMA_AZIONE:'Revisione umana della bozza',
      PROSSIMA_SCADENZA:'',
      DATA_APERTURA:now,
      DATA_CHIUSURA:'',
      STATO:'APERTO',
      CONTRACT_ID:'',
      NOTE:'Fonte richiesta '+requestId+'; obiettivo: '+objective+'; nessun invio o contratto.',
      CORRELATION_ID:corr
    };
    // The audit is persisted before the business record. An audit failure
    // prevents a write; a retry is idempotent via canonical correlation ID.
    r216AppendByHeader_('APP AUDIT',{
      TIMESTAMP:now,EMAIL:String(actor.email||''),
      ACTION:'SPONSOR_DRAFT_CREATE',RESOURCE:'SCD_GROW_OPPORTUNITY',
      RECORD_ID:opportunityId,
      DETAILS:JSON.stringify({requestId:requestId,stakeholderId:stakeholderId,correlationId:corr,status:'REQUESTED'})
    });
    r216AppendByHeader_('COMMERCIALE_OPPORTUNITA',entry);
    return {
      persisted:true,created:true,opportunityId:opportunityId,requestId:requestId,
      stakeholderId:stakeholderId,stage:'DA SVILUPPARE',
      deliveryState:'NOT_SENT',contractCreated:false,correlationId:corr
    };
  }finally{
    lock.releaseLock();
  }
}
