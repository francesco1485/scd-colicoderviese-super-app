(()=>{
  const root=document.documentElement;
  const mm=q=>window.matchMedia?.(q);
  const bucket=(w)=>w<480?'phone':w<768?'phone-wide':w<1024?'tablet':w<1440?'desktop':'wide';
  const inputMode=()=>{
    if(mm('(pointer: coarse)')?.matches)return 'touch';
    if(mm('(hover: hover)')?.matches)return 'precision';
    return 'mixed';
  };
  const networkClass=()=>{
    const c=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
    const type=String(c?.effectiveType||'unknown');
    return ['slow-2g','2g','3g','4g'].includes(type)?type:'unknown';
  };
  function snapshot(){
    const vv=window.visualViewport;
    return {
      viewportClass:bucket(Math.round(vv?.width||innerWidth)),
      orientation:(innerWidth>=innerHeight?'landscape':'portrait'),
      inputMode:inputMode(),
      dprClass:devicePixelRatio>=2.5?'high':devicePixelRatio>=1.5?'medium':'standard',
      reducedMotion:Boolean(mm('(prefers-reduced-motion: reduce)')?.matches),
      highContrast:Boolean(mm('(prefers-contrast: more)')?.matches),
      darkMode:Boolean(mm('(prefers-color-scheme: dark)')?.matches),
      networkClass:networkClass()
    };
  }
  function apply(){
    const s=snapshot();
    for(const [k,v] of Object.entries(s))root.dataset['scd'+k[0].toUpperCase()+k.slice(1)]=String(v);
    root.style.setProperty('--scd-vw',Math.round((window.visualViewport?.width||innerWidth))+'px');
    root.style.setProperty('--scd-vh',Math.round((window.visualViewport?.height||innerHeight))+'px');
    window.dispatchEvent(new CustomEvent('scd:adaptive',{detail:s}));
    return s;
  }
  let raf=0;
  const schedule=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(apply)};
  addEventListener('resize',schedule,{passive:true});
  addEventListener('orientationchange',schedule,{passive:true});
  visualViewport?.addEventListener('resize',schedule,{passive:true});
  ['(prefers-reduced-motion: reduce)','(prefers-contrast: more)','(prefers-color-scheme: dark)','(pointer: coarse)','(hover: hover)'].forEach(q=>mm(q)?.addEventListener?.('change',schedule));
  if(window.ResizeObserver){
    new ResizeObserver(schedule).observe(document.body);
  }
  window.SCDAdaptive={snapshot,apply};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true}); else apply();
})();