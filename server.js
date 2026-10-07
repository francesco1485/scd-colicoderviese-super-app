const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const { issueIntakeToken, verifyIntakeToken } = require('./lib/intake-links');
const { weekRange } = require('./lib/scd-one-pulse.js');
const {filterActiveSCDTeamRows,filterPublicSCDPayload}=require('./lib/scd-season-status.js');
const {buildTodayAttentionProjection}=require('./lib/scd-today-attention.js');
const {resolveCommand}=require('./lib/scd-command-grammar.js');
const {
  tournamentSurface,
  unavailableTournamentSurface,
  membershipServicesSurface,
  facilityLogisticsSurface,
  launchReadinessSurface
} = require('./lib/scd-r57-operational-contracts.js');

const PORT = process.env.PORT || 10000;
const ROOT = process.env.SCD_STATIC_DIR ? path.resolve(__dirname,process.env.SCD_STATIC_DIR) : __dirname;
const UPSTREAM = process.env.SCD_APPS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbwYQ_3yLYsp-6jX3FIgufBjpmaZb9uO1AklF9hdG-CuLII9J4ITUX1EA-EKuWXBMEc/exec';
const CACHE_TTL = 10 * 60 * 1000;
const CLUB_TIME_ZONE = 'Europe/Rome';
const DEPLOY_COMMIT = process.env.RENDER_GIT_COMMIT || process.env.SCD_DEPLOY_COMMIT || null;
const PREVIEW_SAFE_MODE = process.env.SCD_PREVIEW_SAFE_MODE === 'true';
const FEATURE_FLAGS = Object.freeze({
  dataFabricObservability: process.env.SCD_FEATURE_DATA_FABRIC_OBSERVABILITY === 'true',
  supabaseCore: process.env.SCD_FEATURE_SUPABASE_CORE === 'true'
});
const SUPABASE_RUNTIME = Object.freeze({
  engine:'SUPABASE_POSTGRESQL',
  configured:Boolean(process.env.SCD_SUPABASE_URL),
  projectId:process.env.SCD_SUPABASE_PROJECT_ID || null,
  mode:FEATURE_FLAGS.supabaseCore?'DUAL_RUN_ACTIVE':'DARK_DUAL_RUN'
});
let liveCache = { at: 0, data: null };

const INTAKE_TEMPLATES = JSON.parse(fs.readFileSync(path.join(__dirname,'config','scd-intake-link-templates.v1.json'),'utf8'));
const SPONSOR_MOTION_PROFILES = JSON.parse(fs.readFileSync(path.join(__dirname,'config','sponsor-motion-profiles.json'),'utf8'));
const SCD_CREATIVE_SCENES = JSON.parse(fs.readFileSync(path.join(__dirname,'config','scd-creative-scenes.json'),'utf8'));
const COMMUNITY_BENEFITS_SNAPSHOT = JSON.parse(fs.readFileSync(path.join(__dirname,'config','community-benefits.snapshot.json'),'utf8'));
const SPONSOR_DEVELOPMENT_SNAPSHOT = JSON.parse(fs.readFileSync(path.join(__dirname,'config','sponsor-development.snapshot.json'),'utf8'));
const R57_LAUNCH_READINESS = JSON.parse(fs.readFileSync(path.join(__dirname,'config','r57-launch-readiness.v1.json'),'utf8'));
const INTAKE_TEMPLATE_MAP = new Map((INTAKE_TEMPLATES.templates||[]).map(x=>[x.slug,x]));
const INTAKE_SECRET = process.env.SCD_INTAKE_LINK_SECRET || '';
const INTAKE_PUBLIC_BASE = (process.env.SCD_PUBLIC_BASE_URL || 'https://scd-universe.onrender.com').replace(/\/$/,'');
const INTAKE_UPLOAD_READY = process.env.SCD_INTAKE_UPLOAD_ADAPTER_READY === 'true';

const ALLOWED_ORIGINS = new Set([
  'https://francesco1485.github.io',
  'https://scd-colicoderviese-official-r21.onrender.com',
  'https://scd-colicoderviese-super-app.onrender.com',
  'https://scd-sponsor-platform.onrender.com',
  'https://scd-universe-synthetic.onrender.com',
  'https://scd-universe-nextgen.onrender.com',
  'https://scd-universe-nova.onrender.com',
  'http://localhost:10000',
  'http://127.0.0.1:10000'
]);
function applyCors(req,res){
  const origin=String(req.headers.origin||'');
  if(ALLOWED_ORIGINS.has(origin)) res.setHeader('access-control-allow-origin',origin);
  res.setHeader('vary','Origin');
  res.setHeader('access-control-allow-methods','GET,POST,OPTIONS');
  res.setHeader('access-control-allow-headers','content-type,x-scd-client');
  res.setHeader('access-control-max-age','86400');
}

const READ_ONLY_RETRY_ACTIONS = new Set([
  'public.feed','public.club','public.calendar','public.datafabric.contract',
  'dashboard.summary','private.dashboard','private.week','account.requests','private.user.workspace','private.crm.summary','private.crm.detail','private.community.summary','private.communication.templates','private.communication.preview',
  'private.attendance.get','private.agenda.summary','private.development.summary','auth.request','auth.login','auth.validate','auth.identity.resolve','direction.access.metrics','direction.diagnostics',
  'direction.evolution','direction.datafabric.status','direction.datafabric.actions'
]);
const UPSTREAM_READ_ATTEMPTS = 2;
const UPSTREAM_RETRY_DELAY_MS = 450;
const UPSTREAM_TIMEOUT_MS = Math.max(1000,Math.min(15000,Number(process.env.SCD_UPSTREAM_TIMEOUT_MS)||5000));
const UPSTREAM_WRITE_TIMEOUT_MS = Math.max(5000,Math.min(30000,Number(process.env.SCD_UPSTREAM_WRITE_TIMEOUT_MS)||15000));
const wait = ms => new Promise(resolve=>setTimeout(resolve,ms));

const allowedActions = new Set([
  'dashboard.summary','private.dashboard','private.week','account.requests','private.user.workspace','private.crm.summary','private.crm.detail','private.community.summary','private.communication.templates','private.communication.preview','private.communication.send','private.communication.health','private.agenda.summary','private.agenda.create','private.development.summary',
  'private.request.submit','private.transport.request','private.message.send',
  'private.convocation.create','private.convocation.reply',
  'private.attendance.get','private.attendance.save',
  'public.feed','public.club','public.register','public.calendar','public.datafabric.contract',
  'public.registration','public.identity.resolve','public.partnerLead','public.communitySubmit','public.ticketSubmit','public.telemetry',
  'auth.request','auth.login','auth.validate','auth.identity.resolve','auth.access.log','auth.pin.change',
  'direction.access.set','direction.access.invite','direction.access.metrics','direction.pin.set','direction.player.approve','direction.player.reject',
  'direction.diagnostics','direction.evolution',
  'direction.datafabric.status','direction.datafabric.actions','direction.datafabric.scan.gmail','direction.datafabric.scan.drive',
]);

function clubTimePayload(){
  const now=new Date();
  const parts=new Intl.DateTimeFormat('it-IT',{
    timeZone:CLUB_TIME_ZONE,weekday:'long',year:'numeric',month:'2-digit',day:'2-digit',
    hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false
  }).formatToParts(now).reduce((o,p)=>(o[p.type]=p.value,o),{});
  return {
    ok:true,
    epochMs:now.getTime(),
    iso:now.toISOString(),
    timeZone:CLUB_TIME_ZONE,
    clubDate:`${parts.year}-${parts.month}-${parts.day}`,
    clubTime:`${parts.hour}:${parts.minute}:${parts.second}`,
    weekday:parts.weekday
  };
}

