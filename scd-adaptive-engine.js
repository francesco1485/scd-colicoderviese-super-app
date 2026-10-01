(()=>{
  const root=document.documentElement;
  const mm=q=>{try{return window.matchMedia?.(q)}catch{return null}};
  const classify=w=>{
    if(w<380)return 'PHONE_COMPACT';
    if(w<480)return 'PHONE';
    if(w<768)return 'PHONE_LARGE';
    if(w<1024)return 'TABLET';
    if(w<1440)return 'LAPTOP';
    if(w<1920)return 'DESKTOP';
    if(w<2560)return 'WIDE';
    return 'ULTRAWIDE';
  };
  const network=()=>navigator.connection||navigator.mozConnection||navigator.webkitConnection||null;
  const snapshot=()=>{
    const vv=window.visualViewport;
    const width=Math.round(vv?.width||window.innerWidth||root.clientWidth||0);
    const height=Math.round(vv?.height||window.innerHeight||root.clientHeight||0);
    const n=network();
    return {
      mode:'CAPABILITY_FIRST',
      viewportClass:classify(width),
      width,
      height,
      dpr:Math.max(1,Math.min(4,Number(window.devicePixelRatio)||1)),
      orientation:width>=height?'LANDSCAPE':'PORTRAIT',
      pointerFine:Boolean(mm('(pointer: fine)')?.matches),
      hover:Boolean(mm('(hover: hover)')?.matches),
      reducedMotion:Boolean(mm('(prefers-reduced-motion: reduce)')?.matches),
      highContrast:Boolean(mm('(prefers-contrast: more)')?.matches),
      darkMode:Boolean(mm('(prefers-color-scheme: dark)')?.matches),
      standalone:Boolean(mm('(display-mode: standalone)')?.matches||window.navigator.standalone===true),
      networkClass:String(n?.effectiveType||'UNKNOWN').toUpperCase(),
      saveData:Boolean(n?.saveData)
    };
  };
  const apply=()=>{
    const s=snapshot();
    root.dataset.scdViewport=s.viewportClass.toLowerCase();
    root.dataset.scdOrientation=s.orientation.toLowerCase();
    root.dataset.scdPointer=s.pointerFine?'fine':'coarse';
    root.dataset.scdHover=s.hover?'yes':'no';
    root.dataset.scdMotion=s.reducedMotion?'reduced':'full';
    root.dataset.scdContrast=s.highContrast?'high':'normal';
    root.dataset.scdDisplay=s.standalone?'standalone':'browser';
    root.style.setProperty('--scd-vw',s.width+'px');
    root.style.setProperty('--scd-vh',s.height+'px');
    root.style.setProperty('--scd-dpr',String(s.dpr));
    root.style.setProperty('--scd-touch-target',s.pointerFine?'40px':'46px');
    root.style.setProperty('--scd-adaptive-gap',s.viewportClass==='PHONE_COMPACT'?'8px':s.viewportClass.startsWith('PHONE')?'10px':'14px');
    root.style.setProperty('--scd-adaptive-columns',s.viewportClass==='PHONE_COMPACT'||s.viewportClass==='PHONE'?'1':s.viewportClass==='PHONE_LARGE'||s.viewportClass==='TABLET'?'2':'3');
    document.dispatchEvent(new CustomEvent('scd:adaptive',{detail:{...s}}));
    return s;
  };
  let raf=0;
  const schedule=()=>{
    cancelAnimationFrame(raf);
    raf=requestAnimationFrame(apply);
  };
  addEventListener('resize',schedule,{passive:true});
  addEventListener('orientationchange',schedule,{passive:true});
  window.visualViewport?.addEventListener('resize',schedule,{passive:true});
  network()?.addEventListener?.('change',schedule);
  ['(prefers-reduced-motion: reduce)','(prefers-contrast: more)','(prefers-color-scheme: dark)','(pointer: fine)','(hover: hover)','(display-mode: standalone)']
    .forEach(q=>mm(q)?.addEventListener?.('change',schedule));
  const start=()=>{
    apply();
    if(window.ResizeObserver&&document.body)new ResizeObserver(schedule).observe(document.body);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  window.SCDAdaptive={snapshot,apply,classify};
})();