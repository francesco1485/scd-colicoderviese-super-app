import { chromium } from 'playwright';
import fs from 'node:fs';

fs.mkdirSync('test-output',{recursive:true});
let checkpoint='BOOT';
function mark(name){checkpoint=name;console.log('[SMOKE CHECKPOINT]',name)}
function persistFailure(kind,err){
  const payload={kind,checkpoint,error:String(err?.stack||err?.message||err||'unknown'),at:new Date().toISOString()};
  try{fs.writeFileSync('test-output/smoke-checkpoint.json',JSON.stringify(payload,null,2))}catch{}
  console.error('[SMOKE FAILURE]',JSON.stringify(payload));
}
process.on('uncaughtException',err=>{persistFailure('uncaughtException',err);process.exit(1)});
process.on('unhandledRejection',err=>{persistFailure('unhandledRejection',err);process.exit(1)});
const base=process.env.SCD_TEST_URL||'http://127.0.0.1:10000';
const viewports=[
  {width:360,height:800},
  {width:390,height:844},
  {width:393,height:852},
  {width:430,height:932},
  {width:1280,height:800},
  {width:1440,height:900},
  {width:1920,height:1080}
];

const browser=await chromium.launch({headless:true});
const allErrors=[];

for(const viewport of viewports){
  mark('NOVA_VIEWPORT_'+viewport.width+'x'+viewport.height);
  const page=await browser.newPage({viewport});
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text())});

  await page.goto(base+'/#pulse',{waitUntil:'domcontentloaded',timeout:30000});
  await page.evaluate(()=>{
    document.cookie='scd_analytics_consent=no; Path=/; SameSite=Lax';
    const banner=document.querySelector('#scdCookieBanner');if(banner)banner.hidden=true;
  });
  await page.waitForSelector('#view-pulse.active');
  await page.waitForSelector('.home-first');
  await page.waitForSelector('#publicSearchInput');
  await page.waitForSelector('#sportHub');
  await page.waitForSelector('#matchCenter');
  await page.waitForSelector('#upcomingEvents');
  await page.waitForSelector('#clubNowContent');
  await page.waitForSelector('#clubContentRail');
  await page.waitForFunction(()=>document.querySelectorAll('#clubContentRail .club-now-card').length>=4);
  await page.waitForSelector('#mediaHub');
  await page.waitForSelector('#videoArena');
  await page.waitForSelector('#myTeamDeck',{state:'attached'});
  await page.waitForSelector('#communityPulse');
  await page.waitForSelector('#institutionalStrip');
  await page.waitForSelector('#sponsorRail');
  await page.waitForSelector('#solidarityHome');
  await page.waitForSelector('#joinClub');
  await page.waitForSelector('#view-calendar',{state:'attached'});
  await page.waitForSelector('#view-teams',{state:'attached'});
  await page.waitForSelector('#view-social',{state:'attached'});
  await page.waitForSelector('.hero-synth',{state:'attached'});
  await page.waitForSelector('.ng-command-ring',{state:'attached'});
  await page.waitForSelector('#weekRail');
  await page.waitForSelector('.ng-constellation',{state:'attached'});
  await page.waitForSelector('.newsroom');
  await page.waitForSelector('.worlds-preview',{state:'attached'});
  await page.waitForSelector('.ng-value-engine',{state:'attached'});
  await page.waitForTimeout(700);
  const runtimeFlags=await page.evaluate(()=>({nextGen:Boolean(window.SCDNextGen),meta:Boolean(window.SCDMeta),twin:Boolean(window.SCDTwin),experience:Boolean(window.SCDExperience),adaptive:Boolean(window.SCDAdaptive),matchday:typeof window.SCDNextGen?.openMatchday==='function',teamHub:typeof window.SCDNextGen?.openTeamHub==='function',social:typeof window.SCDNextGen?.openSocial==='function'}));
  if(!Object.values(runtimeFlags).every(Boolean))throw new Error('runtime boot incomplete '+JSON.stringify(runtimeFlags)+' browserErrors='+errors.join(' | '));
  await page.waitForFunction(()=>document.documentElement.scrollWidth<=window.innerWidth+3);

  const firstView=await page.locator('.home-first').evaluate(el=>({top:el.getBoundingClientRect().top,bottom:el.getBoundingClientRect().bottom}));
  if(firstView.top>300)throw new Error('current-week home entry not visible early enough: '+firstView.top);
  const homeBeforeHero=await page.evaluate(()=>document.querySelector('.home-first').compareDocumentPosition(document.querySelector('.hero')) & Node.DOCUMENT_POSITION_FOLLOWING);
  if(!homeBeforeHero)throw new Error('weekly home entry must precede secondary hero');
  const palette=await page.evaluate(()=>({
    bg:getComputedStyle(document.documentElement).getPropertyValue('--bg').trim(),
    blue:getComputedStyle(document.documentElement).getPropertyValue('--blue').trim(),
    gold:getComputedStyle(document.documentElement).getPropertyValue('--gold').trim()
  }));
  if(palette.bg!=='#f2f5f9'||palette.blue!=='#1664e8'||palette.gold!=='#ffc928')throw new Error('SCD Arena palette not applied '+JSON.stringify(palette));
  const arenaTheme=await page.evaluate(()=>document.body.dataset.scdTheme);
  if(arenaTheme!=='arena')throw new Error('SCD Arena theme marker missing');
  const arenaLabel=String(await page.locator('#sportHub .sport-superbar-title span').textContent()||'');
  if(!arenaLabel.includes('SCD ARENA'))throw new Error('SCD Arena identity missing');
    const sportHubButtons=await page.locator('#sportHub button').count();
  if(sportHubButtons!==6)throw new Error('Sport Hub actions mismatch: '+sportHubButtons);
  const officialLinks=await page.locator('#mediaHub .official-channels a').count();
  if(officialLinks!==5)throw new Error('Media Hub official links mismatch: '+officialLinks);
  const videoArenaItems=await page.locator('#videoArena .video-arena-grid > *').count();
  if(videoArenaItems!==4)throw new Error('Video Arena item mismatch: '+videoArenaItems);
  const pixellotLabel=String(await page.locator('#pixellotLocked small').textContent()||'');
  if(!/privato/i.test(pixellotLabel))throw new Error('Pixellot must remain visibly private');
  const solidarityCta=await page.locator('#solidarityHome a[href*="fondo-solidale"]').count();
  if(solidarityCta!==1)throw new Error('Solidarity Fund home CTA missing');
  const clubNowCards=await page.locator('#clubContentRail .club-now-card').count();
  if(clubNowCards<4)throw new Error('R55 Club Now content too sparse: '+clubNowCards);
  const clubNowText=String(await page.locator('#clubContentRail').textContent()||'');
  for(const token of ['Centro Sportivo','Famiglie e atleti','Tutela dei minori'])if(!clubNowText.includes(token))throw new Error('R55 Club Now missing '+token);
    const institutionalLogos=await page.locator('#institutionalStrip img').count();
  if(institutionalLogos!==3)throw new Error('institutional logos mismatch: '+institutionalLogos);
  const skyAsset=await page.locator('#mirrorFab img').getAttribute('src');
  if(!/assets\/sky\.png$/.test(String(skyAsset||'')))throw new Error('official Sky mascot missing from chatbot');
    const navLabels=await page.locator('.bottom-nav button').allTextContents();
  for(const label of ['Home','Calendario','Squadre','Social','Profilo'])if(!navLabels.some(x=>x.includes(label)))throw new Error('mobile nav missing '+label);
  const visibleLegacy=await page.evaluate(()=>['.home-secondary-hero','.ng-command-ring','.pulse-strip','.ng-constellation','.worlds-preview','.ng-value-engine'].filter(sel=>{const el=document.querySelector(sel);return el&&getComputedStyle(el).display!=='none'}));
  if(visibleLegacy.length)throw new Error('secondary clutter visible on public home: '+visibleLegacy.join(','));

  const realPhotoRefs=await page.evaluate(()=>[...document.querySelectorAll('img')].map(x=>x.getAttribute('src')||'').filter(x=>/hero-colico|event-insieme/i.test(x)));
  if(realPhotoRefs.length)throw new Error('forbidden real photography loaded: '+realPhotoRefs.join(','));

  const adaptive=await page.evaluate(()=>window.SCDAdaptive.snapshot());
  if(!['PHONE_COMPACT','PHONE','PHONE_LARGE','TABLET','LAPTOP','DESKTOP','WIDE','ULTRAWIDE'].includes(adaptive.viewportClass))throw new Error('adaptive viewport class missing');
  const adaptiveAttr=await page.evaluate(()=>String(document.documentElement.dataset.scdViewport||'').toUpperCase());
  if(adaptiveAttr!==adaptive.viewportClass)throw new Error('adaptive viewport dataset not applied');

  const meta=await page.evaluate(()=>window.SCDMeta.snapshot('base'));
  if(meta.mode!=='PRIVACY_FIRST_ON_DEVICE')throw new Error('Meta privacy-first mode missing');

  const cognitive=await page.evaluate(()=>window.SCDExperience.frictionSnapshot());
  if(cognitive.principle!=='NO_MENTAL_STATE_INFERENCE')throw new Error('Human OS guardrail missing');

  await page.evaluate(()=>window.SCDExperience.setMode('FOCUS'));
  if(await page.evaluate(()=>document.body.dataset.scdExperience)!=='focus')throw new Error('Focus mode failed');
  await page.evaluate(()=>window.SCDExperience.setMode('QUICK'));
  if(await page.evaluate(()=>document.body.dataset.scdExperience)!=='quick')throw new Error('Quick mode failed');
  await page.evaluate(()=>window.SCDExperience.setMode('DISCOVER'));
  if(await page.evaluate(()=>document.body.dataset.scdExperience)!=='discover')throw new Error('Discover mode failed');

  mark('CALENDAR_'+viewport.width);
  await page.evaluate(()=>window.SCDNextGen.setView('calendar'));
  await page.waitForSelector('#view-calendar.active');
  await page.waitForSelector('#calendarPublicList');
  if(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+3))throw new Error('calendar view horizontal overflow');
  mark('TEAMS_'+viewport.width);
  await page.evaluate(()=>window.SCDNextGen.setView('teams'));
  await page.waitForSelector('#view-teams.active');
  await page.waitForSelector('#publicTeamsGrid');
  await page.waitForSelector('#followTeamSelect');
  if(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+3))throw new Error('teams view horizontal overflow');
  mark('SOCIAL_'+viewport.width);
  await page.evaluate(()=>window.SCDNextGen.setView('social'));
  await page.waitForSelector('#view-social.active');
  await page.waitForSelector('#socialFeed');
  await page.waitForSelector('#socialSearch');
  await page.waitForSelector('#socialFilters');
  if((await page.locator('[data-social-filter="CLUB"]').count())!==1)throw new Error('R55 Club social filter missing');
  await page.click('[data-social-filter="CLUB"]');
  await page.waitForFunction(()=>document.querySelectorAll('#socialFeed .social-card[data-type="CLUB"]').length>=4);
  const socialClubCards=await page.locator('#socialFeed .social-card[data-type="CLUB"]').count();
  if(socialClubCards<4)throw new Error('R55 Social Club feed too sparse: '+socialClubCards);
  if((await page.locator('.social-channel-grid a').count())!==5)throw new Error('social official channel count mismatch');
  if(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+3))throw new Error('social view horizontal overflow');
  if([390,1440].includes(viewport.width))await page.screenshot({path:'test-output/social-'+viewport.width+'x'+viewport.height+'.png',fullPage:true});
  await page.fill('#socialSearch','SCD');
  await page.click('[data-social-filter="ALL"]');
  await page.fill('#socialSearch','Centro Sportivo');
  await page.waitForFunction(()=>document.querySelectorAll('#socialFeed .social-card[data-type="CLUB"]').length>=1);
  await page.fill('#socialSearch','');
  await page.evaluate(()=>window.SCDNextGen.setView('teams'));
  await page.waitForSelector('#view-teams.active');

  if((await page.locator('#calendarPeriod [data-period]').count())!==3)throw new Error('calendar period controls missing');
  if((await page.locator('#calendarTypeFilter option').count())<5)throw new Error('calendar type filters missing');
  await page.waitForTimeout(250);
  const teamCardCount=await page.locator('.public-team-card').count();
  if(teamCardCount>0){
    await page.locator('.public-team-card').first().click();
    await page.waitForSelector('.team-hub-sheet');
    if(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+3))throw new Error('team hub horizontal overflow');
    await page.click('#publicPanelClose');
  }
  await page.evaluate(()=>window.SCDNextGen.setView('pulse'));

  mark('MATCHDAY_'+viewport.width);
  await page.evaluate(()=>window.SCDNextGen.openMatchday({id:'QA-MATCH',kind:'MATCH',team:'SCD Test',opponent:'Avversario Test',date:'2026-10-04',time:'15:30',venue:'Campo Test',competition:'QA',source:'QA_SYNTHETIC_TEST_ONLY'}));
  await page.waitForSelector('.matchday-sheet');
  if(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+3))throw new Error('matchday horizontal overflow');
  const matchdayTrust=String(await page.locator('.matchday-trust').textContent()||'');
  if(!matchdayTrust.includes('QA_SYNTHETIC_TEST_ONLY'))throw new Error('matchday source provenance missing');
  await page.click('#publicPanelClose');

  mark('TWIN_'+viewport.width);
  await page.evaluate(()=>window.SCDNextGen.setView('twin'));
  await page.waitForSelector('#view-twin.active .twin-stage');
  await page.waitForSelector('#twinLocker');
  const beforeXp=await page.locator('#twinXp').textContent();
  await page.click('#missionBtn');
  const afterXp=await page.locator('#twinXp').textContent();
  if(beforeXp===afterXp)throw new Error('Twin XP did not evolve');

  mark('PRIVATE_DESK_'+viewport.width);
  await page.evaluate(()=>window.SCDNextGen.setView('desk'));
  await page.waitForSelector('#view-desk.active .desk-hero');
  await page.waitForSelector('.service-dock');
  await page.waitForSelector('#privateDeskLoginForm');
  if((await page.locator('#deskScopeStatus').textContent())!=='ACCESSO RICHIESTO')throw new Error('Private Desk anonymous gate missing');
  if(await page.locator('#scdCookieBanner:not([hidden])').count()){
    await page.click('#scdAnalyticsReject');
    await page.waitForSelector('#scdCookieBanner',{state:'hidden'});
  }

  await page.evaluate(()=>window.SCDNextGen.openMirror());
  await page.waitForSelector('#mirror.open');
  await page.fill('#mirrorInput','Che devo fare oggi?');
  await page.click('#mirrorForm button');
  await page.waitForFunction(()=>document.querySelectorAll('#mirrorMessages .msg.ai').length>=2);
  await page.click('#closeMirror');

  await page.evaluate(()=>window.SCDNextGen.setView('pulse'));

  const shellWidth=await page.locator('.app').evaluate(el=>Math.round(el.getBoundingClientRect().width));
  if(viewport.width>=1280 && shellWidth<1200)throw new Error('desktop shell too narrow: '+shellWidth+'px');

  if([390,430,1440,1920].includes(viewport.width)){
    await page.screenshot({path:'test-output/nova-'+viewport.width+'x'+viewport.height+'.png',fullPage:true});
  }

  if(errors.length)allErrors.push(viewport.width+'x'+viewport.height+': '+errors.join(' | '));
  await page.close();
}

