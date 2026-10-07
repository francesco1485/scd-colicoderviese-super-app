import fs from 'node:fs';
const fail=m=>{console.error('GESTIONALE VISUAL FOUNDATION FAIL:',m);process.exit(1)};
const assert=(c,m)=>{if(!c)fail(m)};
const grammar=JSON.parse(fs.readFileSync(new URL('../config/scd-ui-grammar.v1.json',import.meta.url),'utf8'));
const macroIds=['T01_PUBLIC_EDITORIAL','T02_OPERATIONAL_HOME','T03_DOMAIN_HUB','T04_ENTITY_DETAIL','T05_SPATIAL_WORKSPACE','T06_COMMUNICATION_HUB','T07_DATA_FINANCE','T08_PROJECT_DEVELOPMENT'];
const microIds=['PERSON_TOKEN','PLAYER_TOKEN','TEAM_BADGE','ROLE_BADGE','NUMBER_BADGE','STATUS_CHIP','SOURCE_BADGE','CONSENT_BADGE','LOGO_LOCKUP','FACE_AVATAR','JERSEY_TOKEN','VEHICLE_TOKEN','SEAT_SLOT','LOCKER_SLOT','ROOM_SLOT','FIELD_ZONE','ASSET_TOKEN','WAREHOUSE_LOCATION','DOCUMENT_CHIP','PAYMENT_CHIP','MESSAGE_BUBBLE','NOTIFICATION_ITEM','TIMELINE_ITEM','ACTION_BUTTON','AI_SUGGESTION','PROVENANCE_TAG','WARNING_BLOCK_STATE','AVAILABILITY_INDICATOR','ASSIGNMENT_HANDLE','QR_BARCODE_OBJECT','MEDIA_TILE'];
assert(grammar.id==='SCD_GESTIONALE_UI_GRAMMAR','grammar id');
assert(grammar.status==='DESIGN_FOUNDATION','grammar status');
assert(grammar.macroTemplates?.length===8,'exactly 8 macro templates');
const actualMacros=grammar.macroTemplates.map(x=>x.id);
for(const id of macroIds)assert(actualMacros.includes(id),'macro missing '+id);
assert(new Set(actualMacros).size===actualMacros.length,'duplicate macro ids');
for(const x of grammar.macroTemplates){
  for(const k of ['purpose','allowedPrimitives','density','responsiveMode'])assert(x[k]!==undefined,'macro '+x.id+' missing '+k);
}
const actualMicro=grammar.microPrimitives?.map(x=>x.id)||[];
for(const id of microIds)assert(actualMicro.includes(id),'micro missing '+id);
assert(new Set(actualMicro).size===actualMicro.length,'duplicate micro ids');
for(const x of grammar.microPrimitives){
  for(const k of ['semanticPurpose','states','sizes','accessibility'])assert(x[k]!==undefined,'micro '+x.id+' missing '+k);
}
assert(!JSON.stringify(grammar).includes('SCD_CORE'),'historical alias SCD_CORE forbidden in grammar');
console.log('GESTIONALE VISUAL FOUNDATION GRAMMAR PASS',{macros:actualMacros.length,micro:actualMicro.length});
