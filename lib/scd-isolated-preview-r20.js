'use strict';

/* Isolated runtime for functional tests ONLY. All records are synthetic,
 * ephemeral, and prohibited from reaching R20, Gmail, Drive or databases. */
const {randomBytes}=require('node:crypto');

const operator={email:'operatore@example.invalid',name:'Operatore TEST SCD',role:'DIREZIONE',type:'DIREZIONE'};
const safe=v=>String(v==null?'':v).trim();
const reply=data=>({ok:true,data});
const denied=reason=>({ok:false,error:reason||'STAGING_ACTION_DISABLED'});

function romeToday(now=new Date()){
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'})
    .formatToParts(now).reduce((out,part)=>(out[part.type]=part.value,out),{});
  return parts.year+'-'+parts.month+'-'+parts.day;
}
function createIsolatedPreviewR20({pin,now=()=>new Date()}={}){
  if(!pin||String(pin).length<12)throw new Error('PREVIEW_TEST_PIN_REQUIRED');
  const sessions=new Map(),audit=[],opportunities=[];
  const stakeholders=[{
    STAKEHOLDER_ID:'QA-ST-001',NOME:'TEST · Azienda sintetica',EMAIL:'referente@example.invalid',
    CONTACT_POLICY:'MANUALE',TIPO:'AZIENDA',STATO:'SOLO_STAGING'
  }];
  const requests=[{
    REQUEST_ID:'QA-REQ-001',TYPE:'SPONSOR',STATUS:'NUOVA',
    CREATED_AT:new Date().toISOString(),NOME:'Referente TEST',
    EMAIL:'referente@example.invalid',TELEFONO:'0000000000',
    OGGETTO:'PARTNERSHIP · TEST Azienda sintetica · LED',CATEGORIA:'DEMO',
    CONSENSO_PRIVACY:'SI'
  }];
  const newToken=()=>{
    const token='qa-'+randomBytes(24).toString('hex');
    sessions.set(token,Date.now()+60*60*1000);
    return token;
  };
  const signedIn=token=>typeof token==='string'&&sessions.has(token)&&sessions.get(token)>Date.now();
  const check=token=>signedIn(token)?null:denied('SESSION_REQUIRED');
  const matches=(requestId,stakeholderId)=>{
    const request=requests.find(x=>x.REQUEST_ID===requestId);
    const stakeholder=stakeholders.find(x=>x.STAKEHOLDER_ID===stakeholderId);
    return Boolean(request&&stakeholder&&safe(request.EMAIL).toLowerCase()===safe(stakeholder.EMAIL).toLowerCase());
  };
  function publicRows(){
    const date=romeToday(now());
    return [
      {eventId:'QA-MATCH-001',title:'TEST · Gara dimostrativa (NON REALE)',date,time:'15:00',
       type:'MATCH',team:'Squadra TEST',opponent:'Avversario TEST',venue:'Campo di collaudo',
       visibility:'PUBLIC',source:'STAGING_SYNTHETIC',sourceUpdatedAt:new Date().toISOString()},
      {eventId:'QA-TRAIN-001',title:'TEST · Allenamento dimostrativo (NON REALE)',date,time:'18:00',
       type:'TRAINING',team:'Squadra TEST',venue:'Campo di collaudo',
       visibility:'PUBLIC',source:'STAGING_SYNTHETIC',sourceUpdatedAt:new Date().toISOString()},
      {eventId:'QA-HIDDEN-001',title:'TEST · Evento riservato',date,
       type:'MEDICAL_CERTIFICATE',visibility:'PRIVATE',source:'STAGING_SYNTHETIC'}
    ];
  }
  function action(name,payload={},token=''){
    payload=payload&&typeof payload==='object'?payload:{};
    switch(name){
      case 'public.calendar':return reply({rows:publicRows(),sourceMode:'STAGING_SYNTHETIC'});
      case 'public.feed':return reply({items:[],sponsors:[],partners:[],publicProfiles:[],initiatives:[],
        sourceMode:'STAGING_SYNTHETIC'});
      case 'public.club':return reply({club:'SCD ColicoDerviese',sourceMode:'STAGING_SYNTHETIC'});
      case 'public.datafabric.contract':return reply({sourceMode:'STAGING_SYNTHETIC',ready:false});
      case 'public.partnerLead':{
        const email=safe(payload.email).toLowerCase();
        if(!email.endsWith('@example.invalid')||!/^PARTNERSHIP\\s*·\\s*TEST/i.test(safe(payload.topic))){
          return denied('STAGING_SYNTHETIC_INPUT_ONLY');
        }
        const id='QA-REQ-'+String(requests.length+1).padStart(3,'0');
        requests.push({REQUEST_ID:id,TYPE:'SPONSOR',STATUS:'NUOVA',
          CREATED_AT:new Date().toISOString(),NOME:safe(payload.name).slice(0,100),
          EMAIL:email,TELEFONO:'0000000000',OGGETTO:safe(payload.topic).slice(0,180),
          CATEGORIA:'DEMO',CONSENSO_PRIVACY:'SI'});
        return reply({requestId:id,status:'NUOVA',notificationSent:null,persistence:'EPHEMERAL_MEMORY'});
      }
      case 'auth.login':{
        if(safe(payload.email).toLowerCase()!==operator.email||
          safe(payload.code||payload.pin)!==String(pin))return denied('INVALID_STAGING_CREDENTIALS');
        return reply({token:newToken(),user:{...operator},permissions:{direction:true},sourceMode:'STAGING_SYNTHETIC'});
      }
      case 'auth.validate':{
        const err=check(token||payload.token);
        if(err)return err;
        return reply({valid:true,authenticated:true,user:{...operator},permissions:{direction:true}});
      }
      case 'auth.identity.resolve':{
        const err=check(token);if(err)return err;
        return reply({matched:true,user:{...operator},sourceMode:'STAGING_SYNTHETIC'});
      }
      case 'dashboard.summary':case 'private.dashboard':{
        const err=token?check(token):null;if(err)return err;
        return reply({season:'2026/27',user:token?{...operator}:null,
          permissions:token?{direction:true}:{},personal:[],teams:[],convocations:[],
          public:{teams:[],nextMatch:{title:'TEST · Gara dimostrativa (NON REALE)',
            date:romeToday(now()),team:'Squadra TEST',opponent:'Avversario TEST',source:'STAGING_SYNTHETIC'},
            results:[],standings:[],initiatives:[]},
          sourceMode:'STAGING_SYNTHETIC'});
      }
      case 'private.user.workspace':{
        const err=check(token);if(err)return err;
        return reply({email:operator.email,name:operator.name,role:'DIREZIONE',
          privateDeskProfile:'DIREZIONE_STAGING',defaultModules:['CALENDARIO','RICHIESTE'],
          dataScope:['STAGING_SINTETICO'],communicationScope:['STAGING_SINTETICO'],
          sourceMode:'STAGING_SYNTHETIC'});
      }
      case 'auth.access.log':{
        const err=check(token);if(err)return err;
        if(!['LOGIN_SUCCESS','PRIVATE_DESK_OPEN'].includes(safe(payload.eventType)))
          return denied('AUDIT_EVENT_NOT_ALLOWED');
        audit.push({EMAIL:operator.email,ACTION:'ACCESS_'+payload.eventType,
          RESOURCE:'QA_PRIVATE_DESK',TIMESTAMP:new Date().toISOString()});
        return reply({stored:true,storage:'EPHEMERAL_MEMORY'});
      }
      case 'private.crm.summary':{
        const err=check(token);if(err)return err;
        return reply({rows:stakeholders.map(x=>({...x})),count:stakeholders.length,
          sourceMode:'STAGING_SYNTHETIC',opportunities:opportunities.map(x=>({...x}))});
      }
      case 'private.crm.detail':{
        const err=check(token);if(err)return err;
        const id=safe(payload.id),found=stakeholders.find(x=>x.STAKEHOLDER_ID===id);
        return found?reply({stakeholder:{...found},sourceMode:'STAGING_SYNTHETIC'}):denied('STAKEHOLDER_NOT_FOUND');
      }
      case 'private.crm.leadInbox':{
        const err=check(token);if(err)return err;
        return reply({requests:requests.map(x=>({...x})),stakeholders:stakeholders.map(x=>({...x})),
          readOnly:true,source:'STAGING_SYNTHETIC'});
      }
      case 'private.crm.proposalDraft.create':{
        const err=check(token);if(err)return err;
        if(payload.confirm!==true||payload.associationReviewed!==true)
          return denied('EXPLICIT_REVIEW_AND_CONFIRM_REQUIRED');
        const requestId=safe(payload.requestId),stakeholderId=safe(payload.stakeholderId);
        if(!matches(requestId,stakeholderId)||!safe(payload.asset))
          return denied('STAKEHOLDER_MISMATCH');
        const corr='FLOW-GROW-'+requestId;
        let existing=opportunities.find(x=>x.CORRELATION_ID===corr);
        const created=!existing;
        if(!existing){
          existing={OPPORTUNITY_ID:'QA-OPP-'+(opportunities.length+1),PARTNER:stakeholders[0].NOME,
            STAGE:'DA SVILUPPARE',STATO:'APERTO',CORRELATION_ID:corr,
            VALORE_POTENZIALE:'',PROBABILITA:'',VALORE_PONDERATO:'',
            OFFERTA:safe(payload.asset).slice(0,160)};
          opportunities.push(existing);
          audit.push({EMAIL:operator.email,ACTION:'SPONSOR_DRAFT_CREATE',
            RESOURCE:'QA_OPPORTUNITY',RECORD_ID:existing.OPPORTUNITY_ID,TIMESTAMP:new Date().toISOString()});
        }
        return reply({persisted:true,persistence:'EPHEMERAL_MEMORY',created,
          opportunityId:existing.OPPORTUNITY_ID,requestId,stakeholderId,
          correlationId:corr,stage:existing.STAGE,deliveryState:'NOT_SENT',contractCreated:false});
      }
      case 'private.development.summary':{
        const err=check(token);if(err)return err;
        return reply({sourceMode:'LIVE_MASTER',rows:[],notice:'SOLO STAGING: nessuna operazione reale'});
      }
      case 'private.agenda.summary':case 'private.community.summary':
      case 'private.communication.templates':{
        const err=check(token);if(err)return err;
        return reply({sourceMode:'STAGING_SYNTHETIC',rows:[],items:[]});
      }
      default:return denied('STAGING_ACTION_DISABLED');
    }
  }
  return {action,status:()=>({
    isolated:true,dataClass:'SYNTHETIC_ONLY',productionWritesAllowed:false,
    externalR20Connected:false,persistence:'EPHEMERAL_MEMORY',
    opportunities:opportunities.length,auditEvents:audit.length,
    modules:['ONE','GROW','CORE','SKY'],source:'STAGING_SYNTHETIC'
  })};
}
module.exports={createIsolatedPreviewR20,romeToday};