// R54 private journey: live Nova Private Desk with intercepted authorized R20 responses.
mark('R54_PRIVATE_JOURNEY');
for(const viewport of [{width:390,height:844},{width:1440,height:900}]){
  const privatePage=await browser.newPage({viewport});
  const privateErrors=[];
  privatePage.on('pageerror',e=>privateErrors.push(String(e)));
  privatePage.on('console',m=>{if(m.type()==='error')privateErrors.push('console: '+m.text())});

  const dashboard={
    user:{name:'QA SCD',email:'qa@example.test',role:'STAFF',area:'U16',staff:true},
    permissions:{direction:false},
    personal:[
      {personId:'QA-P1',code:'P001',firstName:'Atleta',lastName:'Uno',teamName:'U16',figcStatus:'APPROVATO_QA',certificateStatus:'VALIDO_QA',paymentStatus:'REGOLARE_QA',identityStatus:'VERIFICATO_QA'},
      {personId:'QA-P2',code:'P002',firstName:'Atleta',lastName:'Due',teamName:'U14',figcStatus:'IN_AGGIORNAMENTO_QA',certificateStatus:'IN_AGGIORNAMENTO_QA',paymentStatus:'IN_AGGIORNAMENTO_QA'}
    ],
    teams:[{key:'U16',name:'U16'},{key:'U14',name:'U14'}],
    attendance:{teams:[{key:'U16',name:'U16'}]},
    roster:{U16:[{code:'P001',name:'Atleta Uno'}],U14:[{code:'P002',name:'Atleta Due'}]},
    convocations:[{id:'QA-C1',playerCode:'P001',team:'U16',date:'2026-10-04',meetingTime:'13:45',meetingPlace:'Campo QA',response:'DA CONFERMARE'}],
    transport:{kpis:{requests:1}}
  };
  const workspace={
    name:'QA SCD',email:'qa@example.test',role:'STAFF',privateDeskProfile:'QA_ROLE_SCOPE',
    defaultModules:['CALENDARIO','TESSERATI','PULMINI','COMUNICAZIONI'],
    dataScope:['QA_AUTHORIZED'],communicationScope:['U16'],areas:[]
  };

  await privatePage.route('**/api/scd',async route=>{
    const req=route.request();
    if(req.method()!=='POST')return route.continue();
    let body={};try{body=JSON.parse(req.postData()||'{}')}catch{}
    const action=String(body.action||'');
    let data;
    if(action==='auth.login')data={token:'qa-private-token'};
    else if(action==='auth.validate')data={valid:true};
    else if(action==='auth.access.log')data={stored:true};
    else if(action==='auth.identity.resolve')data={matched:true,matchMethod:'QA_SYNTHETIC'};
    else if(action==='dashboard.summary')data=dashboard;
    else if(action==='private.user.workspace')data=workspace;
    else if(action==='account.requests')data={rows:[{id:'REQ-QA-1',subject:'Documento QA',status:'APERTA',createdAt:'2026-10-02T10:00:00Z'}]};
    else if(action==='private.attendance.get')data={statuses:['PRESENTE','ASSENTE','GIUSTIFICATO'],players:[{code:'P001',name:'Atleta Uno',status:'PRESENTE'}]};
    else if(['private.attendance.save','private.convocation.create','private.convocation.reply','private.transport.request','private.message.send','private.request.submit'].includes(action))data={ok:true,id:'QA-WRITE-1'};
    else return route.continue();
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,data})});
  });

  await privatePage.goto(base+'/#desk',{waitUntil:'domcontentloaded',timeout:30000});
  if(await privatePage.locator('#scdCookieBanner:not([hidden])').count()){
    await privatePage.click('#scdAnalyticsReject');
    await privatePage.waitForSelector('#scdCookieBanner',{state:'hidden'});
  }
  await privatePage.waitForSelector('#view-desk.active');
  await privatePage.waitForSelector('#privateDeskLoginForm');
  await privatePage.fill('#privateDeskEmail','qa@example.test');
  await privatePage.fill('#privateDeskCode','123456');
  await privatePage.click('#privateDeskLoginForm button[type="submit"]');
  await privatePage.waitForSelector('[data-private-module="TESSERATI"]');
  await privatePage.waitForSelector('[data-private-module="PRESENZE"]');
  await privatePage.waitForSelector('[data-private-module="CONVOCAZIONI"]');
  if(await privatePage.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+3))throw new Error('R54 Private Desk horizontal overflow '+viewport.width);

  await privatePage.click('[data-private-module="TESSERATI"]');
  await privatePage.waitForSelector('.r54-people-hub');
  const profileText=String(await privatePage.locator('.r54-people-hub').textContent()||'');
  if(!profileText.includes('APPROVATO_QA')||!profileText.includes('VALIDO_QA')||!profileText.includes('REGOLARE_QA'))throw new Error('R54 profile projection missing');
  if((await privatePage.locator('[data-r54-person]').count())!==2)throw new Error('R54 linked profiles mismatch');

  await privatePage.click('[data-r54-action="documents"]');
  await privatePage.waitForSelector('#r54PrivateHelp');
  const docsText=String(await privatePage.locator('#publicPanelBody').textContent()||'');
  if(!docsText.includes('VALIDO_QA')||!docsText.includes('VERIFICATO_QA'))throw new Error('R54 document status projection missing');
  if(/sincronizzati dal gestionale/i.test(docsText))throw new Error('R54 documents must remain fail-closed');
  await privatePage.click('#publicPanelClose');

  await privatePage.click('[data-private-module="PULMINI"]');
  await privatePage.waitForSelector('#r54TransportForm');
  await privatePage.fill('#r54TransportForm input[name="time"]','14:00');
  await privatePage.fill('#r54TransportForm input[name="origin"]','Colico QA');
  await privatePage.fill('#r54TransportForm input[name="destination"]','Dervio QA');
  await privatePage.click('#r54TransportForm button[type="submit"]');
  await privatePage.waitForFunction(()=>document.querySelector('#r54TransportState')?.textContent?.includes('registrata'));
  await privatePage.click('#publicPanelClose');

  await privatePage.click('[data-private-module="RICHIESTE"]');
  await privatePage.waitForSelector('.r54-request-list');
  if(!String(await privatePage.locator('.r54-request-list').textContent()||'').includes('Documento QA'))throw new Error('R54 request history missing');
  await privatePage.click('#publicPanelClose');

  await privatePage.click('[data-private-module="PRESENZE"]');
  await privatePage.waitForSelector('#r54AttLoad');
  await privatePage.click('#r54AttLoad');
  await privatePage.waitForSelector('[data-r54-att]');
  await privatePage.click('#r54AttSave');
  await privatePage.click('#publicPanelClose');

  await privatePage.click('[data-private-module="CONVOCAZIONI"]');
  await privatePage.waitForSelector('#r54ConvForm');
  await privatePage.fill('#r54ConvTime','13:45');
  await privatePage.fill('#r54ConvPlace','Campo QA');
  const callupChecks=privatePage.locator('[data-r54-conv-player]');
  if(await callupChecks.count())await callupChecks.first().check();
  await privatePage.click('#r54ConvForm button[type="submit"]');
  await privatePage.waitForFunction(()=>document.querySelector('#r54ConvState')?.textContent?.includes('registrata'));
  await privatePage.click('#publicPanelClose');

  await privatePage.click('[data-private-module="COMUNICAZIONI"]');
  await privatePage.waitForSelector('#r54MessageForm');
  await privatePage.fill('#r54MsgSubject','Messaggio QA');
  await privatePage.fill('#r54MsgBody','Contenuto QA autorizzato');
  await privatePage.click('#r54MessageForm button[type="submit"]');
  await privatePage.waitForFunction(()=>document.querySelector('#r54MsgState')?.textContent?.includes('registrato'));
  await privatePage.click('#publicPanelClose');

  await privatePage.click('[data-private-module="TESSERATI"]');
  await privatePage.waitForSelector('.r54-people-hub');
  if(await privatePage.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+3))throw new Error('R54 profile hub horizontal overflow '+viewport.width);
  await privatePage.screenshot({path:'test-output/r54-private-'+viewport.width+'x'+viewport.height+'.png',fullPage:true});
  await privatePage.click('#publicPanelClose');

  if(privateErrors.length)throw new Error('R54 private browser errors '+viewport.width+'px: '+privateErrors.join(' | '));
  await privatePage.close();
}

