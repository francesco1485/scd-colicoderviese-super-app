(function(root){
  'use strict';

  const SOURCE_KEYS=['agenda','evolution','mailactions','diagnostics','datafabric','dashboard'];
  const LANE_ORDER=['TODAY','PRIORITY','TODO','APPROVALS','DEADLINES','CHANGES'];

  function text(v){return v==null?'':String(v).trim()}
  function upper(v){return text(v).toUpperCase()}
  function pick(obj,keys){
    for(const key of keys){
      const value=obj&&obj[key];
      if(value!==undefined&&value!==null&&text(value)!=='')return value;
    }
    return '';
  }
  function bool(v){
    return v===true||v===1||['TRUE','SI','SÌ','YES','Y','1'].includes(upper(v));
  }
  function arrayFrom(payload,keys=[]){
    if(Array.isArray(payload))return payload;
    if(!payload||typeof payload!=='object')return [];
    for(const key of keys){
      if(Array.isArray(payload[key]))return payload[key];
    }
    for(const value of Object.values(payload)){
      if(Array.isArray(value))return value;
    }
    return [];
  }
  function isoDate(v){
    if(!v)return '';
    const raw=text(v);
    const direct=raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if(direct)return direct[1]+'-'+direct[2]+'-'+direct[3];
    const d=new Date(v);
    return Number.isFinite(d.getTime())?d.toISOString().slice(0,10):'';
  }
  function timeText(v){
    if(!v)return '';
    const d=new Date(v);
    if(!Number.isFinite(d.getTime()))return '';
    return new Intl.DateTimeFormat('it-IT',{timeZone:'Europe/Rome',hour:'2-digit',minute:'2-digit'}).format(d);
  }
  function sourceState(source){
    const state=upper(source&&source.state);
    return ['VERIFIED','PENDING','UNAVAILABLE','UNVERIFIED'].includes(state)?state:'UNVERIFIED';
  }
  function itemBase(row,source,index){
    const id=text(pick(row,['id','ID','taskId','TASK_ID','recommendationId','RECOMMENDATION_ID','eventId','EVENT_ID']))||source+'-'+String(index+1);
    const title=text(pick(row,['title','TITLE','name','NAME','subject','SUBJECT','topic','TOPIC','action','ACTION','nextAction','NEXT_ACTION','message','MESSAGE','description','DESCRIPTION']))||'Voce operativa';
    const status=text(pick(row,['status','STATUS','state','STATE','esito','ESITO']));
    const owner=text(pick(row,['owner','OWNER','responsible','RESPONSIBLE','assignee','ASSIGNEE']));
    const due=text(pick(row,['deadline','DEADLINE','dueDate','DUE_DATE','dueAt','DUE_AT','scadenza','SCADENZA','nextDeadline','NEXT_DEADLINE']));
    const priority=text(pick(row,['priority','PRIORITY','severity','SEVERITY','urgency','URGENCY']));
    const updatedAt=text(pick(row,['updatedAt','UPDATED_AT','createdAt','CREATED_AT','timestamp','TIMESTAMP','date','DATE']));
    return {id,title,status,owner,due,priority,updatedAt,source,sourceState:'VERIFIED'};
  }
  function agendaItems(payload,today){
    const rows=arrayFrom(payload,['upcoming','events','rows','items']);
    return rows.map((row,index)=>{
      const start=pick(row,['startAt','START_AT','start','START','date','DATE']);
      const end=pick(row,['endAt','END_AT','end','END']);
      const description=text(pick(row,['description','DESCRIPTION','details','DETAILS','note','NOTE']));
      const title=text(pick(row,['title','TITLE','name','NAME','subject','SUBJECT']))||'Evento agenda';
      const location=text(pick(row,['location','LOCATION','venue','VENUE']));
      const explicitType=text(pick(row,['type','TYPE','kind','KIND','eventType','EVENT_TYPE']))||((/\bTipo:\s*DEADLINE\b/i.test(description))?'DEADLINE':'');
      return {
        id:text(pick(row,['id','ID','eventId','EVENT_ID']))||'agenda-'+String(index+1),
        title,
        status:'PROGRAMMATO',
        owner:'',
        due:explicitType==='DEADLINE'?text(start):'',
        priority:'',
        updatedAt:'',
        startAt:text(start),
        endAt:text(end),
        day:isoDate(start),
        time:timeText(start),
        location,
        description,
        explicitType:upper(explicitType),
        source:'AGENDA',
        sourceState:'VERIFIED',
        isToday:isoDate(start)===today
      };
    });
  }
  function evolutionItems(payload){
    const rows=arrayFrom(payload,['rows','items','queue','tasks','recommendations','changes','events']);
    return rows.map((row,index)=>{
      const item=itemBase(row,'EVOLUTION',index);
      item.requiresApproval=bool(pick(row,['requiresApproval','REQUIRES_APPROVAL','approvalRequired','APPROVAL_REQUIRED']));
      item.kind=upper(pick(row,['kind','KIND','type','TYPE','category','CATEGORY']));
      item.nextAction=text(pick(row,['nextAction','NEXT_ACTION','actionRequired','ACTION_REQUIRED','action','ACTION']));
      item.change=text(pick(row,['change','CHANGE','delta','DELTA','recommendation','RECOMMENDATION','message','MESSAGE']));
      return item;
    });
  }
  function mailActionItems(payload){
    const rows=arrayFrom(payload,['rows','items','actions']);
    return rows.map((row,index)=>{
      const item=itemBase(row,'MAIL_ACTIONS',index);
      item.area=text(pick(row,['area','AREA']));
      item.nextAction=text(pick(row,['nextAction','NEXT_ACTION','action','ACTION']));
      item.gmailUrl=text(pick(row,['gmailUrl','GMAIL_URL','gmail','GMAIL']));
      item.requiresApproval=/CONFERMA UMANA OBBLIGATORIA|DA APPROVARE|APPROVAZIONE/.test(upper(item.nextAction+' '+item.status));
      return item;
    });
  }

  function isExplicitPriority(item){
    return /CRITICAL|CRITICA|HIGH|ALTA|URGENT|URGENTE|P1|BLOCKER/.test(upper(item.priority));
  }
  function isExplicitTodo(item){
    const status=upper(item.status);
    return Boolean(item.nextAction)||/OPEN|APERTO|TODO|TO DO|DA FARE|IN CORSO|PENDING|DA GESTIRE/.test(status);
  }
  function isExplicitApproval(item){
    const status=upper(item.status);
    return item.requiresApproval===true||/DA APPROVARE|APPROVAL|PENDING APPROVAL|AWAITING APPROVAL/.test(status)||/APPROVAL|APPROVAZ/.test(item.kind);
  }
  function isExplicitChange(item){
    return Boolean(item.change)||/CHANGE|CHANGED|CAMBIAMENTO|EVOLUTION|EVOLUZIONE|ANOMAL/.test(item.kind+' '+upper(item.status));
  }
  function hasDeadline(item){return Boolean(isoDate(item.due))}
  function sortByDue(a,b){
    const ad=isoDate(a.due||a.startAt),bd=isoDate(b.due||b.startAt);
    if(ad&&bd&&ad!==bd)return ad.localeCompare(bd);
    if(ad&&!bd)return -1;
    if(!ad&&bd)return 1;
    return text(a.title).localeCompare(text(b.title),'it');
  }
  function emptyLanes(){return {TODAY:[],PRIORITY:[],TODO:[],APPROVALS:[],DEADLINES:[],CHANGES:[]}}
  function stateForLane(lane,sources){
    const agenda=sourceState(sources.agenda),evolution=sourceState(sources.evolution),mailactions=sourceState(sources.mailactions);
    if(lane==='TODAY')return agenda;
    if(lane==='DEADLINES'){
      if(agenda==='VERIFIED'||evolution==='VERIFIED')return 'VERIFIED';
      if(agenda==='PENDING'||evolution==='PENDING')return 'PENDING';
      if(agenda==='UNAVAILABLE'&&evolution==='UNAVAILABLE')return 'UNAVAILABLE';
      return 'UNVERIFIED';
    }
    if(lane==='PRIORITY'||lane==='TODO'||lane==='APPROVALS'){
      if(evolution==='VERIFIED'||mailactions==='VERIFIED')return 'VERIFIED';
      if(evolution==='PENDING'||mailactions==='PENDING')return 'PENDING';
      if(evolution==='UNAVAILABLE'&&mailactions==='UNAVAILABLE')return 'UNAVAILABLE';
      return 'UNVERIFIED';
    }
    return evolution;
  }
  function normalizeSources(input){
    const out={};
    SOURCE_KEYS.forEach(key=>{
      const src=input&&input[key]||{};
      out[key]={
        state:sourceState(src),
        checkedAt:text(src.checkedAt),
        error:text(src.error),
        label:text(src.label)||key.toUpperCase()
      };
    });
    return out;
  }
  function build(input={}){
    const today=text(input.today)||new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome'}).format(new Date());
    const sources=normalizeSources(input.sources||{});
    const lanes=emptyLanes();

    if(sources.agenda.state==='VERIFIED'){
      const agenda=agendaItems(input.agenda,today);
      lanes.TODAY=agenda.filter(x=>x.isToday);
      lanes.DEADLINES.push(...agenda.filter(x=>x.explicitType==='DEADLINE'));
    }

    if(sources.evolution.state==='VERIFIED'){
      const evolution=evolutionItems(input.evolution);
      lanes.PRIORITY=evolution.filter(isExplicitPriority);
      lanes.TODO=evolution.filter(isExplicitTodo);
      lanes.APPROVALS=evolution.filter(isExplicitApproval);
      lanes.DEADLINES.push(...evolution.filter(hasDeadline));
      lanes.CHANGES=evolution.filter(isExplicitChange);
    }

    if(sources.mailactions.state==='VERIFIED'){
      const mailactions=mailActionItems(input.mailactions);
      lanes.PRIORITY.push(...mailactions.filter(isExplicitPriority));
      lanes.TODO.push(...mailactions);
      lanes.APPROVALS.push(...mailactions.filter(isExplicitApproval));
    }

    for(const lane of LANE_ORDER){
      const seen=new Set();
      lanes[lane]=lanes[lane].filter(item=>{
        const key=item.source+'|'+item.id+'|'+item.title;
        if(seen.has(key))return false;
        seen.add(key);return true;
      }).sort(sortByDue);
    }

    const laneStates={};
    LANE_ORDER.forEach(lane=>{laneStates[lane]=stateForLane(lane,sources)});

    return {
      generatedAt:new Date().toISOString(),
      today,
      sources,
      laneStates,
      lanes,
      totals:Object.fromEntries(LANE_ORDER.map(lane=>[lane,lanes[lane].length]))
    };
  }

  const api={SOURCE_KEYS,LANE_ORDER,build,isoDate};
  root.ScdCoreControlRoom=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
