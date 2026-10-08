'use strict';

const PUBLIC_VISIBILITY=new Set(['PUBLIC','PUBBLICO','PUBLIC_LIMITED','OPEN','ALL']);

function first(row,...keys){
  for(const key of keys){
    const v=row?.[key];
    if((typeof v==='string'||typeof v==='number')&&String(v).trim())return String(v).trim();
  }
  return '';
}

function calendarDate(raw){
  const value=String(raw||'').trim();
  const iso=value.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|[T\s])/);
  const eu=value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if(!iso&&!eu)return '';
  const [year,month,day]=iso?[Number(iso[1]),Number(iso[2]),Number(iso[3])]:[Number(eu[3]),Number(eu[2]),Number(eu[1])];
  const parsed=new Date(Date.UTC(year,month-1,day));
  if(year<2000||year>2100||parsed.getUTCFullYear()!==year||parsed.getUTCMonth()+1!==month||parsed.getUTCDate()!==day)return '';
  return [year,String(month).padStart(2,'0'),String(day).padStart(2,'0')].join('-');
}

function calendarKind(row){
  const text=[first(row,'type','kind','eventType'),first(row,'title','event','name','subject')].join(' ');
  if(/allenament|training/i.test(text))return 'TRAINING';
  if(/gara|partita|campionato|coppa|amichevole|match/i.test(text))return 'MATCH';
  if(/torneo|tournament/i.test(text))return 'TOURNAMENT';
  return 'EVENT';
}

function publishable(row){
  if(!row||typeof row!=='object'||Array.isArray(row))return false;
  if(row.private===true||row.isPublic===false||row.public===false||row.teamOnly===true||row.staffOnly===true||row.safeguarding===true||row.internalOnly===true)return false;
  const visibility=first(row,'visibility','VISIBILITY','audience','accessScope','access_scope');
  if(visibility&&!PUBLIC_VISIBILITY.has(visibility.toUpperCase()))return false;
  return true;
}

/** Whitelisted projection of the existing R20 public.calendar contract, not a new calendar store. */
function projectPublicCalendar(rows){
  if(!Array.isArray(rows))return [];
  const seen=new Set();
  const projected=[];
  for(const row of rows){
    if(!publishable(row))continue;
    const id=first(row,'eventId','EVENT_ID','id','uid');
    const title=first(row,'title','event','name','subject');
    const date=calendarDate(first(row,'date','data','startDate'));
    if(!id||id.length>128||!title||!date||seen.has(id))continue;
    seen.add(id);
    projected.push({
      id,title,date,
      time:first(row,'time','ora','startTime'),
      endTime:first(row,'endTime','fine'),
      team:first(row,'team','teamName','squadra','category','categoria','ageGroup','annata')||'SCD',
      category:first(row,'category','categoria','ageGroup','annata'),
      opponent:first(row,'opponent','opponentName','avversario'),
      competition:first(row,'competition','campionato','league'),
      venue:first(row,'venue','luogo','field','location'),
      kind:calendarKind(row),
      source:first(row,'source','fonte')||'R20_PUBLIC_CALENDAR',
      sourceUpdatedAt:first(row,'sourceUpdatedAt','SOURCE_UPDATED_AT','updatedAt')||null,
      verifiedAt:first(row,'verifiedAt','VERIFIED_AT')||null
    });
  }
  return projected;
}

module.exports={projectPublicCalendar};