// R56 Family/Athlete role-scope journeys: synthetic identities, no live user data.
mark('R56_FAMILY_ATHLETE_ROLE_SCOPE');
for(const roleCase of [
  {role:'FAMILY',email:'family.qa@example.test',token:'qa-family-token',person:{personId:'QA-F1',code:'QAF1',firstName:'Famiglia',lastName:'QA',teamName:'U14'}},
  {role:'ATHLETE',email:'athlete.qa@example.test',token:'qa-athlete-token',person:{personId:'QA-A1',code:'QAA1',firstName:'Atleta',lastName:'QA',teamName:'U18'}}
]){
  const rolePage=await browser.newPage({viewport:{width:390,height:844}});
  const roleErrors=[];
  rolePage.on('pageerror',e=>roleErrors.push(String(e)));
  rolePage.on('console',m=>{if(m.type()==='error')roleErrors.push('console: '+m.text())});

  const roleDashboard={
    user:{name:roleCase.role+' QA',email:roleCase.email,role:roleCase.role,staff:false},
    permissions:{direction:false},
    personal:[roleCase.person],
    teams:[],attendance:{teams:[]},roster:{},convocations:[],transport:{kpis:{requests:0}}
  };
  const roleWorkspace={
    name:roleCase.role+' QA',email:roleCase.email,role:roleCase.role,
    privateDeskProfile:roleCase.role+'_SELF_SCOPE',defaultModules:[],
    dataScope:['SELF_ONLY'],communicationScope:[],areas:[]
  };

  await rolePage.route('**/api/scd',async route=>{
    const req=route.request();if(req.method()!=='POST')return route.continue();
    let body={};try{body=JSON.parse(req.postData()||'{}')}catch{}
    const action=String(body.action||'');let data;
    if(action==='auth.login')data={token:roleCase.token};
    else if(action==='auth.validate')data={valid:true};
    else if(action==='auth.access.log')data={stored:true};
    else if(action==='auth.identity.resolve')data={matched:true,matchMethod:'QA_SYNTHETIC'};
    else if(action==='dashboard.summary')data=roleDashboard;
    else if(action==='private.user.workspace')data=roleWorkspace;
    else if(action==='account.requests')data={rows:[]};
    else return route.continue();
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,data})});
  });

  await rolePage.goto(base+'/#desk',{waitUntil:'domcontentloaded',timeout:30000});
  if(await rolePage.locator('#scdCookieBanner:not([hidden])').count()){
    await rolePage.click('#scdAnalyticsReject');
    await rolePage.waitForSelector('#scdCookieBanner',{state:'hidden'});
  }
  await rolePage.fill('#privateDeskEmail',roleCase.email);
  await rolePage.fill('#privateDeskCode','123456');
  await rolePage.click('#privateDeskLoginForm button[type="submit"]');
  for(const module of ['TESSERATI','PULMINI','RICHIESTE','SICUREZZA']){
    await rolePage.waitForSelector('[data-private-module="'+module+'"]');
  }
  for(const module of ['ACCESSI','METRICHE','PRESENZE','CONVOCAZIONI','COMUNICAZIONI']){
    if(await rolePage.locator('[data-private-module="'+module+'"]').count())throw new Error('R56 '+roleCase.role+' received forbidden module '+module);
  }
  const scopeText=String(await rolePage.locator('.desk-scope-card').textContent()||'');
  if(!scopeText.includes('SELF_ONLY'))throw new Error('R56 '+roleCase.role+' self scope missing');
  await rolePage.click('[data-private-module="TESSERATI"]');
  await rolePage.waitForSelector('.r54-people-hub');
  const peopleText=String(await rolePage.locator('.r54-people-hub').textContent()||'');
  if(!peopleText.includes(roleCase.person.firstName)||!peopleText.includes(roleCase.person.lastName))throw new Error('R56 '+roleCase.role+' authorized profile missing');
  await rolePage.click('#publicPanelClose');
  if(await rolePage.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+3))throw new Error('R56 '+roleCase.role+' horizontal overflow');
  if(roleErrors.length)throw new Error('R56 '+roleCase.role+' browser errors: '+roleErrors.join(' | '));
  await rolePage.screenshot({path:'test-output/r56-'+roleCase.role.toLowerCase()+'-390x844.png',fullPage:true});
  await rolePage.close();
}

