(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.SCDOnePulse=api;
})(typeof globalThis==='object'?globalThis:null,function(){
  'use strict';

  const fields=['id','date','time','kind','team','opponent','venue','title','source'];

  function normalize(rows){
    if(!Array.isArray(rows))return [];
    return rows.filter(row=>row&&/^\d{4}-\d{2}-\d{2}$/.test(String(row.date||''))).map((row,index)=>{
      const event={};
      fields.forEach(field=>{event[field]=String(row[field]??'').trim()});
      event.id=event.id||[event.date,event.time,event.team,event.kind,event.title,index].join('|');
      return event;
    }).sort((a,b)=>(a.date+'T'+a.time+'|'+a.id).localeCompare(b.date+'T'+b.time+'|'+b.id));
  }

  function todayKey(now){
    return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
  }

  function weekRange(now=new Date()){
    const currentDate=new Date(todayKey(now)+'T12:00:00Z');
    const daysSinceFriday=(currentDate.getUTCDay()+2)%7;
    const start=new Date(currentDate.getTime()-daysSinceFriday*86400000);
    const end=new Date(start.getTime()+7*86400000);
    return {start:start.toISOString().slice(0,10),end:end.toISOString().slice(0,10)};
  }

  function timeKey(now){
    return new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Rome',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(now);
  }

  function summarize(rows,now=new Date()){
    const currentDay=todayKey(now),currentTime=timeKey(now),events=normalize(rows);
    const today=events.filter(event=>event.date===currentDay);
    const next=events.find(event=>event.date>currentDay||(event.date===currentDay&&/^\d{2}:\d{2}(?::\d{2})?$/.test(event.time)&&event.time.slice(0,5)>=currentTime))||null;
    return {today,next};
  }

  function compare(previous,rows){
    if(!Array.isArray(previous))return null;
    const before=new Map(normalize(previous).map(event=>[event.id,JSON.stringify(event)]));
    const after=new Map(normalize(rows).map(event=>[event.id,JSON.stringify(event)]));
    let changed=0;
    for(const [id,value] of before)if(!after.has(id)||after.get(id)!==value)changed++;
    for(const id of after.keys())if(!before.has(id))changed++;
    return changed;
  }

  return {normalize,summarize,compare,weekRange};
});
