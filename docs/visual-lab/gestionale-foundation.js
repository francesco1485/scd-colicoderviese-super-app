(()=>{
  const root=document.documentElement;
  const densityButtons=[...document.querySelectorAll('[data-density]')];
  densityButtons.forEach(button=>button.addEventListener('click',()=>{
    root.dataset.scdDensity=button.dataset.density;
    densityButtons.forEach(x=>x.setAttribute('aria-pressed',String(x===button)));
  }));
  document.querySelectorAll('[data-jump]').forEach(button=>button.addEventListener('click',()=>{
    document.getElementById(button.dataset.jump)?.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  }));
  const tabs=[...document.querySelectorAll('[data-scene-tab]')];
  const panels=[...document.querySelectorAll('[data-scene-panel]')];
  tabs.forEach(button=>button.addEventListener('click',()=>{
    const scene=button.dataset.sceneTab;
    tabs.forEach(x=>x.setAttribute('aria-pressed',String(x===button)));
    panels.forEach(panel=>panel.hidden=panel.dataset.scenePanel!==scene);
  }));
})();