// R56 public identity preflight: public request resolves identity before creating registration request,
// without exposing whether the account exists in user-facing copy.
mark('R56_PUBLIC_IDENTITY_PREFLIGHT');
{
  const joinPage=await browser.newPage({viewport:{width:390,height:844}});
  const joinErrors=[];let resolveSeen=false,registrationSeen=false;
  joinPage.on('pageerror',e=>joinErrors.push(String(e)));
  joinPage.on('console',m=>{if(m.type()==='error')joinErrors.push('console: '+m.text())});
  await joinPage.route('**/api/scd',async route=>{
    const req=route.request();if(req.method()!=='POST')return route.continue();
    let body={};try{body=JSON.parse(req.postData()||'{}')}catch{}
    const action=String(body.action||'');let data;
    if(action==='public.identity.resolve'){
      resolveSeen=true;
      if(String(body.payload?.email||'')!=='family.preflight@example.test')throw new Error('R56 identity preflight payload mismatch');
      data={accepted:true};
    }else if(action==='public.registration'){
      registrationSeen=true;data={requestId:'QA-REG-001'};
    }else return route.continue();
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,data})});
  });
  await joinPage.goto(base+'/#pulse',{waitUntil:'domcontentloaded',timeout:30000});
  if(await joinPage.locator('#scdCookieBanner:not([hidden])').count())await joinPage.click('#scdAnalyticsReject');
  await joinPage.click('[data-join="FAMILY"]');
  await joinPage.waitForSelector('#joinRequestForm');
  await joinPage.fill('#joinRequestForm input[name="firstName"]','Famiglia');
  await joinPage.fill('#joinRequestForm input[name="lastName"]','Preflight');
  await joinPage.fill('#joinRequestForm input[name="email"]','family.preflight@example.test');
  await joinPage.fill('#joinRequestForm input[name="phone"]','0000000000');
  await joinPage.check('#joinRequestForm input[name="privacy"]');
  await joinPage.click('#joinRequestForm button[type="submit"]');
  await joinPage.waitForFunction(()=>document.querySelector('#joinFormState')?.textContent?.includes('Percorso avviato'));
  if(!resolveSeen||!registrationSeen)throw new Error('R56 public identity preflight chain incomplete');
  const stateText=String(await joinPage.locator('#joinFormState').textContent()||'');
  if(/esiste|non esiste|match|trovato/i.test(stateText))throw new Error('R56 public identity response leaks account existence');
  if(joinErrors.length)throw new Error('R56 public identity browser errors: '+joinErrors.join(' | '));
  await joinPage.close();
}

