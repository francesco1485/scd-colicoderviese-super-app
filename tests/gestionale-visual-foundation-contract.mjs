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
const face=JSON.parse(fs.readFileSync(new URL('../config/scd-face-policy.v1.json',import.meta.url),'utf8'));
const accessory=JSON.parse(fs.readFileSync(new URL('../config/scd-accessory-library.v1.json',import.meta.url),'utf8'));
const assetRegistry=JSON.parse(fs.readFileSync(new URL('../config/scd-assets.v1.json',import.meta.url),'utf8'));
const requiredFaceLevels=['L0_INITIALS_OR_SILHOUETTE','L1_PROFILE_PHOTO','L2_SPORT_CUTOUT','L3_PREMIUM_EDITORIAL_PORTRAIT'];
for(const id of requiredFaceLevels)assert(face.levels?.some(x=>x.id===id),'face level missing '+id);
assert(face.rules?.unknownConsentFallback==='L0_INITIALS_OR_SILHOUETTE','unknown consent must resolve to L0');
assert(face.rules?.expiredConsentFallback==='L0_INITIALS_OR_SILHOUETTE','expired consent must resolve to L0');
assert(face.contextRules?.PUBLIC?.requiredFlag==='PUBLIC_ALLOWED','public face requires PUBLIC_ALLOWED');
assert(face.contextRules?.COMMERCIAL?.requiredFlag==='COMMERCIAL_ALLOWED','commercial face requires COMMERCIAL_ALLOWED');
const requiredGroups=['FOOTBALL','PEOPLE','LOGISTICS','FACILITY','WAREHOUSE','ADMINISTRATION','COMMUNICATION','SPONSOR'];
for(const group of requiredGroups)assert(accessory.groups?.some(x=>x.id===group),'accessory group missing '+group);
const requiredAccessoryIds=['FOOTBALL_BALL','FOOTBALL_CONE','FOOTBALL_BIB','FOOTBALL_GOAL','FOOTBALL_BAG','TACTICAL_BOARD','WHISTLE','MEDICAL_KIT','JERSEY','PLAYER_NUMBER','CAPTAIN_BADGE','STAFF_BADGE','DIRECTOR_BADGE','VAN','CAR','SEAT','LUGGAGE','STOP','KEY','FIELD','LOCKER_ROOM','LOCKER','SHOWER','GYM','CLUBHOUSE','WAREHOUSE','BOX','SHELF','SIZE','SKU','BARCODE','QR','DOCUMENT','INVOICE','PAYMENT','CONTRACT','RECEIPT','MESSAGE','EMAIL','WHATSAPP_CHANNEL','PUSH','ALERT','LED_BOARD','BANNER','SHIRT_PLACEMENT','STAND','TRIBUNE','HOSPITALITY'];
const accIds=accessory.accessories?.map(x=>x.id)||[];
for(const id of requiredAccessoryIds)assert(accIds.includes(id),'accessory missing '+id);
for(const item of accessory.accessories||[]){
  for(const k of ['id','group','masterPath','states','sourceClass'])assert(item[k]!==undefined,'accessory '+item.id+' missing '+k);
  assert(fs.existsSync(new URL('../'+item.masterPath,import.meta.url)),'accessory master missing '+item.masterPath);
  assert(item.sourceClass==='GENERATED_ORIGINAL','accessory source class must be GENERATED_ORIGINAL '+item.id);
}
assert(fs.existsSync(new URL('../assets/ui/faces/neutral-person.svg',import.meta.url)),'neutral face master missing');
assert(assetRegistry.rules?.fallback==='NEUTRAL_PLACEHOLDER_WITH_UNVERIFIED_STATUS','unverified fallback changed');
assert(Array.isArray(assetRegistry.ui_original_assets)&&assetRegistry.ui_original_assets.length===requiredAccessoryIds.length+1,'ui original asset registry size mismatch');
console.log('GESTIONALE VISUAL FOUNDATION ASSET GOVERNANCE PASS',{macros:actualMacros.length,micro:actualMicro.length});
