import fs from 'node:fs';

const fail=(m)=>{throw new Error('NEXTGEN CONTRACT FAIL: '+m)};
const read=(p)=>fs.readFileSync(p,'utf8');

const html=read('index.html');
const css=read('scd-ng.css');
const synth=read('scd-synth.css');
const js=read('scd-ng.js');
const interactions=read('scd-interactions.js');
const manifest=JSON.parse(read('SCD_SYSTEM_MANIFEST.json'));

const all=[html,css,synth,js,interactions].join('\n');

if(!html.includes('SCD Universe · Next Generation')) fail('NextGen title missing');
if(!html.includes('scd-synth.css')) fail('synthetic visual layer not mounted');
if(!html.includes('scd-interactions.js')) fail('interaction layer not mounted');
if(!html.includes('SCD TWIN')) fail('Twin surface missing');
if(!html.includes('SCD MIRROR')) fail('Mirror surface missing');
if(!html.includes('PRIVATE DESK')) fail('Private Desk missing');
if(!html.includes('SCD HOME · QUESTA SETTIMANA') && !html.includes('SCD WEEKLY RADAR')) fail('current-week surface missing');
if(!html.includes('SCD AI NEWSROOM')) fail('AI Newsroom missing');
for(const token of ['SCD HOME · QUESTA SETTIMANA','publicSearchInput','matchCenter','upcomingEvents','mediaHub','communityPulse','sponsorRail','partnerCommunityHub','solidarityHome','institutionalStrip','joinClub','view-calendar','calendarPublicList','view-teams','publicTeamsGrid','myTeamDeck','videoArena','data-public-action="calendar"','avatarSearch','SKY','./assets/sky.png']){
  if(!html.includes(token)) fail('current-week public entry missing '+token);
}

for(const forbidden of ['hero-colico.webp','event-insieme.webp','photoInput','t.photo']){
  if(all.includes(forbidden)) fail('forbidden real-photo runtime reference: '+forbidden);
}

if(!synth.includes('SYNTHETIC VISUAL STAGE') && !synth.includes('SCD NEXTGEN SYNTHETIC VISUAL SYSTEM')){
  fail('synthetic scene contract marker missing');
}
if(!interactions.includes('speechSynthesis')) fail('local TTS runtime missing');
if(!js.includes("fetch(API_BASE+'/api/newsroom'")) fail('newsroom must use same-origin API abstraction');
if(!js.includes("const API_BASE=''")) fail('NextGen canonical app must use same-origin API');
if(!js.includes("const twinKey='scd:twin:v1'")) fail('canonical Twin storage key missing');
if(!js.includes("private.user.workspace")) fail('role-scoped Private Desk workspace action missing');
if(!js.includes("privateDeskLoginForm")) fail('Private Desk authentication runtime missing');
if(!html.includes('deskServiceDock')) fail('Private Desk adaptive service dock missing');
if(!html.includes('scd-meta-engine.js')) fail('canonical Meta engine not mounted');
if(!html.includes('scd-twin.js')) fail('canonical Twin engine not mounted');