// R56 Direction onboarding/access journey.
mark('R56_IDENTITY_ACCESS_JOURNEY');
{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const errors=[];let telemetrySeen=false,inviteSeen=false,pinSeen=false,metricsSeen=false;
  page.on('pageerror',e=>errors.push(String(e)));
  page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text())});

  const directionDashboard={
    user:{name:'Direzione QA',email:'direction@example.test',role:'DIREZIONE',staff:true},
    permissions:{direction:true},personal:[],teams:[],convocations:[],transport:{kpis:{requests:0}}
  };
  const directionWorkspace={
    name:'Direzione QA',email:'direction@example.test',role:'DIREZIONE',
    privateDeskProfile:'EXECUTIVE_FULL',defaultModules:['CALENDARIO','DOCUMENTI'],
    dataScope:['CLUB'],communicationScope:['ALL_AUTHORIZED'],areas:[{canAdmin:true}]
  };

  await page.route('**/api/scd',async route=>{
    const req=route.request();if(req.method()!=='POST')return route.continue();
    let body={};try{body=JSON.parse(req.postData()||'{}')}catch{}
    const action=String(body.action||'');let data;
    if(action==='public.telemetry'){telemetrySeen=true;data={accepted:true}}
    else if(action==='auth.login')data={token:'qa-direction-token'};
    else if(action==='auth.validate')data={valid:true};
    else if(action==='dashboard.summary')data=directionDashboard;
    else if(action==='private.user.workspace')data=directionWorkspace;
    else if(action==='direction.access.invite'){inviteSeen=true;data={ok:true,email:'new.user@example.test',role:'FAMILY',identity:{matched:true,matchMethod:'EMAIL_EXACT'},temporaryCodeSent:true}}
    else if(action==='auth.pin.change'){pinSeen=true;data={ok:true}}
    else if(action==='direction.access.metrics'){metricsSeen=true;data={days:30,activeUsers:4,loginEvents:9,privateDeskOpens:7,daily:[{date:'2026-10-03',activeUsers:4}]}}
    else return route.continue();
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,data})});
  });

  await page.goto(base+'/#desk',{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForSelector('#scdCookieBanner:not([hidden])');
  await page.click('#scdAnalyticsAccept');
  await page.waitForFunction(()=>document.cookie.includes('scd_analytics_consent=yes'));
  await page.waitForTimeout(100);
  if(!telemetrySeen)throw new Error('R56 consented telemetry not sent');

  await page.fill('#privateDeskEmail','direction@example.test');
  await page.fill('#privateDeskCode','123456');
  await page.click('#privateDeskLoginForm button[type="submit"]');
  await page.waitForSelector('[data-private-module="ACCESSI"]');
  await page.waitForSelector('[data-private-module="SICUREZZA"]');

  await page.click('[data-private-module="ACCESSI"]');
  await page.waitForSelector('#r56InviteForm');
  await page.fill('#r56InviteEmail','new.user@example.test');
  await page.selectOption('#r56InviteRole','FAMILY');
  await page.fill('#r56InviteScope','Famiglia QA');
  await page.click('#r56InviteForm button[type="submit"]');
  await page.waitForFunction(()=>document.querySelector('#r56InviteState')?.textContent?.includes('Codice temporaneo inviato'));
  if(!inviteSeen)throw new Error('R56 invite action not called');
  await page.click('#publicPanelClose');

  await page.click('[data-private-module="METRICHE"]');
  await page.waitForSelector('#r56AccessMetrics');
  await page.waitForFunction(()=>document.querySelector('#r56AccessMetrics')?.textContent?.includes('UTENTI ATTIVI'));
  const metricsText=String(await page.locator('#publicPanelBody').textContent()||'');
  if(!metricsSeen)throw new Error('R56 access metrics action not called');
  if(!metricsText.includes('4')||!metricsText.includes('9')||!metricsText.includes('7'))throw new Error('R56 aggregated metrics projection missing');
  if(/123456|654321|new\.user@example\.test|Documento QA|Contenuto QA autorizzato|Colico QA|Dervio QA/i.test(metricsText))throw new Error('R56 metrics leaked concrete sensitive QA values');
  await page.click('#publicPanelClose');

  await page.click('[data-private-module="SICUREZZA"]');
  await page.waitForSelector('#r56PinForm');
  await page.fill('#r56OldPin','123456');
  await page.fill('#r56NewPin','654321');
  await page.fill('#r56NewPin2','654321');
  await page.click('#r56PinForm button[type="submit"]');
  await page.waitForFunction(()=>document.querySelector('#r56PinState')?.textContent?.includes('aggiornato'));
  if(!pinSeen)throw new Error('R56 PIN change action not called');

  if(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+3))throw new Error('R56 Direction horizontal overflow');
  await page.screenshot({path:'test-output/r56-access-390x844.png',fullPage:true});
  if(errors.length)throw new Error('R56 browser errors: '+errors.join(' | '));
  await page.close();
}

