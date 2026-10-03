import fs from 'node:fs';

const file='config/scd-one-product-contract.v1.json';
const fail=m=>{console.error('SCD ONE CONTRACT FAIL: '+m);process.exitCode=1};
const ok=(cond,m)=>{if(!cond)fail(m)};

const c=JSON.parse(fs.readFileSync(file,'utf8'));
const html=fs.readFileSync('index.html','utf8');
const runtime=fs.readFileSync('scd-ng.js','utf8');
const responsiveStyles=fs.readFileSync('ui-r52-social.css','utf8')+fs.readFileSync('scd-ng.css','utf8');
const nativeAdapters=fs.readFileSync('lib/scd-native-adapters.js','utf8');
const manifest=JSON.parse(fs.readFileSync('manifest.webmanifest','utf8'));
const serviceWorker=fs.readFileSync('sw.js','utf8');
const server=fs.readFileSync('server.js','utf8');

ok(c.id==='SCD_ONE_PRODUCT_CONTRACT','contract id mismatch');
ok(c.appId==='SCD_ONE','appId mismatch');
ok(c.name==='SCD ONE — ColicoDerviese Social Super App','name mismatch');
ok(c.week?.model==='FRIDAY_TO_FRIDAY','SCD Week must be Friday-to-Friday');
ok(c.week?.weekendPriority===true,'weekend priority must be enabled');

const expectedNav=['HOME','CALENDAR','TEAMS','SOCIAL','PROFILE'];
ok(JSON.stringify(c.navigation?.mobileBottom)===JSON.stringify(expectedNav),'mobile bottom navigation mismatch');
ok(c.navigation?.homePermanent===true,'Home must remain permanent');
const nav=html.match(/<nav class="bottom-nav"[^>]*>([\s\S]*?)<\/nav>/)?.[1]||'';
const runtimeNav=[...nav.matchAll(/data-route="([^"]+)"/g)].map(match=>match[1].toUpperCase());
ok(JSON.stringify(runtimeNav)===JSON.stringify(c.navigation.mobileBottom),'runtime navigation order differs from product contract');
for(const route of ['home','calendar','teams','social','profile']){
  ok(html.includes('data-route="'+route+'"'),'missing primary navigation route '+route);
}
for(const signal of ['pulseNow','pulseNext','pulseChanged','pulseAttention']){
  ok(html.includes('id="'+signal+'"'),'missing Pulse state '+signal);
}
ok(runtime.includes('window.SCDOnePulse.summarize'),'Pulse must use the shared public-data contract');
ok(runtime.includes('window.addEventListener(\'popstate\''),'view navigation must support browser history');
ok(runtime.includes('profile:\'twin\''),'Profile route must preserve the existing Twin view');
ok(runtime.includes('window.SCDNativeAdapters.share'),'share actions must use the native adapter');
ok(responsiveStyles.includes('grid-template-columns:repeat(5,1fr)!important'),'mobile navigation must fit five canonical items');
ok(responsiveStyles.includes('min-width:901px')&&responsiveStyles.includes('position:fixed'),'desktop navigation rail is required');
ok(server.includes('return weekRange(new Date())'),'server calendar must use the canonical club week');
for(const adapter of ['deepLinks','push','media','secureStorage']){
  ok(nativeAdapters.includes(adapter+':Object.freeze'),'missing native adapter boundary '+adapter);
}
ok(manifest.start_url.endsWith('#home'),'PWA start URL must open the canonical Home route');
ok(manifest.shortcuts?.some(x=>String(x.url).endsWith('#profile')),'PWA must expose the Profile shortcut');
ok(serviceWorker.includes('./lib/scd-one-pulse.js?v=1.0.0'),'offline shell must cache the Pulse runtime');

for(const surface of ['PULSE','SCD_WEEK','NEXT_MATCH','CALENDAR','TEAMS','MATCHDAY','SOCIAL','COMMUNITY','EVENTS','TOURNAMENTS','JOIN','PROFILE','FAMILY','ATHLETE','FIELD_REQUESTS','TICKETS','SCD_CARD','SERVICES']){
  ok((c.coreSurfaces||[]).includes(surface),'missing core surface '+surface);
}

for(const tx of ['JOIN_INTEREST','OPEN_DAY_REGISTRATION','EVENT_REGISTRATION','TOURNAMENT_ENTRY','FIELD_REQUEST']){
  ok((c.transactions||[]).includes(tx),'missing transaction '+tx);
}

for(const req of ['IDEMPOTENCY','STATUS','VALIDATION','AUDIT','PROVENANCE','FAILURE_RETRY','NO_DUPLICATE_SUBMISSION']){
  ok((c.transactionRequirements||[]).includes(req),'missing transaction requirement '+req);
}

ok(c.identity?.canonicalPersonId===true,'canonical person identity required');
ok(c.identity?.duplicateAccountsForbidden===true,'duplicate accounts must be forbidden');
ok(c.identity?.roleScopeAuthority==='R20_UNTIL_VERIFIED_MIGRATION','R20 authority rule mismatch');

ok((c.eventSpine||[])[0]==='EVENT_ID','EVENT_ID must lead event spine');
ok((c.visual?.gamingEnergyWithoutGambling)===true,'gaming energy without gambling rule missing');
ok(c.visual?.style==='SPATIAL_SPORT_EDITORIAL_HIGH_IMPACT','visual style mismatch');
ok(c.responsive?.reducedMotionRequired===true,'reduced motion required');
ok(c.responsive?.keyboardFocusRequired===true,'keyboard focus required');

for(const cmd of ['SCDONE:MASTER','SCDONE:STATE','SCDONE:ARCHITECT','SCDONE:VISUAL','SCDONE:DATA','SCDONE:WEEK','SCDONE:MATCHDAY','SCDONE:SOCIAL','SCDONE:TRANSACT','SCDONE:SECURITY','SCDONE:TEST','SCDONE:RELEASE','SCDONE:NO-DUPLICATE','SCDONE:RUN']){
  ok((c.commands||[]).includes(cmd),'missing command '+cmd);
}

ok(c.boundaries?.internalAssociationManagement==='SCD_CORE','SCD CORE boundary missing');
ok(c.boundaries?.sponsorCrmAndGrowth==='SCD_GROW','SCD GROW boundary missing');
ok(c.boundaries?.orchestration==='SCD_COMMAND_R22','R22 boundary missing');
ok(c.productionMutationRequiresExplicitAuthorization===true,'production gate missing');

console.log('SCD ONE PRODUCT CONTRACT OK',{
  app:c.appId,
  navigation:c.navigation.mobileBottom,
  week:c.week.model,
  surfaces:c.coreSurfaces.length,
  commands:c.commands.length
});
