import fs from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';

const root=new URL('../',import.meta.url);
const read=path=>fs.readFileSync(new URL(path,root),'utf8');
const server=read('server.js');
const bridge=read('backend_patch_R21_6_http_api.gs');
const html=read('sponsor/app.html');
const client=read('sponsor/app.js');

test('GROW reads sponsor inbox only through existing authenticated R20 path',()=>{
 assert.match(server,/validateSponsorSession\(req\)/);
 assert.match(server,/readSponsorInbox\(session\.token/);
 assert.match(server,/private\.crm\.leadInbox/);
 assert.match(bridge,/case 'private\.crm\.leadInbox'/);
 assert.match(bridge,/function r216SponsorLeadInbox_/);
 assert.match(bridge,/SPONSOR_SCOPE_REQUIRED/);
 assert.match(bridge,/r216CrmTable_\('APP PUBLIC REQUESTS'\)/);
 assert.match(bridge,/r216CrmTable_\('STAKEHOLDERS_MASTER'\)/);
});
test('GROW proposal preview verifies CRM record and never persists/sends',()=>{
 assert.match(server,/requireUpstreamSuccess\(await callAppsScript\('private\.crm\.detail'/);
 assert.match(server,/CRM_ID_MISMATCH/);
 assert.match(server,/associationReviewed!==true/);
 assert.match(server,/prepareSponsorProposalDraft/);
 assert.match(server,/NON salvata e NON inviata/);
 assert.match(client,/id="crmLeadRefresh"|crmLeadRefresh/);
 assert.match(html,/id="crmLeadInbox"/);
 assert.match(client,/data-grow-proposal/);
 assert.match(client,/window\.confirm/);
 assert.match(client,/BOZZA NON SALVATA/);
});