// Sponsor public journey: real browser interaction on desktop and mobile.
mark('SPONSOR_BROWSER_JOURNEY');
for(const viewport of [{width:390,height:844},{width:1440,height:900}]){
  const sponsor=await browser.newPage({viewport});
  const sponsorErrors=[];
  sponsor.on('pageerror',e=>sponsorErrors.push(String(e)));
  sponsor.on('console',m=>{if(m.type()==='error')sponsorErrors.push('console: '+m.text())});

  await sponsor.goto(base+'/sponsor/',{waitUntil:'domcontentloaded',timeout:30000});
  await sponsor.waitForSelector('.club-system');
  await sponsor.waitForSelector('.ledwall-launch');
  await sponsor.waitForSelector('.opportunity-grid.extended');
  await sponsor.waitForSelector('#ecosistema');
  await sponsor.waitForSelector('#convenzioni');

  const clubTitleBefore=String(await sponsor.locator('#clubModuleTitle').textContent()||'');
  await sponsor.click('[data-club-module="led"]');
  await sponsor.waitForFunction(()=>document.querySelector('#clubModuleKicker')?.textContent==='LEDWALL MATCHDAY');
  const clubTitleLed=String(await sponsor.locator('#clubModuleTitle').textContent()||'');
  if(clubTitleBefore===clubTitleLed)throw new Error('club experience module did not change');
  await sponsor.click('[data-club-module="territory"]');
  await sponsor.waitForFunction(()=>document.querySelector('#clubModuleKicker')?.textContent==='COLICO · ALTO LARIO');
  if(!(await sponsor.locator('#clubDeviceMain').textContent()).includes('LAGO DI COMO'))throw new Error('territory preview missing Lake Como identity');

  await sponsor.click('[data-open="access"]');
  await sponsor.waitForSelector('#accessModal:not([hidden])');
  await sponsor.click('#accessModal [data-close]');
  await sponsor.waitForSelector('#accessModal',{state:'hidden'});

  const reservedHref=await sponsor.locator('.access-button').getAttribute('href');
  if(reservedHref!=='https://scd-colicoderviese-official-r21.onrender.com/sponsor/?login=1')throw new Error('reserved access direct link mismatch: '+reservedHref);
  const footerReserved=await sponsor.locator('.footer-actions a').getAttribute('href');
  if(footerReserved!==reservedHref)throw new Error('footer reserved access link mismatch');

  const overflow=await sponsor.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+3);
  if(overflow)throw new Error('sponsor public horizontal overflow '+viewport.width+'px');
  if(sponsorErrors.length)throw new Error('sponsor browser errors '+viewport.width+'px: '+sponsorErrors.join(' | '));

  await sponsor.screenshot({path:'test-output/sponsor-'+viewport.width+'x'+viewport.height+'.png',fullPage:true});
  await sponsor.close();
}

