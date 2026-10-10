'use strict';

const clean=value=>String(value??'').trim();
const emailKey=value=>clean(value).toLowerCase();
const blocked=value=>/SOSPESO|NO_CONTACT/i.test(clean(value));

function projectSponsorLeadInbox(requests,stakeholders){
  if(!Array.isArray(requests))return [];
  const peers=Array.isArray(stakeholders)?stakeholders:[];
  const seen=new Set();
  const rows=[];
  for(const request of requests){
    if(!request||typeof request!=='object'||Array.isArray(request))continue;
    if(clean(request.TYPE).toUpperCase()!=='SPONSOR')continue;
    const requestId=clean(request.REQUEST_ID);
    if(!/^[a-z0-9_-]{3,128}$/i.test(requestId)||seen.has(requestId))continue;
    seen.add(requestId);
    const email=emailKey(request.EMAIL);
    const candidates=peers.filter(row=>row&&typeof row==='object'&&!Array.isArray(row)&&clean(row.STAKEHOLDER_ID)&&email&&emailKey(row.EMAIL)===email);
    const permitted=candidates.filter(row=>!blocked(row.CONTACT_POLICY));
    const blockedCandidate=candidates.length>0&&permitted.length===0;
    const candidateStakeholderIds=[...new Set(permitted.map(row=>clean(row.STAKEHOLDER_ID)))];
    const topic=clean(request.OGGETTO);
    const parts=topic.split(' · ');
    const companyHint=parts.length>=3&&parts[0]==='PARTNERSHIP'?clean(parts[1]):'';
    rows.push({
      requestId,createdAt:clean(request.CREATED_AT),status:clean(request.STATUS)||'DA_VERIFICARE',
      contactName:clean(request.NOME),email:clean(request.EMAIL),phone:clean(request.TELEFONO),
      companyHint,category:clean(request.CATEGORIA),topic,recordSource:'APP PUBLIC REQUESTS',
      candidateStakeholderIds,
      linkState:blockedCandidate?'CONTACT_BLOCKED':candidateStakeholderIds.length>1?'AMBIGUOUS_REVIEW':candidateStakeholderIds.length===1?'REVIEW_REQUIRED':'UNLINKED'
    });
  }
  return rows;
}

function prepareSponsorProposalDraft({lead,stakeholder,associationReviewed,asset='',objective=''}={}){
  if(!lead?.requestId||!stakeholder?.id)throw new Error('LEAD_AND_STAKEHOLDER_REQUIRED');
  if(associationReviewed!==true)throw new Error('REVIEW_REQUIRED');
  if(lead.linkState==='CONTACT_BLOCKED'||blocked(stakeholder.contactPolicy))throw new Error('CONTACT_BLOCKED');
  if(!Array.isArray(lead.candidateStakeholderIds)||!lead.candidateStakeholderIds.includes(stakeholder.id))throw new Error('STAKEHOLDER_MISMATCH');
  return {
    requestId:lead.requestId,stakeholderId:stakeholder.id,
    partnerName:clean(stakeholder.name),asset:clean(asset),objective:clean(objective),
    status:'DRAFT_PENDING_APPROVAL',deliveryState:'NOT_SENT',persisted:false,amount:null,
    preparedAt:new Date().toISOString(),source:'R20_CRM_LINK_REVIEW'
  };
}

module.exports={projectSponsorLeadInbox,prepareSponsorProposalDraft};
