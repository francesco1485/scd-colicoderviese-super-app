import fs from 'node:fs';

const file='config/scd-one-product-contract.v1.json';
const fail=m=>{console.error('SCD ONE CONTRACT FAIL: '+m);process.exitCode=1};
const ok=(cond,m)=>{if(!cond)fail(m)};

const c=JSON.parse(fs.readFileSync(file,'utf8'));

ok(c.id==='SCD_ONE_PRODUCT_CONTRACT','contract id mismatch');
ok(c.appId==='SCD_ONE','appId mismatch');
ok(c.name==='SCD ONE — ColicoDerviese Social Super App','name mismatch');
ok(c.week?.model==='FRIDAY_TO_FRIDAY','SCD Week must be Friday-to-Friday');
ok(c.week?.weekendPriority===true,'weekend priority must be enabled');

const expectedNav=['HOME','CALENDAR','TEAMS','SOCIAL','PROFILE'];
ok(JSON.stringify(c.navigation?.mobileBottom)===JSON.stringify(expectedNav),'mobile bottom navigation mismatch');
ok(c.navigation?.homePermanent===true,'Home must remain permanent');

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
