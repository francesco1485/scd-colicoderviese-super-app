import fs from 'node:fs';
import { createRequire } from 'node:module';

const require=createRequire(import.meta.url);
const { buildPublicCommunityBenefits }=require('../lib/community-benefits.js');

function fail(message){console.error('Card benefit contract FAIL:',message);process.exit(1)}
function assert(condition,message){if(!condition)fail(message)}

const snapshot=JSON.parse(fs.readFileSync(new URL('../config/community-benefits.snapshot.json',import.meta.url),'utf8'));
const manifest=JSON.parse(fs.readFileSync(new URL('../SCD_SYSTEM_MANIFEST.json',import.meta.url),'utf8'));
const server=fs.readFileSync(new URL('../server.js',import.meta.url),'utf8');
const publicBenefitsLib=fs.readFileSync(new URL('../lib/community-benefits.js',import.meta.url),'utf8');
const buildPages=fs.readFileSync(new URL('../scripts/build-pages.mjs',import.meta.url),'utf8');
const publicArtifact=JSON.parse(fs.readFileSync(new URL('../content/community-benefits.public.json',import.meta.url),'utf8'));
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const js=fs.readFileSync(new URL('../scd-ng.js',import.meta.url),'utf8');

assert(snapshot.privacy==='PUBLIC_SAFE_PROJECTION_NO_CONTACTS','community snapshot must remain public-safe');
assert(server.includes("u.pathname==='/api/community/benefits'"),'public benefit endpoint missing');
assert(server.includes('buildPublicCommunityBenefits(COMMUNITY_BENEFITS_SNAPSHOT)'),'public endpoint must use canonical projection engine');
assert(publicBenefitsLib.includes("policy:'NO_ACTIVE_BENEFIT_WITHOUT_FORMALIZATION_EVIDENCE'"),'formalization fail-closed policy missing');
assert(publicBenefitsLib.includes('PUBLIC_ACTIVE_BENEFIT_STATUSES'),'strict public active-status allowlist missing');
assert(publicBenefitsLib.includes('publicBenefitFormalizationEvidence'),'formalization evidence gate missing');
assert(publicBenefitsLib.includes('usableNow:true'),'active benefit explicit usability state missing');
assert(publicBenefitsLib.includes('usableNow:false'),'pipeline non-usable state missing');

const projectionStart=publicBenefitsLib.indexOf('function publicBenefitProjection');
const projectionEnd=publicBenefitsLib.indexOf('function publicBenefitFormalizationEvidence');
assert(projectionStart>=0&&projectionEnd>projectionStart,'public benefit projection function missing');
const projection=publicBenefitsLib.slice(projectionStart,projectionEnd);
for(const forbidden of ['owner','nextAction','agreementDocument','email','phone']){
  assert(!projection.includes(forbidden),'public benefit projection leaks internal field '+forbidden);
}
assert(buildPages.includes("community-benefits.public.json"),'Pages public benefit artifact generation missing');
assert(buildPages.includes('buildPublicCommunityBenefits'),'Pages must reuse canonical public benefit projection');
assert(publicArtifact.policy==='NO_ACTIVE_BENEFIT_WITHOUT_FORMALIZATION_EVIDENCE','public benefit artifact policy mismatch');
assert(Array.isArray(publicArtifact.active)&&Array.isArray(publicArtifact.pipeline),'public benefit artifact lists missing');
assert(publicArtifact.active.every(x=>x.formalizationEvidence===true&&x.usableNow===true),'public artifact active row missing evidence');
assert(publicArtifact.pipeline.every(x=>x.formalizationEvidence===false&&x.usableNow===false),'public artifact pipeline row incorrectly usable');
const expectedArtifact=buildPublicCommunityBenefits(snapshot,publicArtifact.generatedAt);
assert(JSON.stringify(publicArtifact)===JSON.stringify(expectedArtifact),'committed public benefit artifact drifted from canonical snapshot projection');

const artifactSerialized=JSON.stringify(publicArtifact).toLowerCase();
for(const forbidden of ['"owner"','"nextaction"','"agreementdocument"','"email"','"phone"']){
  assert(!artifactSerialized.includes(forbidden),'public artifact leaks internal field '+forbidden);
}

for(const token of ['id="view-card"','id="membershipPromoBar"','id="cardCenter"','id="supporterCardProduct"','id="tesseratoCardProduct"','id="publicBenefitNetwork"','id="publicBenefitActive"','id="publicBenefitPipeline"']){
  assert(html.includes(token),'Card Center UI missing '+token);
}
assert(html.includes('data-join="FAN"'),'Supporter request path missing');
assert(html.includes('data-join="ATHLETE_REQUEST"'),'Tesserato request path missing');
assert(html.includes('data-nav="desk"'),'authorized private-space path missing');

assert(js.includes("fetch(API_BASE+'/api/community/benefits'"),'public Benefit Network loader missing');
assert(js.includes("fetch('./content/community-benefits.public.json'"),'GitHub Pages Benefit Network fallback missing');
assert(js.includes('function renderCardBenefits()'),'Card Benefit renderer missing');
assert(js.includes('Non ancora utilizzabile'),'pipeline usability guard missing');
assert(js.includes("if(kind==='card')"),'global search Card Center route missing');
assert(js.includes("'card','twin','desk'"),'Card hash route missing');

const contract=manifest.product_direction?.card_and_benefit_center;
assert(contract?.state==='PUBLIC_READ_MODEL_READY','Card Center manifest state mismatch');
assert(contract?.cards?.supporter?.grants_reserved_role===false,'Supporter Card cannot grant reserved roles');
assert(contract?.cards?.tesserato?.self_assignment===false,'Tesserato Card cannot self-assign role');
assert(contract?.cards?.tesserato?.authorization==='DIRECTION_ONLY','Tesserato Card authorization must be Direction only');
assert(contract?.benefit_network?.no_active_claim_before_formalization===true,'benefit formalization guard missing');
assert((manifest.capability_map||[]).some(x=>x.id==='CAP-CARD-BENEFIT-CENTER'),'Card Center capability missing');

console.log('Card benefit contract PASS');
