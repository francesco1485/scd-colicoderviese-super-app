(()=>{
  const KEY='scd:experience:v1';
  const MODES=new Set(['DISCOVER','QUICK','FOCUS']);
  const DENSITIES=new Set(['COMFORT','BALANCED','COMPACT']);
  const DEFAULT={mode:null,density:'BALANCED',motion:'AUTO',textScale:1};

  function load(){
    try{
      const raw=JSON.parse(localStorage.getItem(KEY)||'{}');
      return {...DEFAULT,...raw};
    }catch{return {...DEFAULT}}
  }
  function save(next){
    const safe={...DEFAULT,...next};
    if(!MODES.has(safe.mode))safe.mode=null;
    if(!DENSITIES.has(safe.density))safe.density='BALANCED';
    safe.textScale=Math.max(.95,Math.min(1.15,Number(safe.textScale)||1));
    try{localStorage.setItem(KEY,JSON.stringify(safe))}catch{}
    return safe;
  }
  function recommended(role='base'){
    if(role==='staff')return 'FOCUS';
    if(role==='family')return 'QUICK';
    return 'DISCOVER';
  }
  function current(role='base'){
    const p=load();
    return {...p,effectiveMode:p.mode||recommended(role)};
  }
  function apply(role='base'){
    const p=current(role);
    document.body.dataset.scdExperience=p.effectiveMode.toLowerCase();
    document.body.dataset.scdDensity=p.density.toLowerCase();
    document.documentElement.style.setProperty('--scd-text-scale',String(p.textScale));
    document.body.classList.toggle('scd-motion-reduced',p.motion==='REDUCED');
    document.querySelectorAll('[data-experience-mode]').forEach(b=>{
      b.classList.toggle('active',b.dataset.experienceMode===p.effectiveMode);
      b.setAttribute('aria-pressed',String(b.dataset.experienceMode===p.effectiveMode));
    });
    document.querySelectorAll('[data-experience-density]').forEach(b=>{
      b.classList.toggle('active',b.dataset.experienceDensity===p.density);
      b.setAttribute('aria-pressed',String(b.dataset.experienceDensity===p.density));
    });
    return p;
  }
  function setMode(mode,role='base'){
    if(!MODES.has(mode))return current(role);
    const p=save({...load(),mode});
    try{window.SCDMeta?.record(mode==='FOCUS'?'staff':mode==='QUICK'?'services':'community',.4)}catch{}
    apply(role);return p;
  }
  function setDensity(density,role='base'){
    if(!DENSITIES.has(density))return current(role);
    const p=save({...load(),density});apply(role);return p;
  }
  function bind(root=document,role='base'){
    root.querySelectorAll('[data-experience-mode]').forEach(b=>{
      if(b.dataset.expBound)return;b.dataset.expBound='1';
      b.addEventListener('click',()=>setMode(b.dataset.experienceMode,role));
    });
    root.querySelectorAll('[data-experience-density]').forEach(b=>{
      if(b.dataset.expBound)return;b.dataset.expBound='1';
      b.addEventListener('click',()=>setDensity(b.dataset.experienceDensity,role));
    });
    apply(role);
  }
  function frictionSnapshot(){
    const meta=window.SCDMeta?.snapshot?.('base')||null;
    return {
      mode:current('base').effectiveMode,
      density:load().density,
      meta,
      principle:'NO_MENTAL_STATE_INFERENCE'
    };
  }
  window.SCDExperience={load,current,recommended,apply,setMode,setDensity,bind,frictionSnapshot};
})();