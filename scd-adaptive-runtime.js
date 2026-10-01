(()=>{
  const root=document.documentElement;
  const state={};
  const classify=(w)=>{
    if(w<380)return 'PHONE_COMPACT';
    if(w<480)return 'PHONE';
    if(w<768)return 'PHONE_LARGE';
    if(w<1024)return 'TABLET';
    if(w<1440)return 'LAPTOP';
    if(w<1920)return 'DESKTOP';
    if(w<2560)return 'WIDE';
    return 'ULTRAWIDE';
  };
  const safeMatch=q=>{try{return matchMedia(q).matches}catch{return false}};
  const net=()=>navigator.connection||navigator.mozConnection||navigator.webkitConnection||null;
  const snapshot=()=>{
    const vv=window.visualViewport;
    const w=Math.round(vv?.width||window.innerWidth||root.clientWidth||0);
    const h=Math.round(vv?.height||window.innerHeight||root.clientHeight||0);
    const n=net();
    return {
      mode:'CAPABILITY_FIRST',
      viewportClass:classify(w),
      width:w,
      height:h,
      dpr:Math.max(1,Math.min(4,Number(window.devicePixelRatio)||1)),
      orientation:w>=h?'LANDSCAPE':'PORTRAIT',
      pointerFine:safeMatch('(pointer:fine)'),
      hover:safeMatch('(hover:hover)'),
      reducedMotion:safeMatch('(prefers-reduced-motion: reduce)'),
      darkScheme:safeMatch('(prefers-color-scheme: dark)'),
      standalone:safeMatch('(display-mode: standalone)')||window.navigator.standalone===true,
      networkClass:n?.effectiveType||'UNKNOWN',
      saveData:Boolean(n?.saveData),
      at:Date.now()
    };
  };
  const apply=()=>{
    const s=snapshot();
    Object.assign(state,s);
    root.dataset.scdViewport=s.viewportClass.toLowerCase();
    root.dataset.scdOrientation=s.orientation.toLowerCase();
    root.dataset.scdPointer=s.pointerFine?'fine':'coarse';
    root.dataset.scdHover=s.hover?'yes':'no';
    root.dataset.scdMotion=s.reducedMotion?'reduced':'full';
    root.dataset.scdDisplay=s.standalone?'standalone':'browser';
    root.style.setProperty('--scd-vw',s.width+'px');
    root.style.setProperty('--scd-vh',s.height+'px');
    root.style.setProperty('--scd-dpr',String(s.dpr));
    root.style.setProperty('--scd-touch-target',s.pointerFine?'40px':'46px');
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
  net()?.addEventListener?.('change',schedule);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule()},{passive:true});
  apply();
  window.SCDAdaptive={snapshot:()=>({...state}),refresh:apply,classify};
})();