const preview=manifest.architecture?.nextgen_preview;
if(!['PREVIEW_NOT_PRODUCTION_PRIMARY','PRODUCTION_PRIMARY'].includes(preview?.state)) fail('invalid NextGen runtime state');
if(preview?.frontend_api_topology!=='SAME_ORIGIN') fail('same-origin topology missing');
if(preview?.visual_mode!=='SYNTHETIC_NO_REAL_PHOTOGRAPHY') fail('synthetic visual mode missing');
// Historical NextGen surfaces remain synthetic-only. The separately flagged
// SCD 2026/27 three-world preview may show verified, approved geographic photos
// under explicit user directive UD-015. The exception MUST NOT apply to default
// production, the authenticated Desk, personal avatars, or unapproved media.
const mediaPolicy=manifest.visual_system?.media_policy||{};
const photoInIsolatedPreview=mediaPolicy.nextgen_real_photography_in_ui===true;
if(photoInIsolatedPreview){
  const visualOverride=manifest.visual_system?.user_master_source_override_legacy_restrictions;
  const feature=manifest.visual_system?.native_three_worlds_preview;
  const visualRefs=JSON.parse(read('config/scd-visual-references.v1.json'));
  if(visualOverride?.effective_at!=='2026-10-09') fail('approved photography requires dated user override');
  if(feature?.state!=='ISOLATED_FEATURE_FLAG' || feature?.flag!=='?scdVision=1' || feature?.production_default_unchanged!==true) fail('photos require isolated, default-off feature gate');
  if(feature?.human_approval_before_public_release!==true || feature?.screenshot_master_check_required_before_graphic_approval!==true) fail('photos require real graphic review and human release gate');
  if(!mediaPolicy.allowed_real_media?.includes('APPROVED_TERRITORY_PHOTOGRAPHY_WITH_DOCUMENTED_RIGHTS')) fail('real photo rights policy missing');
  if(visualRefs.rules?.realPhotoRequiresUsageRightsAndPrivacyCheck!==true || visualRefs.rules?.homeVisualDNAAppliesToEveryScreenAndApp!==true) fail('SCD geographic photo rights and cross-app visual directive missing');
  if(!html.includes('scd-three-worlds-native.js') || !html.includes('scd-one-native.js')) fail('isolated visual runtime not mounted');
  const newRuntime=read('scd-three-worlds-native.js');
  if(!newRuntime.includes("get('scdVision')!=='1'")) fail('new runtime must exit without explicit preview flag');
  if(!newRuntime.includes('NATIVE_COMPONENTS')) fail('rasterized screenshot is not an approved runtime');
}else if(mediaPolicy.nextgen_real_photography_in_ui!==false){
  fail('real photography policy requires explicit approved user scope');
}
if(manifest.sky_and_avatar?.personal_avatar?.rendering_mode!=='SYNTHETIC_ONLY') fail('Twin rendering must be synthetic-only');
if(manifest.sky_and_avatar?.mirror?.separate_from_twin!==true) fail('Mirror and Twin must remain separate');

const capIds=new Set((manifest.capability_map||[]).map(x=>x.id));
if(!capIds.has('CAP-PUBLIC-TEAMS')) fail('missing capability CAP-PUBLIC-TEAMS');
if(!capIds.has('CAP-PUBLIC-MATCHDAY')) fail('missing capability CAP-PUBLIC-MATCHDAY');
if(!capIds.has('CAP-SOLIDARITY-FUND')) fail('missing capability CAP-SOLIDARITY-FUND');
if(manifest.product_direction?.solidarity_fund?.payment_channels?.card_data_handling!=='NEVER_STORED_BY_SCD_FRONTEND_OR_SERVER') fail('Solidarity Fund card data guard missing');
if(!js.includes('function openMatchday(')) fail('R48 Matchday runtime missing');
if(!js.includes('function openTeamHub(')) fail('R48 Team Hub runtime missing');
if(manifest.product_direction?.public_matchday?.no_prediction!==true) fail('R48 Matchday prediction guard missing');
if(manifest.product_direction?.media_and_social_hub?.video_arena?.pixellot!=='PRIVATE_BY_DEFAULT_AUTHORIZED_STAFF_ONLY') fail('R48 Video Arena Pixellot guard missing');
if(manifest.product_direction?.home_public_entry?.priority!=='CURRENT_WEEK_FIRST') fail('home current-week-first contract missing');
if(manifest.product_direction?.home_public_entry?.avatar?.onboarding_required!==false) fail('avatar must remain optional at onboarding');
if(manifest.product_direction?.home_public_entry?.match_center?.invented_stats!==false) fail('invented match statistics must remain forbidden');

for(const id of ['CAP-NEXTGEN-SYNTHETIC-UI','CAP-LOCAL-TTS','CAP-VALUE-ENGINE']){
  if(!capIds.has(id)) fail('missing capability '+id);
}

console.log(JSON.stringify({
  ok:true,
  manifestVersion:manifest.manifest.version,
  preview:preview?.canonical_preview_url,
  realPhotoRuntime:false,
  approvedIsolatedPhotoPreview:photoInIsolatedPreview,
  sameOriginApi:true,
  twinSynthetic:true,
  mirrorSeparate:true,
  localTts:true
},null,2));
