import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {projectSponsorLeadInbox,prepareSponsorProposalDraft}=require('../lib/scd-sponsor-lead-workflow.js');
const lead={REQUEST_ID:'REQ-12AB34CD',TYPE:'SPONSOR',STATUS:'NUOVA',CREATED_AT:'2026-10-08T10:00:00Z',NOME:'Referente',EMAIL:'Referente@Example.org',TELEFONO:'123456',OGGETTO:'PARTNERSHIP · Azienda Test · LED',CATEGORIA:'Commercio',DETTAGLI:'RISERVATO',SOURCE:'SCD SUPER APP'};
const stakeholder={STAKEHOLDER_ID:'ST-1',NOME:'Azienda Test',EMAIL:'referente@example.org',CONTACT_POLICY:'MANUALE',TIPO:'AZIENDA'};

test('only canonical sponsor requests become inbox rows with safe fields',()=>{
 const rows=projectSponsorLeadInbox([lead,{...lead,REQUEST_ID:'REQ-2',TYPE:'TESSERAMENTO'},{...lead,REQUEST_ID:''}],[]);
 assert.equal(rows.length,1);
 assert.equal(rows[0].requestId,'REQ-12AB34CD');
 assert.equal(rows[0].recordSource,'APP PUBLIC REQUESTS');
 assert.equal(rows[0].companyHint,'Azienda Test');
 assert.equal('details' in rows[0],false);
 assert.equal('DETTAGLI' in rows[0],false);
});
test('a matching stakeholder remains review required',()=>{
 const [row]=projectSponsorLeadInbox([lead],[stakeholder]);
 assert.deepEqual(row.candidateStakeholderIds,['ST-1']);
 assert.equal(row.linkState,'REVIEW_REQUIRED');
 assert.equal('stakeholderId' in row,false);
});
test('suspended contact policy blocks candidates',()=>{
 const [row]=projectSponsorLeadInbox([lead],[{...stakeholder,CONTACT_POLICY:'NO_CONTACT'}]);
 assert.deepEqual(row.candidateStakeholderIds,[]);
 assert.equal(row.linkState,'CONTACT_BLOCKED');
});
test('ambiguous canonical candidates remain separated for human review',()=>{
 const [row]=projectSponsorLeadInbox([lead],[stakeholder,{...stakeholder,STAKEHOLDER_ID:'ST-2'}]);
 assert.deepEqual(row.candidateStakeholderIds,['ST-1','ST-2']);
 assert.equal(row.linkState,'AMBIGUOUS_REVIEW');
});
test('confirmed proposal preparation uses source IDs and cannot pretend delivery or persistence',()=>{
 const [row]=projectSponsorLeadInbox([lead],[stakeholder]);
 const draft=prepareSponsorProposalDraft({lead:row,stakeholder:{id:'ST-1',name:'Azienda Test',contactPolicy:'MANUALE'},associationReviewed:true,asset:'LED bordo campo',objective:'Visibilita territoriale'});
 assert.equal(draft.requestId,'REQ-12AB34CD');
 assert.equal(draft.stakeholderId,'ST-1');
 assert.equal(draft.status,'DRAFT_PENDING_APPROVAL');
 assert.equal(draft.deliveryState,'NOT_SENT');
 assert.equal(draft.persisted,false);
 assert.equal(draft.amount,null);
});
test('proposal preparation rejects unreviewed, mismatched or blocked association',()=>{
 const [row]=projectSponsorLeadInbox([lead],[stakeholder]);
 assert.throws(()=>prepareSponsorProposalDraft({lead:row,stakeholder:{id:'ST-1',name:'Azienda Test'},associationReviewed:false}),/REVIEW_REQUIRED/);
 assert.throws(()=>prepareSponsorProposalDraft({lead:row,stakeholder:{id:'ST-2',name:'Altro'},associationReviewed:true}),/STAKEHOLDER_MISMATCH/);
 assert.throws(()=>prepareSponsorProposalDraft({lead:row,stakeholder:{id:'ST-1',name:'Azienda Test',contactPolicy:'NO_CONTACT'},associationReviewed:true}),/CONTACT_BLOCKED/);
});
test('malformed, missing and duplicated source records fail closed',()=>{
 assert.deepEqual(projectSponsorLeadInbox(null,[stakeholder]),[]);
 assert.deepEqual(projectSponsorLeadInbox([null,{},'text'],[stakeholder]),[]);
 assert.equal(projectSponsorLeadInbox([lead,lead],[]).length,1);
});
