'use strict';

const PUBLIC_ACTIVE_BENEFIT_STATUSES = new Set([
  'ATTIVA','ATTIVO','FORMALIZZATA','FORMALIZZATO','CONFERMATA','CONFERMATO'
]);
const NON_EVIDENCE_DOCUMENT_VALUES = new Set([
  'DA RICEVERE','DA DEFINIRE','NON DISPONIBILE','N/A'
]);

function text(value){return String(value??'').trim()}

function publicBenefitProjection(row={}){
  return {
    id:text(row.id),
    name:text(row.name),
    category:text(row.category),
    status:text(row.status)||'DA VERIFICARE',
    benefit:text(row.benefit),
    conditions:text(row.conditions),
    audience:text(row.audience),
    recognition:text(row.recognition),
    territory:text(row.territory),
    updatedAt:text(row.updatedAt)
  };
}

function publicBenefitFormalizationEvidence(row={}){
  const status=text(row.status).toUpperCase();
  const document=text(row.agreementDocument).toUpperCase();
  return PUBLIC_ACTIVE_BENEFIT_STATUSES.has(status)&&Boolean(document)&&!NON_EVIDENCE_DOCUMENT_VALUES.has(document);
}

function buildPublicCommunityBenefits(snapshot={},generatedAt=new Date().toISOString()){
  const rows=Array.isArray(snapshot.rows)?snapshot.rows:[];
  const active=[],pipeline=[];
  for(const row of rows){
    const projected=publicBenefitProjection(row);
    if(publicBenefitFormalizationEvidence(row)){
      active.push({...projected,formalizationEvidence:true,usableNow:true});
    }else{
      pipeline.push({...projected,formalizationEvidence:false,usableNow:false});
    }
  }
  return {
    ok:true,
    public:true,
    source:'COMMUNITY_BENEFITS_SNAPSHOT',
    sourceTable:text(snapshot.sourceTable)||'CONVENZIONI_MASTER',
    sourceMode:'PUBLIC_SAFE_SNAPSHOT',
    snapshotAt:text(snapshot.snapshotAt),
    policy:'NO_ACTIVE_BENEFIT_WITHOUT_FORMALIZATION_EVIDENCE',
    generatedAt,
    counts:{active:active.length,pipeline:pipeline.length,total:rows.length},
    active,
    pipeline
  };
}

module.exports={
  PUBLIC_ACTIVE_BENEFIT_STATUSES,
  publicBenefitProjection,
  publicBenefitFormalizationEvidence,
  buildPublicCommunityBenefits
};
