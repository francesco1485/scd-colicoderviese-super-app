'use strict';

const VALID_APPS=new Set(['ONE','GROW','CORE']);
const text=(value,max=240)=>String(value==null?'':value).replace(/[\u0000-\u001F\u007F]/g,' ').replace(/\s+/g,' ').trim().slice(0,max);
const NO_FACTS='DATO_IN_AGGIORNAMENTO: nessuna informazione sportiva verificata disponibile al momento.';
const SAFEGUARDING=/safeguard|abus|molest|violenz|segnalazion|protezione minori|maltrattament/i;
const PRIVATE=/certificat|medic|pagament|fattur|saldo|quot[ae]|famigl|figl|anagrafic|document|password|\bpin\b|convocaz|presenz|contratt|tesserament|dati personal|stipend|mio profilo|mia squadra/i;
const MATCH=/prossim|gara|partit|gioch|match|calcio oggi/i;
const CALENDAR=/calendar|event|torneo|allenament|programma|settimana/i;
const SPONSOR=/sponsor|partnership|partner|pubblicit|collaborazion/i;
const CONTACT=/contatt|segreteria|email|telefono|scrivere alla societ/i;
const REGISTRATION=/iscriv|prova|open day|registrazion|giocare con noi/i;

function baseResult(app){
 return {
   assistant:'Sky',mode:'RULES_ONLY',aiConnected:false,
   appContext:VALID_APPS.has(String(app||'').toUpperCase())?String(app).toUpperCase():'ONE',
   requiresAuth:false,privateDataReturned:false,routing:'PUBLIC',route:null,
   answer:'',evidence:[],verifiedAt:null
 };
}
function safeEvent(row){
 if(!row||typeof row!=='object'||row.private===true||row.isPublic===false)return null;
 const id=text(row.id||row.eventId,128);
 const date=text(row.date,12);
 const title=text(row.title,230);
 if(!id||!title||!/^(20\d{2})-\d{2}-\d{2}$/.test(date))return null;
 return {
   id,date,title,kind:text(row.kind,32),time:text(row.time,16),team:text(row.team,80),
   opponent:text(row.opponent,100),venue:text(row.venue,120),source:text(row.source,80),
   sourceUpdatedAt:text(row.sourceUpdatedAt||row.verifiedAt,50)
 };
}
function answerSky({question,app='ONE',publicNews=null}={}){
 const q=text(question,501);
 if(!q||q.length>500)throw new Error('SKY_INVALID_QUESTION');
 const result=baseResult(app);
 if(SAFEGUARDING.test(q)){
   return {...result,routing:'SAFEGUARDING_ONLY',
     answer:'Per il Safeguarding utilizza esclusivamente il canale riservato dedicato della SCD. Non inserire dettagli personali o segnalazioni nel chatbot ordinario.'};
 }
 if(PRIVATE.test(q)){
   return {...result,requiresAuth:true,routing:'PRIVATE_AUTH_REQUIRED',
     answer:'Per informazioni personali, documenti, certificati, quote o convocazioni accedi alla tua area riservata SCD. Sky pubblico non può consultare questi dati.'};
 }
 if(MATCH.test(q)){
   const calendarReady=publicNews?.sources?.calendar==='OK';
   const events=calendarReady&&Array.isArray(publicNews?.upcomingEvents)
     ?publicNews.upcomingEvents.map(safeEvent).filter(Boolean).filter(row=>row.kind==='MATCH'):[];
   events.sort((a,b)=>(a.date+'T'+(a.time||'00:00')).localeCompare(b.date+'T'+(b.time||'00:00')));
   const next=events[0];
   if(!next)return {...result,answer:NO_FACTS};
   const pieces=[next.title,next.date+(next.time?' alle '+next.time:''),next.venue].filter(Boolean);
   return {...result,answer:'Prossima gara dal calendario pubblico SCD: '+pieces.join(' · ')+'.',
     evidence:[{kind:'CALENDAR',recordId:next.id,source:next.source||'R20_PUBLIC_CALENDAR',date:next.date}],
     verifiedAt:next.sourceUpdatedAt||null};
 }
 if(CALENDAR.test(q)){
   const rows=publicNews?.sources?.calendar==='OK'&&Array.isArray(publicNews?.calendar?.rows)
     ?publicNews.calendar.rows.map(safeEvent).filter(Boolean):[];
   if(!rows.length)return {...result,answer:NO_FACTS};
   return {...result,answer:'Il calendario settimanale pubblico contiene '+rows.length+' attività verificate. Consulta la sezione Calendario per scegliere squadra e data.',
     evidence:rows.slice(0,10).map(x=>({kind:'CALENDAR',recordId:x.id,source:x.source||'R20_PUBLIC_CALENDAR',date:x.date})),
     verifiedAt:text(publicNews?.generatedAt,50)||null};
 }
 if(SPONSOR.test(q)){
   return {...result,route:'/sponsor/',
     answer:'Per proporre una partnership apri l’area Sponsor e invia la richiesta alla SCD ColicoDerviese. Opportunità, disponibilità e condizioni devono essere confermate dalla Società.'};
 }
 if(CONTACT.test(q)){
   return {...result,answer:'Puoi contattare la Segreteria SCD all’indirizzo sportclubcolico@gmail.com.'};
 }
 if(REGISTRATION.test(q)){
   return {...result,answer:'Per iscrizioni, prove o Open Day invia una richiesta alla Segreteria SCD. La richiesta non comporta automaticamente un tesseramento.'};
 }
 return {...result,answer:'Sono Sky, assistente informativo SCD. Posso indicarti calendario e gare pubbliche, richieste Sponsor, iscrizioni e contatti. Per dati personali serve l’accesso riservato.'};
}

module.exports={answerSky};