mark('API_CHECKS');
const api=await browser.newPage();
const health=await api.request.get(base+'/health');
if(!health.ok())throw new Error('health endpoint failed '+health.status());
const healthJson=await health.json();
if(healthJson.service!=='SCD Super App')throw new Error('invalid health service');

const newsroom=await api.request.get(base+'/api/newsroom');
if(!newsroom.ok())throw new Error('newsroom endpoint failed '+newsroom.status());
const newsroomJson=await newsroom.json();
if(newsroomJson.staleSiteContent!==false||newsroomJson.editorialPolicy!=='VERIFIED_STRUCTURED_FACTS_ONLY')throw new Error('invalid newsroom policy');
if(!Array.isArray(newsroomJson.calendar?.rows)||!Array.isArray(newsroomJson.cards))throw new Error('invalid newsroom payload');

const capabilities=await api.request.get(base+'/api/capabilities');
if(!capabilities.ok())throw new Error('capabilities endpoint failed '+capabilities.status());
const cap=await capabilities.json();
if(typeof cap.featureFlags?.supabaseCore!=='boolean')throw new Error('supabase feature flag missing');

const pwaManifest=await api.request.get(base+'/manifest.webmanifest');
if(!pwaManifest.ok())throw new Error('manifest.webmanifest missing');
const pwaJson=await pwaManifest.json();
if(pwaJson.theme_color!=='#041c3a'||pwaJson.background_color!=='#f2f5f9')throw new Error('SCD Arena PWA colors missing');
for(const resource of ['/sw.js','/robots.txt','/sitemap.xml']){
  const rr=await api.request.get(base+resource);
  if(!rr.ok())throw new Error(resource+' missing');
}
await api.close();

if(allErrors.length)throw new Error('browser errors: '+allErrors.join(' || '));
console.log('SCD NOVA smoke PASS',{viewports:viewports.map(v=>v.width+'x'+v.height)});
await browser.close();