function json(res, status, data, headers={}) {
  res.writeHead(status, {'content-type':'application/json; charset=utf-8','cache-control':'no-store',...headers});
  res.end(JSON.stringify(data));
}
function readBody(req){return new Promise((resolve,reject)=>{let s='';req.on('data',c=>{s+=c;if(s.length>1_000_000){req.destroy();reject(new Error('Payload troppo grande'))}});req.on('end',()=>resolve(s));req.on('error',reject)})}
function stripHtml(s=''){return String(s).replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&#8217;/g,"'").replace(/\s+/g,' ').trim()}

const SPONSOR_SESSION_COOKIE='scd_sponsor_session';
function parseCookies(req){
  const raw=String(req.headers.cookie||'');
  return raw.split(';').map(x=>x.trim()).filter(Boolean).reduce((o,p)=>{
    const i=p.indexOf('='); if(i<1)return o;
    try{o[p.slice(0,i)]=decodeURIComponent(p.slice(i+1))}catch{o[p.slice(0,i)]=p.slice(i+1)}
    return o;
  },{});
}
function sponsorCookie(req,token,maxAge=21600){
  const secure=String(req.headers['x-forwarded-proto']||'').toLowerCase()==='https'||process.env.NODE_ENV==='production';
  return SPONSOR_SESSION_COOKIE+'='+encodeURIComponent(token||'')+'; Path=/; HttpOnly; SameSite=Lax; Max-Age='+Math.max(0,Number(maxAge)||0)+(secure?'; Secure':'');
}
function sponsorSessionToken(req){return String(parseCookies(req)[SPONSOR_SESSION_COOKIE]||'')}
function sponsorUserFrom(raw){
  const d=unwrapPayload(raw)||{};
  if(d.user)return d.user;
  if(d.data&&d.data.user)return d.data.user;
  if(d.dashboard&&d.dashboard.user)return d.dashboard.user;
  return {};
}
function sponsorLoginPayload(raw){
  const d=unwrapPayload(raw)||{};
  const dash=d.data||d.dashboard||{};
  return {
    token:String(d.token||d.sessionToken||d.accessToken||''),
    user:dash.user||d.user||{},
    permissions:dash.permissions||d.permissions||{}
  };
}
function sponsorRoleKey(user){
  const email=String(user?.email||'').trim().toLowerCase();
  const role=String(user?.role||user?.coreRole||'').trim().toUpperCase();
  const type=String(user?.type||'').trim().toUpperCase();
  if(email==='sportclubcolico@gmail.com'||role==='DG'||role==='DIREZIONE'||type==='DIREZIONE')return 'DIREZIONE';
  if(/COMMERCIAL|COMMERCIALE|SPONSOR|PARTNER|MARKETING|ACCOUNT/.test(role+' '+type))return 'COMMERCIALE';
  return 'NON_AUTORIZZATO';
}
function sponsorStaffAllowed(user){
  return sponsorRoleKey(user)!=='NON_AUTORIZZATO';
}
function sponsorDirection(user){
  return sponsorRoleKey(user)==='DIREZIONE';
}
function sponsorCapabilities(user){
  const profile=sponsorRoleKey(user);
  if(profile==='DIREZIONE')return {
    profile,platform:true,crm:true,communications:true,contracts:true,finance:true,
    catalog:true,conventions:true,events:true,media:true,settings:true,admin:true
  };
  if(profile==='COMMERCIALE')return {
    profile,platform:true,crm:true,communications:true,contracts:true,finance:false,
    catalog:true,conventions:true,events:true,media:true,settings:false,admin:false
  };
  return {profile,platform:false};
}
async function validateSponsorSession(req){
  const token=sponsorSessionToken(req);
  if(!token)throw new Error('SESSION_REQUIRED');
  const {parsed}=await callAppsScript('auth.validate',{token},token);
  const user=sponsorUserFrom(parsed);
  if(!user?.email||!sponsorStaffAllowed(user))throw new Error('SPONSOR_ACCESS_DENIED');
  return {token,user,isDirection:sponsorDirection(user)};
}

function cleanPublicHttpsUrl(value=''){
  try{
    const u=new URL(String(value||'').trim());
    return u.protocol==='https:'?u.toString():'';
  }catch{return ''}
}
function donationConfig(){
  const paymentUrl=cleanPublicHttpsUrl(process.env.SCD_DONATION_PAYMENT_URL||'');
  const paymentTemplateRaw=String(process.env.SCD_DONATION_PAYMENT_URL_TEMPLATE||'').trim();
  const paymentTemplateCheck=paymentTemplateRaw?cleanPublicHttpsUrl(paymentTemplateRaw.replaceAll('{amount}','1.00').replaceAll('{currency}','EUR')):'';
  const paymentTemplate=paymentTemplateCheck?paymentTemplateRaw:'';
  const bankPublic=process.env.SCD_DONATION_BANK_TRANSFER_PUBLIC==='true';
  const iban=String(process.env.SCD_DONATION_IBAN||'').replace(/\s+/g,'').toUpperCase();
  const accountHolder=String(process.env.SCD_DONATION_ACCOUNT_HOLDER||'').trim();
  const bankReady=bankPublic&&/^[A-Z]{2}[0-9A-Z]{13,32}$/.test(iban)&&Boolean(accountHolder);
  return {
    ok:true,
    fund:{
      id:'SCD_SOLIDARITY_FUND',
      name:'Fondo Solidale SCD',
      purpose:'Sostegno alla partecipazione sportiva di ragazzi e famiglie in difficolta, secondo criteri e approvazioni societarie.',
      currency:'EUR',
      presets:[10,25,50,100],
      minAmount:1,
      maxAmount:50000
    },
    channels:{
      online:{
        enabled:Boolean(paymentTemplate||paymentUrl),
        provider:String(process.env.SCD_DONATION_PAYMENT_PROVIDER||'').trim()||null,
        url:paymentUrl||null,
        urlTemplate:paymentTemplate||null,
        amountAware:Boolean(paymentTemplate)
      },
      bankTransfer:{
        enabled:bankReady,
        iban:bankReady?iban:null,
        accountHolder:bankReady?accountHolder:null,
        causal:bankReady?(String(process.env.SCD_DONATION_CAUSAL||'Erogazione liberale Fondo Solidale SCD').trim()):null
      }
    },
    publicDonorWall:false,
    taxBenefitClaim:false,
    note:'La donazione non attribuisce qualifica di socio, tesserato o sponsor. Eventuali agevolazioni fiscali dipendono dalla normativa applicabile e dalla corretta tracciabilita/documentazione.'
  };
}
async function handleDonationConfig(req,res){
  if(req.method!=='GET')return json(res,405,{ok:false,error:'METHOD_NOT_ALLOWED'});
  return json(res,200,donationConfig(),{'cache-control':'public, max-age=60'});
}
async function handleDonationIntent(req,res){
  if(req.method!=='POST')return json(res,405,{ok:false,error:'METHOD_NOT_ALLOWED'});
  try{
    const b=JSON.parse(await readBody(req)||'{}');
    const amount=Number(String(b.amount||'').replace(',','.'));
    if(!Number.isFinite(amount)||amount<1||amount>50000)return json(res,400,{ok:false,error:'Inserisci un importo valido tra 1 e 50.000 euro.'});
    const name=String(b.name||'').trim(),email=String(b.email||'').trim(),phone=String(b.phone||'').trim();
    if(!name||!email||!phone)return json(res,400,{ok:false,error:'Nome, email e telefono sono obbligatori per essere ricontattati.'});
    if(b.privacy!==true)return json(res,400,{ok:false,error:'Devi autorizzare il trattamento dei dati per la richiesta.'});
    const anonymous=b.anonymous===true;
    const donorType=String(b.donorType||'PRIVATO').trim().toUpperCase().slice(0,40);
    const note=String(b.message||'').trim().slice(0,1200);
    const payload={
      kind:'contacts',
      name,email,phone,privacy:true,
      topic:'FONDO SOLIDALE SCD · DONAZIONE SPONTANEA · EUR '+amount.toFixed(2),
      category:'FONDO SOLIDALE',
      message:[
        'Importo indicativo: EUR '+amount.toFixed(2),
        'Tipologia donatore: '+donorType,
        'Richiesta anonimato pubblico: '+(anonymous?'SI':'NO'),
        note?'Nota: '+note:'',
        '',
        'La presente registrazione e una intenzione/contatto e non costituisce conferma di pagamento.'
      ].filter(Boolean).join('\n')
    };
    const result=await callAppsScript('public.ticketSubmit',payload,'');
    const d=requireUpstreamSuccess(result,'Registrazione intenzione donazione')||{};
    return json(res,200,{
      ok:true,
      requestId:d.requestId||'',
      status:d.status||'NUOVA',
      amount:Number(amount.toFixed(2)),
      paymentConfirmed:false,
      message:'Richiesta registrata. Il pagamento si considera effettuato solo tramite un canale ufficiale SCD.'
    });
  }catch(e){
    return json(res,400,{ok:false,error:e.message||'Richiesta di donazione non registrata'});
  }
}

async function handleSponsorLead(req,res){
  if(req.method!=='POST')return json(res,405,{ok:false,error:'METHOD_NOT_ALLOWED'});
  try{
    const b=JSON.parse(await readBody(req)||'{}');
    const name=String(b.name||'').trim(),email=String(b.email||'').trim(),phone=String(b.phone||'').trim(),company=String(b.company||'').trim();
    if(!name||!email||!phone||!company)return json(res,400,{ok:false,error:'Azienda, nome, email e telefono sono obbligatori.'});
    if(b.privacy!==true)return json(res,400,{ok:false,error:'Devi autorizzare il trattamento dei dati per la richiesta.'});
    const project=String(b.project||'').trim();
    const payload={
      kind:'sponsor',name,email,phone,privacy:true,
      topic:'PARTNERSHIP · '+company+' · '+String(b.interest||'Proposta libera')+(project?' · '+project:''),
      category:String(b.sector||''),
      message:'Azienda: '+company+'\nSettore: '+String(b.sector||'')+'\nInteresse: '+String(b.interest||'')+'\nProgetto / area: '+project+'\n\n'+String(b.message||'')
    };
    const result=await callAppsScript('public.partnerLead',payload,'');
    const d=requireUpstreamSuccess(result,'Registrazione richiesta sponsor')||{};
    if(d.notificationSent===false) return json(res,502,{ok:false,stored:true,requestId:d.requestId||'',error:'Richiesta salvata, ma la notifica email alla Direzione non è stata inviata.',mailError:d.notificationError||''});
    return json(res,200,{ok:true,requestId:d.requestId||'',status:d.status||'NUOVA',notification:d.notificationSent===true?'SENT':'UNVERIFIED'});
  }catch(e){return json(res,400,{ok:false,error:e.message||'Richiesta non registrata'})}
}
async function handleSponsorAccessRequest(req,res){
  if(req.method!=='POST')return json(res,405,{ok:false,error:'METHOD_NOT_ALLOWED'});
  try{
    const b=JSON.parse(await readBody(req)||'{}');
    const name=String(b.name||'').trim(),email=String(b.email||'').trim(),phone=String(b.phone||'').trim();
    if(!name||!email||!phone)return json(res,400,{ok:false,error:'Nome, email e telefono sono obbligatori.'});
    if(b.privacy!==true)return json(res,400,{ok:false,error:'Devi autorizzare il trattamento dei dati per la richiesta.'});
    const rel=String(b.relationship||'Altro');
    const payload={
      kind:'contacts',name,email,phone,privacy:true,
      topic:'RICHIESTA ACCESSO SPONSOR PLATFORM · '+rel,
      category:'ACCESSO RISERVATO',
      message:'Rapporto con SCD: '+rel+'\n\nMotivo: '+String(b.message||'')
    };
    const result=await callAppsScript('public.ticketSubmit',payload,'');
    const d=requireUpstreamSuccess(result,'Registrazione richiesta accesso')||{};
    if(d.notificationSent===false) return json(res,502,{ok:false,stored:true,requestId:d.requestId||'',error:'Richiesta salvata, ma la notifica email alla Direzione non è stata inviata.',mailError:d.notificationError||''});
    return json(res,200,{ok:true,requestId:d.requestId||'',status:'IN ATTESA DIREZIONE',notification:d.notificationSent===true?'SENT':'UNVERIFIED'});
  }catch(e){return json(res,400,{ok:false,error:e.message||'Richiesta accesso non registrata'})}
}
async function handleSponsorOtp(req,res){
  if(req.method!=='POST')return json(res,405,{ok:false,error:'METHOD_NOT_ALLOWED'});
  let email='';
  try{
    const b=JSON.parse(await readBody(req)||'{}');
    email=String(b.email||'').trim();
    if(!email)return json(res,400,{ok:false,error:'Inserisci la email.'});
    const result=await callAppsScript('auth.request',{email},'');
    const d=requireUpstreamSuccess(result,'Invio codice temporaneo')||{};
    console.log('[sponsor-auth] otp accepted',email,d.sent===true?'sent':'backend-confirmed');
    return json(res,200,{ok:true,delivery:d.sent===true?'SENT':'BACKEND_CONFIRMED',message:'Richiesta codice accettata dal servizio email SCD.'});
  }catch(e){
    console.error('[sponsor-auth] otp failed',email,e.message||e);
    return json(res,502,{ok:false,error:'Il codice temporaneo non è stato inviato. '+String(e.message||'Servizio email non disponibile')});
  }
}
async function handleSponsorLogin(req,res){
  if(req.method!=='POST')return json(res,405,{ok:false,error:'METHOD_NOT_ALLOWED'});
  try{
    const b=JSON.parse(await readBody(req)||'{}');
    const email=String(b.email||'').trim(),code=String(b.code||b.pin||'').trim();
    const {parsed}=await callAppsScript('auth.login',{email,code},'');
    const login=sponsorLoginPayload(parsed);
    if(!login.token||!login.user?.email)throw new Error('Accesso non valido.');
    if(!sponsorStaffAllowed(login.user))throw new Error('Questo account non è autorizzato alla Sponsor Platform.');
    res.setHeader('set-cookie',sponsorCookie(req,login.token,21600));
    return json(res,200,{ok:true,isDirection:sponsorDirection(login.user),capabilities:sponsorCapabilities(login.user),user:{name:login.user.name,email:login.user.email,role:login.user.role}});
  }catch(e){return json(res,403,{ok:false,error:e.message||'Accesso non autorizzato'})}
}
async function handleSponsorSession(req,res,u){
  if(req.method!=='GET')return json(res,405,{ok:false,error:'METHOD_NOT_ALLOWED'});
  const probe=String(u?.searchParams?.get('probe')||'')==='1';
  try{
    const s=await validateSponsorSession(req);
    return json(res,200,{ok:true,authenticated:true,isDirection:s.isDirection,capabilities:sponsorCapabilities(s.user),user:{name:s.user.name,email:s.user.email,role:s.user.role}});
  }catch(e){
    if(probe)return json(res,200,{ok:true,authenticated:false});
    return json(res,401,{ok:false,error:'SESSION_REQUIRED'});
  }
}
async function handleSponsorLogout(req,res){
  res.setHeader('set-cookie',sponsorCookie(req,'',0));
  return json(res,200,{ok:true});
}
async function handleSponsorCrm(req,res,u){
  if(req.method!=='GET')return json(res,405,{ok:false,error:'METHOD_NOT_ALLOWED'});
  try{
    const s=await validateSponsorSession(req);
    const id=String(u.searchParams.get('id')||'').trim();
    const action=id?'private.crm.detail':'private.crm.summary';
    const payload=id?{id}:{limit:Math.max(1,Math.min(500,Number(u.searchParams.get('limit')||250)))};
    const {parsed}=await callAppsScript(action,payload,s.token);
    const d=unwrapPayload(parsed);
    return json(res,200,{ok:true,data:d},{'cache-control':'no-store'});
  }catch(e){
    return json(res,403,{ok:false,error:e.message||'CRM_ACCESS_DENIED'});
  }
}
async function handleSponsorMailHealth(req,res){
  if(req.method!=='GET')return json(res,405,{ok:false,error:'METHOD_NOT_ALLOWED'});
  try{
    const s=await validateSponsorSession(req);
    const result=await callAppsScript('private.communication.health',{},s.token);
    const d=requireUpstreamSuccess(result,'Diagnostica email');
    return json(res,200,{ok:true,data:d},{'cache-control':'no-store'});
  }catch(e){
    const code=e.message==='SESSION_REQUIRED'?401:502;
    return json(res,code,{ok:false,error:e.message||'MAIL_HEALTH_FAILED'});
  }
}
async function handleSponsorCreativeScenes(req,res){
  if(req.method!=='GET')return json(res,405,{ok:false,error:'METHOD_NOT_ALLOWED'});
  try{
    await validateSponsorSession(req);
    return json(res,200,{ok:true,data:SCD_CREATIVE_SCENES},{'cache-control':'no-store'});
  }catch(e){
    return json(res,e.message==='SESSION_REQUIRED'?401:403,{ok:false,error:e.message||'CREATIVE_SCENES_ACCESS_DENIED'});
  }
}
async function handleSponsorCommunity(req,res){
  if(req.method!=='GET')return json(res,405,{ok:false,error:'METHOD_NOT_ALLOWED'});
  try{
    const s=await validateSponsorSession(req);
    try{
      const result=await callAppsScript('private.community.summary',{},s.token);
      const d=requireUpstreamSuccess(result,'Community master');
      return json(res,200,{ok:true,data:d},{'cache-control':'no-store'});
    }catch(upstreamError){
      return json(res,200,{
        ok:true,
        data:{
          ...COMMUNITY_BENEFITS_SNAPSHOT,
          sourceMode:'SNAPSHOT_FALLBACK',
          fallbackReason:'LIVE_MASTER_BRIDGE_NOT_AVAILABLE'
        }
      },{'cache-control':'no-store'});
    }
  }catch(e){
    return json(res,e.message==='SESSION_REQUIRED'?401:403,{ok:false,error:e.message||'COMMUNITY_ACCESS_DENIED'});
  }
}
async function handleSponsorMotionProfiles(req,res){
  if(req.method!=='GET')return json(res,405,{ok:false,error:'METHOD_NOT_ALLOWED'});
  try{
    await validateSponsorSession(req);
    return json(res,200,{ok:true,data:SPONSOR_MOTION_PROFILES},{'cache-control':'no-store'});
  }catch(e){
    return json(res,e.message==='SESSION_REQUIRED'?401:403,{ok:false,error:e.message||'MOTION_PROFILES_ACCESS_DENIED'});
  }
}
async function handleSponsorCommunication(req,res){
  try{
    const s=await validateSponsorSession(req);
    if(req.method==='GET'){
      const {parsed}=await callAppsScript('private.communication.templates',{},s.token);
      return json(res,200,{ok:true,data:unwrapPayload(parsed)},{'cache-control':'no-store'});
    }
    if(req.method!=='POST')return json(res,405,{ok:false,error:'METHOD_NOT_ALLOWED'});
    const body=JSON.parse(await readBody(req)||'{}');
    const mode=String(body.mode||'preview').toLowerCase();
    if(!['preview','send'].includes(mode))return json(res,400,{ok:false,error:'MODE_NOT_ALLOWED'});
    const action=mode==='send'?'private.communication.send':'private.communication.preview';
    const payload={...body};delete payload.mode;
    const {parsed}=await callAppsScript(action,payload,s.token);
    const d=unwrapPayload(parsed);
    if(parsed&&parsed.ok===false)return json(res,400,{ok:false,error:parsed.error||'COMMUNICATION_FAILED'});
    return json(res,200,{ok:true,data:d},{'cache-control':'no-store'});
  }catch(e){
    const code=e.message==='SESSION_REQUIRED'?401:400;
    return json(res,code,{ok:false,error:e.message||'COMMUNICATION_FAILED'});
  }
}

async function handleSponsorAgenda(req,res){
  try{
    const s=await validateSponsorSession(req);
    if(req.method==='GET'){
      const {parsed}=await callAppsScript('private.agenda.summary',{},s.token);
      if(parsed&&parsed.ok===false)return json(res,400,{ok:false,error:parsed.error||'AGENDA_SUMMARY_FAILED'});
      return json(res,200,{ok:true,data:unwrapPayload(parsed)},{'cache-control':'no-store'});
    }
    if(req.method!=='POST')return json(res,405,{ok:false,error:'METHOD_NOT_ALLOWED'});
    const body=JSON.parse(await readBody(req)||'{}');
    const {parsed}=await callAppsScript('private.agenda.create',body,s.token);
    if(parsed&&parsed.ok===false)return json(res,400,{ok:false,error:parsed.error||'AGENDA_CREATE_FAILED'});
    return json(res,200,{ok:true,data:unwrapPayload(parsed)},{'cache-control':'no-store'});
  }catch(e){
    const code=e.message==='SESSION_REQUIRED'?401:400;
    return json(res,code,{ok:false,error:e.message||'AGENDA_FAILED'});
  }
}

async function handleSponsorDevelopment(req,res){
  if(req.method!=='GET')return json(res,405,{ok:false,error:'METHOD_NOT_ALLOWED'});
  let session;
  try{
    session=await validateSponsorSession(req);
  }catch(e){
    return json(res,401,{ok:false,error:e.message||'SESSION_REQUIRED'});
  }
  try{
    const {parsed}=await callAppsScript('private.development.summary',{},session.token);
    const data=unwrapPayload(parsed);
    if(parsed&&parsed.ok!==false&&data&&data.sourceMode==='LIVE_MASTER'&&Array.isArray(data.rows)){
      return json(res,200,{ok:true,data},{'cache-control':'no-store'});
    }
    throw new Error(parsed?.error||'DEVELOPMENT_LIVE_MASTER_NOT_READY');
  }catch(e){
    const snap=SPONSOR_DEVELOPMENT_SNAPSHOT;
    const valid=snap&&snap.schema==='SCD_SPONSOR_DEVELOPMENT_SNAPSHOT_V1'&&snap.sourceMode==='SNAPSHOT_VERIFIED'&&Array.isArray(snap.rows)&&snap.rows.length>0&&snap.source?.spreadsheetId==='1jb5Jt1ZYzJA-3oQd85AmwVhAoFQpBPfcsy4HupBzDFA';
    if(!valid)return json(res,503,{ok:false,error:'DEVELOPMENT_SOURCE_UNAVAILABLE'});
    return json(res,200,{ok:true,data:{...snap,fallbackReason:String(e.message||'LIVE_MASTER_NOT_READY'),liveMasterReady:false}},{'cache-control':'no-store'});
  }
}

async function serveSponsorPrivate(req,res,u){
  try{
    await validateSponsorSession(req);
    if(u.pathname==='/sponsor/app'||u.pathname==='/sponsor/app/'||u.pathname==='/sponsor/app.html')return serveStatic(req,res,'/sponsor/app.html');
    if(u.pathname==='/sponsor/app.js')return serveStatic(req,res,'/sponsor/app.js');
    return json(res,404,{ok:false,error:'NOT_FOUND'});
  }catch(e){
    if(req.method==='GET'&&/text\/html/.test(String(req.headers.accept||''))){
      res.writeHead(302,{location:'/sponsor/?access=1','cache-control':'no-store'});return res.end();
    }
    return json(res,401,{ok:false,error:'ACCESS_REQUIRED'});
  }
}

function decodeXml(s=''){return String(s).replace(/<!\[CDATA\[|\]\]>/g,'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>')}

async function callAppsScript(action,payload={},sessionToken=''){
  if(PREVIEW_SAFE_MODE&&!READ_ONLY_RETRY_ACTIONS.has(action)){
    const error=new Error('Anteprima in sola lettura: azione bloccata');
    error.code='PREVIEW_READ_ONLY';
    throw error;
  }
  const maxAttempts=READ_ONLY_RETRY_ACTIONS.has(action)?UPSTREAM_READ_ATTEMPTS:1;
  let lastError;
  for(let attempt=1;attempt<=maxAttempts;attempt++){
    try{
      const upstream=await fetch(UPSTREAM,{
        method:'POST',
        redirect:'follow',
        headers:{'content-type':'application/json','user-agent':'SCD-ColicoDerviese-Bridge/30.0'},
        signal:AbortSignal.timeout(READ_ONLY_RETRY_ACTIONS.has(action)?UPSTREAM_TIMEOUT_MS:UPSTREAM_WRITE_TIMEOUT_MS),
        body:JSON.stringify({action,payload,sessionToken})
      });
      const text=await upstream.text();
      let parsed;
      try{parsed=JSON.parse(text)}
      catch{
        const err=new Error('Risposta backend non valida');
        err.code='UPSTREAM_INVALID_JSON';
        err.httpStatus=upstream.status;
        throw err;
      }
      const publicParsed=/^public\.(calendar|feed)$/.test(action)?filterPublicSCDPayload(parsed):parsed;
      return {upstream,parsed:publicParsed,attempt};
    }catch(error){
      lastError=error;
      if(attempt>=maxAttempts) break;
      console.warn('[api/scd] retry read-only',action,'attempt',attempt,'reason',error.code||error.message||error);
      await wait(UPSTREAM_RETRY_DELAY_MS);
    }
  }
  throw lastError||new Error('Backend SCD non disponibile');
}

async function proxyAppsScript(req,res){
  if(req.method!=='POST') return json(res,405,{ok:false,error:'Metodo non consentito'});
  try{
    const raw = await readBody(req); const body = JSON.parse(raw||'{}'); const action=String(body.action||''); const started=Date.now(); console.log('[api/scd] incoming',action,req.headers.origin||'server');
    if(!allowedActions.has(action)) return json(res,400,{ok:false,error:'Azione non consentita'});
    const {upstream,parsed,attempt}=await callAppsScript(action,body.payload||{},body.sessionToken||'');
    console.log('[api/scd] upstream',action,upstream.status,(Date.now()-started)+'ms','attempt',attempt); return json(res,upstream.ok?200:400,parsed);
  }catch(e){
    console.error('[api/scd] failed',e.message||e);
    if(e.code==='PREVIEW_READ_ONLY')return json(res,403,{ok:false,error:e.message,code:e.code});
    return json(res,502,{ok:false,error:e.message||'Backend SCD non disponibile'});
  }
}


function safeIntakeTemplate(t){
  if(!t)return null;
  return {
    id:t.id,slug:t.slug,title:t.title,category:t.category,audience:t.audience,
    accessMode:t.access_mode,maxFiles:t.max_files,acceptedTypes:t.accepted_types||[],
    documentTypes:t.document_types||[],sensitive:Boolean(t.sensitive),
    uploadReady:INTAKE_UPLOAD_READY
  };
}
function intakeRoleAllowed(raw){
  const d=unwrapPayload(raw)||{},u=d.user||d.profile||d||{},p=d.permissions||{};
  const role=String(u.role||u.coreRole||u.type||'').toUpperCase();
  return p.direction===true||role==='DIREZIONE'||role==='ADMIN';
}
async function validateDirectionSession(token){
  if(!token)throw new Error('SESSION_REQUIRED');
  const {parsed}=await callAppsScript('auth.validate',{token},token);
  if(!intakeRoleAllowed(parsed))throw new Error('DIRECTION_SCOPE_REQUIRED');
  return unwrapPayload(parsed);
}
async function bestEffortIntakeAudit(event,payload={}){
  try{
    await callAppsScript('public.telemetry',{
      event,
      section:'intake_hub',
      payload:{...payload,token:undefined,sessionToken:undefined}
    },'');
  }catch(e){console.warn('[intake:audit] telemetry unavailable',event,e.message||e)}
}
async function handleIntakeForm(req,res,u){
  const slug=String(u.searchParams.get('slug')||'').trim().toLowerCase();
  const token=String(u.searchParams.get('token')||'');
  const t=INTAKE_TEMPLATE_MAP.get(slug);
  if(!t||t.enabled!==true)return json(res,404,{ok:false,error:'FORM_NOT_FOUND'});
  const verified=verifyIntakeToken(token,{secret:INTAKE_SECRET,slug});
  if(!verified.ok)return json(res,403,{ok:false,error:'LINK_INVALID',reason:verified.error});
  bestEffortIntakeAudit('intake_form_open',{linkId:t.id,slug,mode:verified.payload.mode});
  return json(res,200,{ok:true,runtimeState:INTAKE_UPLOAD_READY?'READY':'UPLOAD_ADAPTER_NOT_CONNECTED',form:safeIntakeTemplate(t)});
}
async function handleIntakeAdminTemplates(req,res){
  if(req.method!=='POST')return json(res,405,{ok:false,error:'METHOD_NOT_ALLOWED'});
  try{
    const body=JSON.parse(await readBody(req)||'{}');
    await validateDirectionSession(body.sessionToken||'');
    return json(res,200,{ok:true,uploadReady:INTAKE_UPLOAD_READY,templates:(INTAKE_TEMPLATES.templates||[]).filter(x=>x.enabled).map(safeIntakeTemplate)});
  }catch(e){return json(res,403,{ok:false,error:e.message||'ACCESS_DENIED'})}
}
async function handleIntakeAdminLink(req,res){
  if(req.method!=='POST')return json(res,405,{ok:false,error:'METHOD_NOT_ALLOWED'});
  try{
    if(!INTAKE_SECRET||INTAKE_SECRET.length<24)return json(res,503,{ok:false,error:'LINK_FACTORY_NOT_CONFIGURED'});
    const body=JSON.parse(await readBody(req)||'{}');
    const actor=await validateDirectionSession(body.sessionToken||'');
    const slug=String(body.slug||'').trim().toLowerCase();
    const t=INTAKE_TEMPLATE_MAP.get(slug);
    if(!t||t.enabled!==true)return json(res,404,{ok:false,error:'FORM_NOT_FOUND'});
    const hours=Math.max(1,Math.min(720,Number(body.expiresHours)||72));
    const token=issueIntakeToken({slug,mode:t.access_mode||'TOKENIZED',expiresInSeconds:hours*3600,secret:INTAKE_SECRET});
    const url=INTAKE_PUBLIC_BASE+'/intake/?form='+encodeURIComponent(slug)+'&token='+encodeURIComponent(token);
    const who=String(actor?.user?.email||actor?.email||actor?.user?.name||'direction');
    await bestEffortIntakeAudit('intake_link_issued',{linkId:t.id,slug,expiresHours:hours,issuedBy:who});
    console.log('[intake:link] issued',t.id,slug,'ttlHours',hours);
    return json(res,200,{ok:true,linkId:t.id,slug,url,expiresHours:hours,uploadReady:INTAKE_UPLOAD_READY});
  }catch(e){
    const code=e.message==='SESSION_REQUIRED'||e.message==='DIRECTION_SCOPE_REQUIRED'?403:400;
    return json(res,code,{ok:false,error:e.message||'LINK_ISSUE_FAILED'});
  }
}

async function fetchPublicFeed(){
  try{
    const {parsed}=await callAppsScript('public.feed',{limit:40},'');
    return parsed;
  }catch(e){return {ok:false,error:String(e.message||e)}}
}
async function handleTournaments(req,res){
  if(req.method!=='GET')return json(res,405,{ok:false,error:'METHOD_NOT_ALLOWED'});
  try{
    const {upstream,parsed}=await callAppsScript('public.calendar',{rangeKey:'ALL',offset:0,limit:500},'');
    if(!upstream.ok||parsed?.ok===false)throw new Error('PUBLIC_CALENDAR_SOURCE_UNAVAILABLE');
    return json(res,200,tournamentSurface(parsed),{'cache-control':'no-store'});
  }catch{
    return json(res,503,unavailableTournamentSurface(),{'cache-control':'no-store'});
  }
}
function handleMembershipServices(req,res){
  if(req.method!=='GET')return json(res,405,{ok:false,error:'METHOD_NOT_ALLOWED'});
  return json(res,200,membershipServicesSurface(),{'cache-control':'no-store'});
}
function handleFacilityLogistics(req,res){
  if(req.method!=='GET')return json(res,405,{ok:false,error:'METHOD_NOT_ALLOWED'});
  return json(res,200,facilityLogisticsSurface(),{'cache-control':'no-store'});
}
function handleLaunchReadiness(req,res){
  if(req.method!=='GET')return json(res,405,{ok:false,error:'METHOD_NOT_ALLOWED'});
  try{
    return json(res,200,launchReadinessSurface(R57_LAUNCH_READINESS),{'cache-control':'no-store'});
  }catch{
    return json(res,503,{ok:false,state:'UNAVAILABLE',error:'READINESS_CONFIG_INVALID'},{'cache-control':'no-store'});
  }
}
function pick(obj,...keys){
  for(const key of keys){
    const value=obj?.[key];
    if(value!=null&&String(value).trim()!=='')return value;
  }
  return '';
}
function unwrapPayload(raw){
  if(raw&&raw.ok===true&&raw.data!=null)return raw.data;
  if(raw&&raw.data!=null&&Object.keys(raw).length<=4)return raw.data;
  return raw;
}
function requireUpstreamSuccess(result,label='Operazione'){
  const status=Number(result?.upstream?.status||0);
  const parsed=result?.parsed;
  if(!result?.upstream?.ok) throw new Error(label+' non riuscita: backend HTTP '+(status||'non disponibile'));
  if(parsed&&parsed.ok===false) throw new Error(parsed.error||label+' non riuscita nel backend SCD');
  return unwrapPayload(parsed);
}
function rowsFrom(raw){
  const data=unwrapPayload(raw);
  if(Array.isArray(data))return data;
  return data?.rows||data?.items||data?.events||data?.calendar||data?.feed||data?.highlights||[];
}
function isoDateOnly(value){
  const text=String(value||'').trim();
  if(!text)return '';
  let m=text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(m)return m[1]+'-'+m[2]+'-'+m[3];
  m=text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
  if(m)return m[3]+'-'+String(m[2]).padStart(2,'0')+'-'+String(m[1]).padStart(2,'0');
  const d=new Date(text);
  return Number.isFinite(d.getTime())?d.toISOString().slice(0,10):'';
}
function romeDateParts(date=new Date()){
  return new Intl.DateTimeFormat('en-CA',{timeZone:CLUB_TIME_ZONE,year:'numeric',month:'2-digit',day:'2-digit',weekday:'short'}).formatToParts(date).reduce((o,p)=>(o[p.type]=p.value,o),{});
}
function currentClubWeek(){
  return weekRange(new Date());
}
function eventKind(row){
  const text=[pick(row,'type','kind','eventType'),pick(row,'title','event','name','subject')].join(' ');
  if(/allenament|training/i.test(text))return 'TRAINING';
  if(/gara|partita|campionato|coppa|amichevole|match/i.test(text))return 'MATCH';
  if(/torneo|tournament/i.test(text))return 'TOURNAMENT';
  return 'EVENT';
}
function teamLabel(row){
  return String(pick(row,'team','teamName','squadra','category','categoria','ageGroup','annata')||'SCD').trim();
}
function resultText(row){
  return String(pick(row,'result','score','risultato','finalScore')||'').trim();
}
function feedRows(raw){
  const data=unwrapPayload(raw);
  if(Array.isArray(data))return data;
  return data?.items||data?.feed||data?.highlights||data?.rows||[];
}
function safeInternalFeed(rows){
  return rows.filter(row=>{
    const source=String(pick(row,'source','fonte','feedType','kind')||'').toLowerCase();
    const url=String(pick(row,'sourceUrl','url','link')||'').toLowerCase();
    return !/official_site|sito ufficiale|google news|web_news|instagram|facebook/.test(source+' '+url);
  });
}
function extractStructuredResults(rows){
  return safeInternalFeed(rows).filter(row=>{
    const text=[pick(row,'status'),pick(row,'title','subject','event'),pick(row,'message')].join(' ');
    return Boolean(resultText(row))||/risultat|finale|terminat|full time/i.test(text);
  });
}
function extractStandings(rows){
  return safeInternalFeed(rows).filter(row=>{
    return pick(row,'position','rank','posizione')!==''||pick(row,'points','punti')!=='';
  });
}
function initiativeRows(raw){
  const data=unwrapPayload(raw);
  const direct=data?.initiatives||data?.events||[];
  return Array.isArray(direct)?direct:[];
}
function evidenceFor(row,kind){
  return {
    kind,
    source:String(pick(row,'source','fonte')||'R20_STRUCTURED'),
    recordId:String(pick(row,'id','eventId','uid','code')||''),
    date:isoDateOnly(pick(row,'date','data','eventDate','startDate')),
    fields:Object.fromEntries(
      ['team','teamName','squadra','title','event','name','result','score','risultato','position','rank','points','punti','venue','luogo']
        .filter(k=>row?.[k]!=null&&String(row[k]).trim()!=='')
        .map(k=>[k,row[k]])
    )
  };
}
function readWeeklyEditorial(weekStart){
  try{
    const file=path.join(ROOT,'content','weekly-news.json');
    const raw=JSON.parse(fs.readFileSync(file,'utf8'));
    if(raw?.status!=='PUBLISHED')return null;
    if(String(raw.weekStart||'')!==String(weekStart||''))return null;
    if(!Array.isArray(raw.cards)||!raw.cards.length)return null;
    return raw;
  }catch{return null}
}
async function buildWeeklyNewsroom(){
  const week=currentClubWeek();
  let calendarRaw=null,feedRaw=null;
  const sourceStatus={calendar:'ERROR',feed:'ERROR',officialSite:'DISABLED_FOR_NEWS',webNews:'DISABLED_FOR_NEWS'};
  try{
    const c=await callAppsScript('public.calendar',{rangeKey:'ALL',offset:0},'');
    if(!c.upstream.ok||c.parsed?.ok===false)throw new Error('PUBLIC_CALENDAR_SOURCE_UNAVAILABLE');
    calendarRaw=c.parsed;sourceStatus.calendar='OK';
  }catch(e){sourceStatus.calendar='ERROR:'+String(e.code||e.message||e)}
  try{
    const f=await callAppsScript('public.feed',{limit:80},'');
    feedRaw=f.parsed;sourceStatus.feed='OK';
  }catch(e){sourceStatus.feed='ERROR:'+String(e.code||e.message||e)}

  const allCalendar=filterActiveSCDTeamRows(rowsFrom(calendarRaw)).map((row,i)=>({
    id:pick(row,'id','eventId','uid')||'CAL-'+i,
    title:String(pick(row,'title','event','name','subject')||'Attività SCD'),
    date:isoDateOnly(pick(row,'date','data','startDate')),
    time:String(pick(row,'time','ora','startTime')||''),
    endTime:String(pick(row,'endTime','fine')||''),
    team:teamLabel(row),
    category:String(pick(row,'category','categoria','ageGroup','annata')||''),
    opponent:String(pick(row,'opponent','opponentName','avversario')||''),
    competition:String(pick(row,'competition','campionato','league')||''),
    venue:String(pick(row,'venue','luogo','field','location')||''),
    kind:eventKind(row),
    source:String(pick(row,'source','fonte')||'R20_CALENDAR')
  })).filter(x=>x.date);

  const calendar=allCalendar.filter(x=>x.date>=week.start&&x.date<=week.end);
  const nowParts=romeDateParts();
  const today=nowParts.year+'-'+nowParts.month+'-'+nowParts.day;
  const horizonDate=new Date(today+'T12:00:00Z');
  horizonDate.setUTCDate(horizonDate.getUTCDate()+30);
  const horizon=new Intl.DateTimeFormat('en-CA',{timeZone:'UTC',year:'numeric',month:'2-digit',day:'2-digit'}).format(horizonDate);
  const upcomingEvents=allCalendar
    .filter(x=>x.date>=today&&x.date<=horizon&&x.kind!=='TRAINING')
    .sort((a,b)=>(a.date+'T'+(a.time||'00:00')).localeCompare(b.date+'T'+(b.time||'00:00')))
    .slice(0,20);

  const teams=[...new Set(calendar.map(x=>x.category||x.team).filter(x=>x&&x!=='SCD'))];
  const matches=calendar.filter(x=>x.kind==='MATCH');
  const trainings=calendar.filter(x=>x.kind==='TRAINING');
  const tournaments=calendar.filter(x=>x.kind==='TOURNAMENT');
  const feed=feedRows(feedRaw);
  const results=extractStructuredResults(feed).slice(0,8);
  const standings=extractStandings(feed).slice(0,12);
  const feedData=unwrapPayload(feedRaw)||{};
  const rawPartners=Array.isArray(feedData.sponsors)?feedData.sponsors:(Array.isArray(feedData.partners)?feedData.partners:[]);
  const partners=rawPartners
    .filter(row=>row?.verified===true||/attiv|confermat|documentat|verified/i.test(String(pick(row,'status','state','stato')||'')))
    .map((row,i)=>({
      id:String(pick(row,'id','code')||'PARTNER-'+i),
      name:String(pick(row,'name','company','ragioneSociale','sponsor')||'').trim(),
      tier:String(pick(row,'tier','category','area')||''),
      source:String(pick(row,'source','fonte')||'R20_PUBLIC_FEED')
    }))
    .filter(x=>x.name)
    .slice(0,20);
  const rawProfiles=Array.isArray(feedData.publicProfiles)?feedData.publicProfiles:[];
  const publicProfiles=rawProfiles
    .filter(row=>row?.public===true||row?.authorizedPublic===true||row?.publiclySearchable===true)
    .map((row,i)=>({
      id:String(pick(row,'id','profileId')||'PUBLIC-'+i),
      displayName:String(pick(row,'displayName','name')||'').trim(),
      role:String(pick(row,'role','label')||''),
      team:String(pick(row,'team','category')||'')
    }))
    .filter(x=>x.displayName)
    .slice(0,50);
  const initiatives=initiativeRows(feedRaw).filter(x=>{
    const d=isoDateOnly(pick(x,'date','eventDate','data'));
    return !d||d>=week.start;
  }).slice(0,6);

  const cards=[];
  if(calendar.length){
    cards.push({
      id:'week-overview',
      category:'SETTIMANA SCD',
      title:calendar.length+' attività, tutte le annate insieme',
      dek:matches.length+' gare · '+trainings.length+' allenamenti'+(tournaments.length?' · '+tournaments.length+' tornei':'')+' · '+teams.length+' gruppi/annate rilevati.',
      body:'Il calendario settimanale viene costruito dai dati sportivi strutturati SCD. Nessun contenuto del vecchio sito viene usato per riempire questa sintesi.',
      evidence:calendar.slice(0,12).map(x=>({kind:'CALENDAR',source:x.source,recordId:x.id,date:x.date,fields:{team:x.team,category:x.category,title:x.title,kind:x.kind,venue:x.venue}}))
    });
  }
  if(results.length){
    const first=results[0],team=teamLabel(first),score=resultText(first)||String(pick(first,'message')||'Risultato inserito');
    cards.push({
      id:'results',
      category:'RISULTATI',
      title:'I risultati inseriti diventano racconto',
      dek:team+' · '+score,
      body:results.length===1?'Un risultato verificato alimenta la sintesi settimanale.':'Sono presenti '+results.length+' risultati strutturati: la Newsroom li usa per creare il riepilogo senza commenti presi da siti datati.',
      evidence:results.map(x=>evidenceFor(x,'RESULT'))
    });
  }
  if(standings.length){
    const first=standings[0],team=teamLabel(first),position=pick(first,'position','rank','posizione'),points=pick(first,'points','punti');
    cards.push({
      id:'standings',
      category:'CLASSIFICHE',
      title:'Classifica: dati, non opinioni',
      dek:[team,position!==''?'posizione '+position:'',points!==''?points+' punti':''].filter(Boolean).join(' · '),
      body:'La classifica viene raccontata soltanto quando posizione o punti arrivano da un dato strutturato verificabile.',
      evidence:standings.map(x=>evidenceFor(x,'STANDING'))
    });
  }
  if(initiatives.length){
    const first=initiatives[0];
    cards.push({
      id:'territory',
      category:'TERRITORIO & CLUB',
      title:String(pick(first,'title','event','name')||'Iniziative SCD e territorio'),
      dek:[isoDateOnly(pick(first,'date','eventDate','data')),pick(first,'venue','luogo','place')].filter(Boolean).join(' · '),
      body:'Le iniziative vengono collegate al racconto sportivo quando esistono dati interni verificati. Il sistema non completa i vuoti con articoli vecchi.',
      evidence:initiatives.map(x=>evidenceFor(x,'INITIATIVE'))
    });
  }
  if(!cards.length){
    cards.push({
      id:'waiting-for-facts',
      category:'SCD NEWSROOM AI',
      title:'Nessuna notizia automatica senza dati verificati',
      dek:'La Newsroom resta vuota invece di recuperare commenti o articoli datati.',
      body:'Quando vengono inseriti calendario, risultati, classifiche o iniziative, la sintesi settimanale si rigenera automaticamente.',
      evidence:[]
    });
  }

  const editorial=readWeeklyEditorial(week.start);
  const mergedCards=editorial
    ?[...cards.filter(x=>x.id==='week-overview'),...editorial.cards,...cards.filter(x=>x.id!=='week-overview'&&!editorial.cards.some(y=>y.id===x.id))]
    :cards;
  return {
    ok:true,
    release:'R40',
    generator:editorial?'CHATGPT_WEEKLY_EDITORIAL_PLUS_GROUNDED_RUNTIME':'SCD_NEWSROOM_GROUNDED_V1',
    editorialPolicy:'VERIFIED_STRUCTURED_FACTS_ONLY',
    staleSiteContent:false,
    generatedAt:new Date().toISOString(),
    week,
    sources:{...sourceStatus,weeklyEditorial:editorial?'PUBLISHED':'NO_CURRENT_PUBLISHED_EDITORIAL'},
    editorial:editorial?{generatedAt:editorial.generatedAt,generatedBy:editorial.generatedBy,sourceCount:(editorial.sources||[]).length}:null,
    calendar:{rows:calendar,counts:{activities:calendar.length,matches:matches.length,trainings:trainings.length,tournaments:tournaments.length,groups:teams.length},groups:teams},
    upcomingEvents,
    sportData:{
      results:results.map((row,i)=>({
        id:String(pick(row,'id','eventId','uid')||'RESULT-'+i),
        team:teamLabel(row),
        opponent:String(pick(row,'opponent','opponentName','avversario')||''),
        result:resultText(row)||String(pick(row,'message')||''),
        date:isoDateOnly(pick(row,'date','data','eventDate')),
        competition:String(pick(row,'competition','campionato','league')||''),
        source:String(pick(row,'source','fonte')||'R20_STRUCTURED')
      })),
      standings:standings.map((row,i)=>({
        id:String(pick(row,'id','code')||'STANDING-'+i),
        team:teamLabel(row),
        position:String(pick(row,'position','rank','posizione')||''),
        points:String(pick(row,'points','punti')||''),
        played:String(pick(row,'played','games','giocate')||''),
        wins:String(pick(row,'wins','vittorie')||''),
        draws:String(pick(row,'draws','pareggi')||''),
        losses:String(pick(row,'losses','sconfitte')||''),
        source:String(pick(row,'source','fonte')||'R20_STRUCTURED')
      })),
      headToHead:[],
      headToHeadState:'UNVERIFIED_NOT_CONNECTED'
    },
    partners,
    publicProfiles,
    cards:mergedCards
  };
}

async function getLiveRadar(){
  return {
    ok:true,
    generatedAt:new Date().toISOString(),
    policy:'DISABLED_FOR_NEWS_UNTIL_FRESHNESS_GUARANTEED',
    sources:[
      {name:'Sito ufficiale SCD',status:'DISABLED_FOR_NEWS'},
      {name:'Web/Google News',status:'DISABLED_FOR_NEWS'}
    ],
    items:[]
  };
}

const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon','.xml':'application/xml; charset=utf-8','.txt':'text/plain; charset=utf-8'};
function serveStatic(req,res,overridePath){
  const u=new URL(req.url,'http://localhost'); let pathname=overridePath||decodeURIComponent(u.pathname);
  if(pathname==='/'||pathname==='') pathname='/index.html';
  const file=path.normalize(path.join(ROOT,pathname)); if(!file.startsWith(ROOT)) {res.writeHead(403);return res.end('Forbidden')}
  fs.stat(file,(err,st)=>{
    if(err){res.writeHead(404);return res.end('Not found')}
    const target=st.isDirectory()?path.join(file,'index.html'):file;
    fs.stat(target,(err2,st2)=>{
      if(err2||!st2.isFile()){res.writeHead(404);return res.end('Not found')}
      const ext=path.extname(target).toLowerCase();
      const cache=/\.(png|jpg|jpeg|webp|svg)$/.test(ext)?'public, max-age=86400':'no-store';
      res.writeHead(200,{'content-type':mime[ext]||'application/octet-stream','cache-control':cache});
      fs.createReadStream(target).pipe(res)
    })
  })
}


function coreBrainPriorityValue(value){
  const v=String(value||'').trim().toUpperCase();
  if(['CRITICA','CRITICAL','URGENTE','URGENT','P0'].includes(v))return 4;
  if(['ALTA','HIGH','P1'].includes(v))return 3;
  if(['MEDIA','MEDIUM','P2'].includes(v))return 2;
  if(['BASSA','LOW','P3'].includes(v))return 1;
  return 0;
}
function coreBrainPick(row,...keys){
  for(const k of keys){
    const v=row?.[k];
    if(v!==undefined&&v!==null&&String(v).trim()!=='')return v;
  }
  return '';
}
function coreBrainRows(raw){
  const d=unwrapPayload(raw);
  if(Array.isArray(d))return d;
  if(!d||typeof d!=='object')return [];
  const direct=['rows','items','tasks','requests','alerts','priorities','deadlines','activities','events','actions'];
  for(const k of direct)if(Array.isArray(d[k]))return d[k];
  return [];
}
function coreBrainActionFromRow(row,channel,index){
  if(!row||typeof row!=='object')return null;
  const title=String(coreBrainPick(row,'title','subject','name','task','azione','action','descrizione','description')||'').trim();
  const nextAction=String(coreBrainPick(row,'nextAction','next_action','prossimaAzione','prossima_azione')||'').trim();
  const status=String(coreBrainPick(row,'status','stato')||'').trim();
  const priority=String(coreBrainPick(row,'priority','priorita','priorità')||'').trim();
  const due=String(coreBrainPick(row,'dueDate','deadline','scadenza','date','data')||'').trim();
  const owner=String(coreBrainPick(row,'owner','responsabile','assignee','referente')||'').trim();
  const source=String(coreBrainPick(row,'source','fonte')||channel).trim();
  const recordId=String(coreBrainPick(row,'id','recordId','taskId','requestId','uid')||channel+'-'+index).trim();
  const team=String(coreBrainPick(row,'team','teamName','squadra')||'').trim();
  const category=String(coreBrainPick(row,'category','categoria','ageGroup','annata')||'').trim();
  const approvalValue=coreBrainPick(row,'approvalRequired','requiresApproval','humanGate','human_gate');
  const approvalRequired=approvalValue===true||['TRUE','YES','SI','SÌ','1','REQUIRED'].includes(String(approvalValue||'').trim().toUpperCase());
  const requestedMode=String(coreBrainPick(row,'actionMode','action_mode')||'').trim().toUpperCase();
  const actionMode=approvalRequired?'HUMAN_GATE':(requestedMode==='READ'?'READ':'HUMAN_GATE');
  const sourceUrl=cleanPublicHttpsUrl(coreBrainPick(row,'sourceUrl','source_url','url','link')||'')||null;
  const change=String(coreBrainPick(row,'change','delta','recommendation','message')||'').trim();
  const changedAt=String(coreBrainPick(row,'changedAt','changed_at','updatedAt','updated_at')||'').trim();
  if(!title&&!nextAction&&!status&&!due&&!change)return null;
  return {
    recordId,channel,title:title||nextAction||status||change||'Elemento operativo',
    nextAction:nextAction||null,status:status||null,priority:priority||null,
    due:due||null,owner:owner||null,source,
    team:team||null,category:category||null,approvalRequired,actionMode,sourceUrl,
    change:change||null,changedAt:changedAt||null,
    verificationState:'VERIFIED',
    explicitPriorityScore:coreBrainPriorityValue(priority),
    evidence:{channel,recordId,source,sourceUrl}
  };
}
async function coreBrainChannel(action,payload,sessionToken){
  try{
    const result=await callAppsScript(action,payload||{},sessionToken);
    if(!result.upstream?.ok||result.parsed?.ok===false){
      return {action,state:'UNAVAILABLE',error:result.parsed?.error||('HTTP_'+(result.upstream?.status||'UNKNOWN')),data:null};
    }
    return {action,state:'VERIFIED',error:null,data:unwrapPayload(result.parsed)};
  }catch(e){
    return {action,state:'UNAVAILABLE',error:String(e.code||e.message||e),data:null};
  }
}
async function buildCoreBrain(sessionToken,authResult=null){
  const auth=authResult||await coreBrainChannel('auth.validate',{token:sessionToken},sessionToken);
  if(auth.state!=='VERIFIED'){
    const error=new Error('SESSION_INVALID');
    error.code='SESSION_INVALID';
    error.auth=auth;
    throw error;
  }
  const definitions=[
    ['workspace','private.user.workspace',{}],
    ['dashboard','private.dashboard',{}],
    ['week','private.week',{}],
    ['requests','account.requests',{}],
    ['agenda','private.agenda.summary',{}],
    ['mailactions','direction.datafabric.actions',{limit:60}],
    ['datafabric','direction.datafabric.status',{}],
    ['diagnostics','direction.diagnostics',{}],
    ['evolution','direction.evolution',{limit:60}]
  ];
  const channelResults=await Promise.all(definitions.map(async([id,action,payload])=>[id,await coreBrainChannel(action,payload,sessionToken)]));
  const channels=Object.fromEntries(channelResults);
  const actionQueue=[];
  for(const [channel,result] of channelResults){
    const activeRows=filterActiveSCDTeamRows(coreBrainRows(result.data));
    for(const [index,row] of activeRows.entries()){
      const item=coreBrainActionFromRow(row,channel,index);
      if(item)actionQueue.push(item);
    }
  }
  actionQueue.sort((a,b)=>{
    if(b.explicitPriorityScore!==a.explicitPriorityScore)return b.explicitPriorityScore-a.explicitPriorityScore;
    if(a.due&&b.due)return String(a.due).localeCompare(String(b.due));
    if(a.due)return -1;if(b.due)return 1;
    return String(a.recordId||'').localeCompare(String(b.recordId||''));
  });
  const unavailable=Object.entries(channels).filter(([,v])=>v.state!=='VERIFIED').map(([id,v])=>({id,error:v.error}));
  return {
    ok:true,
    brain:'SCD_CORE',
    contractVersion:'R58-BRAIN-0.2',
    generatedAt:new Date().toISOString(),
    clubTime:clubTimePayload(),
    doctrine:{
      mode:'ACTION_FIRST_ROLE_AWARE',
      questions:['WHAT_REQUIRES_ACTION_NOW','WHO_OWNS_IT','WHAT_IS_BLOCKED','WHAT_IS_DUE','WHAT_CHANGED','WHAT_IS_MISSING','WHAT_DECISION_IS_REQUIRED'],
      noInventedPriority:true,
      failClosed:true
    },
    identity:auth.data,
    channels,
    actionQueue,
    health:{
      state:unavailable.length?'DEGRADED':'VERIFIED',
      verifiedChannels:Object.values(channels).filter(x=>x.state==='VERIFIED').length,
      totalChannels:Object.keys(channels).length,
      unavailable
    },
    provenance:{
      authority:'R20',
      orchestration:'SCD_COMMAND_R22',
      rule:'Every surfaced action preserves source/channel evidence; unavailable channels are never reconstructed from guesses.'
    }
  };
}

async function handleCoreBrain(req,res){
  if(req.method!=='POST')return json(res,405,{ok:false,error:'METHOD_NOT_ALLOWED'});
  let body={};
  try{body=JSON.parse(await readBody(req)||'{}')}catch{return json(res,400,{ok:false,error:'INVALID_JSON'})}
  const sessionToken=String(body.sessionToken||'').trim();
  if(!sessionToken)return json(res,401,{ok:false,error:'SESSION_REQUIRED'});
  const auth=await coreBrainChannel('auth.validate',{token:sessionToken},sessionToken);
  if(auth.state!=='VERIFIED')return json(res,401,{ok:false,error:'SESSION_INVALID',auth});
  try{
    return json(res,200,await buildCoreBrain(sessionToken,auth));
  }catch(e){
    return json(res,502,{ok:false,error:e.code||e.message||'CORE_BRAIN_UNAVAILABLE'});
  }
}

function coreTodayReadAudit(command,projection){
  const emittedAt=new Date().toISOString();
  const record={
    event:String(command?.audit_event||'CORE_TODAY_VIEWED'),
    mode:'SERVER_LOG_READ_AUDIT',
    persisted:false,
    emitted_at:emittedAt,
    command_id:String(command?.command_id||''),
    trigger:String(command?.trigger||''),
    source_state:String(projection?.source_state||'UNVERIFIED'),
    primary_attention_id:projection?.primary_attention?.id||null
  };
  console.info('[core-today:audit] '+JSON.stringify(record));
  return record;
}

async function handleCoreToday(req,res){
  if(req.method!=='POST')return json(res,405,{ok:false,error:'METHOD_NOT_ALLOWED'});
  let body={};
  try{body=JSON.parse(await readBody(req)||'{}')}catch{return json(res,400,{ok:false,error:'INVALID_JSON'})}
  const sessionToken=String(body.sessionToken||'').trim();
  if(!sessionToken)return json(res,401,{ok:false,error:'SESSION_REQUIRED'});
  if(body.input!==undefined&&(body.input===null||Array.isArray(body.input)||typeof body.input!=='object')){
    return json(res,400,{ok:false,error:'INVALID_COMMAND_INPUT'});
  }
  const auth=await coreBrainChannel('auth.validate',{token:sessionToken},sessionToken);
  if(auth.state!=='VERIFIED')return json(res,401,{ok:false,error:'SESSION_INVALID'});

  const trigger=String(body.command||'/today').trim().toLowerCase();
  const resolution=resolveCommand(trigger,auth.data||{});
  if(!resolution.ok){
    const status=resolution.reason==='ROLE_SCOPE_DENIED'?403:(resolution.reason==='UNKNOWN_COMMAND'?404:409);
    return json(res,status,{ok:false,error:resolution.reason,command:trigger});
  }

  let brain;
  try{brain=await buildCoreBrain(sessionToken,auth)}
  catch(e){return json(res,502,{ok:false,error:e.code||e.message||'CORE_BRAIN_UNAVAILABLE'})}

  const roleScope=[
    brain.identity?.user?.coreRole,
    brain.identity?.user?.role,
    brain.identity?.coreRole,
    brain.identity?.role
  ].filter(Boolean);
  const projection=buildTodayAttentionProjection({
    brain,
    roleScope,
    commandTrigger:resolution.command.trigger,
    now:brain.generatedAt
  });
  const audit=coreTodayReadAudit(resolution.command,projection);
  return json(res,200,{
    ok:true,
    command:{
      command_id:resolution.command.command_id,
      trigger:resolution.command.trigger,
      intent:resolution.command.intent,
      human_gate:resolution.command.human_gate,
      audit_event:resolution.command.audit_event
    },
    projection,
    audit,
    runtime:{
      previewSafeMode:PREVIEW_SAFE_MODE,
      writePolicy:PREVIEW_SAFE_MODE?'READ_ONLY':'HUMAN_GATE_ONLY',
      sourceAuthority:'R20',
      contractVersion:'R58-CORE-TODAY-1.0'
    }
  });
}

http.createServer(async(req,res)=>{
  applyCors(req,res); if(req.method==='OPTIONS'){res.writeHead(204);return res.end()}
  const u=new URL(req.url,'http://localhost');
  if(u.pathname==='/health') return json(res,200,{...clubTimePayload(),service:'SCD Super App',version:'40.0.0',commit:DEPLOY_COMMIT,previewSafeMode:PREVIEW_SAFE_MODE});
  if(u.pathname==='/api/time') return json(res,200,clubTimePayload());
  if(u.pathname==='/api/capabilities') return json(res,200,{ok:true,version:'40.0.0',mode:'GITHUB_PAGES_RENDER_R20_SUPABASE_DUAL_RUN',actions:[...allowedActions].sort(),featureFlags:FEATURE_FLAGS,domainCore:SUPABASE_RUNTIME,runtimeSafety:{previewSafeMode:PREVIEW_SAFE_MODE,writePolicy:PREVIEW_SAFE_MODE?'READ_ONLY':'NORMAL'},isolated:['safeguarding']});
  if(u.pathname==='/api/core-status') return json(res,200,{ok:true,version:'40.0.0',featureFlags:FEATURE_FLAGS,domainCore:SUPABASE_RUNTIME,currentPrimary:'R20',targetPrimary:'SCD_SUPABASE',runtimeSafety:{previewSafeMode:PREVIEW_SAFE_MODE,writePolicy:PREVIEW_SAFE_MODE?'READ_ONLY':'NORMAL'}});
  if(u.pathname==='/api/core-brain') return handleCoreBrain(req,res);
  if(u.pathname==='/api/core-today') return handleCoreToday(req,res);
  if(u.pathname==='/api/launch-readiness') return handleLaunchReadiness(req,res);
  if(u.pathname==='/api/tournaments') return handleTournaments(req,res);
  if(u.pathname==='/api/membership-services') return handleMembershipServices(req,res);
  if(u.pathname==='/api/facility-logistics') return handleFacilityLogistics(req,res);
  if(u.pathname==='/api/public/donation-config') return handleDonationConfig(req,res);
  if(u.pathname==='/api/public/donation-intent') return handleDonationIntent(req,res);
  if(u.pathname==='/api/sponsor/lead') return handleSponsorLead(req,res);
  if(u.pathname==='/api/sponsor/request-access') return handleSponsorAccessRequest(req,res);
  if(u.pathname==='/api/sponsor/otp') return handleSponsorOtp(req,res);
  if(u.pathname==='/api/sponsor/login') return handleSponsorLogin(req,res);
  if(u.pathname==='/api/sponsor/session') return handleSponsorSession(req,res,u);
  if(u.pathname==='/api/sponsor/logout') return handleSponsorLogout(req,res);
  if(u.pathname==='/api/sponsor/crm') return handleSponsorCrm(req,res,u);
  if(u.pathname==='/api/sponsor/mail-health') return handleSponsorMailHealth(req,res);
  if(u.pathname==='/api/sponsor/motion-profiles') return handleSponsorMotionProfiles(req,res);
  if(u.pathname==='/api/sponsor/community') return handleSponsorCommunity(req,res);
  if(u.pathname==='/api/sponsor/creative-scenes') return handleSponsorCreativeScenes(req,res);
  if(u.pathname==='/api/sponsor/communication') return handleSponsorCommunication(req,res);
  if(u.pathname==='/api/sponsor/agenda') return handleSponsorAgenda(req,res);
  if(u.pathname==='/api/sponsor/development') return handleSponsorDevelopment(req,res);
  if(['/sponsor/app','/sponsor/app/','/sponsor/app.html','/sponsor/app.js'].includes(u.pathname)) return serveSponsorPrivate(req,res,u);
  if(u.pathname==='/api/scd') return proxyAppsScript(req,res);
  if(u.pathname==='/api/intake/form') return handleIntakeForm(req,res,u);
  if(u.pathname==='/api/intake/admin/templates') return handleIntakeAdminTemplates(req,res);
  if(u.pathname==='/api/intake/admin/link') return handleIntakeAdminLink(req,res);
  if(u.pathname==='/api/public') return json(res,200,await fetchPublicFeed(),{'cache-control':'no-store'});
  if(u.pathname==='/api/newsroom') {try{return json(res,200,await buildWeeklyNewsroom(),{'cache-control':'public, max-age=180'})}catch(e){return json(res,500,{ok:false,error:e.message})}}
  if(u.pathname==='/api/live') {try{return json(res,200,await getLiveRadar(),{'cache-control':'public, max-age=300'})}catch(e){return json(res,500,{ok:false,error:e.message})}}
  if(['/app/tournaments','/app/tournaments/','/app/services','/app/services/','/app/fields','/app/fields/'].includes(u.pathname))return serveStatic(req,res,'/index.html');
  if(u.pathname.startsWith('/app/'))return serveStatic(req,res,u.pathname.slice(4));
  return serveStatic(req,res);
}).listen(PORT,()=>console.log(`SCD Super App listening on ${PORT}`));