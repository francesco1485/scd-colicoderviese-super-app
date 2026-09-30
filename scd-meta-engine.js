(()=>{
  const KEY='scd:meta:v1';
  const MAX_AGE=1000*60*60*24*45;
  const safeKeys=new Set([
    'sport','community','club','profile','calendar','services','communications',
    'match','events','sponsors','twin','mirror','fan','avatar','join','tickets',
    'tournaments','family','athlete','staff','social'
  ]);
  const roleBase={
    base:{community:3,club:3,sport:2,events:2,sponsors:1,profile:1},
    athlete:{sport:5,calendar:4,community:3,avatar:2,profile:2},
    family:{calendar:5,family:5,club:3,communications:3,profile:2},
    staff:{staff:6,calendar:4,communications:4,club:2,profile:1}
  };

  function load(){
    try{
      const v=JSON.parse(localStorage.getItem(KEY)||'{}');
      if(!v||typeof v!=='object')return {counts:{},last:{}};
      return {counts:v.counts||{},last:v.last||{}};
    }catch{return {counts:{},last:{}}}
  }
  function save(v){
    try{localStorage.setItem(KEY,JSON.stringify(v))}catch{}
    return v;
  }
  function record(key,weight=1){
    key=String(key||'').toLowerCase();
    if(!safeKeys.has(key))return;
    const v=load(),now=Date.now();
    v.counts[key]=(Number(v.counts[key])||0)+Math.max(.1,Math.min(5,Number(weight)||1));
    v.last[key]=now;
    save(v);
  }
  function score(key,role='base'){
    const v=load(),now=Date.now(),base=(roleBase[role]||roleBase.base)[key]||0;
    const count=Math.min(12,Number(v.counts[key])||0);
    const last=Number(v.last[key])||0;
    const recency=last && now-last<MAX_AGE ? Math.max(0,1-((now-last)/MAX_AGE))*3 : 0;
    return base+count*.55+recency;
  }
  function rank(keys,role='base'){
    return [...keys].sort((a,b)=>score(b,role)-score(a,role));
  }
  function apply(root=document,role='base'){
    root.querySelectorAll('[data-meta-container]').forEach(container=>{
      const items=[...container.children].filter(x=>x.dataset?.metaKey);
      const ordered=rank(items.map(x=>x.dataset.metaKey),role);
      ordered.forEach(key=>{
        const el=items.find(x=>x.dataset.metaKey===key);
        if(el)container.appendChild(el);
      });
    });
  }
  function snapshot(role='base'){
    const keys=[...safeKeys];
    return {
      mode:'PRIVACY_FIRST_ON_DEVICE',
      adaptive:true,
      role,
      top:rank(keys,role).slice(0,5),
      storedCategories:Object.keys(load().counts).length
    };
  }
  function reset(){
    try{localStorage.removeItem(KEY)}catch{}
  }

  document.addEventListener('click',e=>{
    const el=e.target.closest?.('[data-meta-key]');
    if(el)record(el.dataset.metaKey,1);
    const route=e.target.closest?.('[data-r24-route]')?.dataset?.r24Route;
    if(route&&safeKeys.has(route))record(route,.7);
    const action=e.target.closest?.('[data-r24-action]')?.dataset?.r24Action;
    if(action&&safeKeys.has(action))record(action,.7);
  },{passive:true});

  window.SCDMeta={record,score,rank,apply,snapshot,reset};
})();