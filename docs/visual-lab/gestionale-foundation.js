(()=>{
  'use strict';
  const root=document.documentElement;
  const reducedMotion=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const densityButtons=[...document.querySelectorAll('[data-density]')];
  densityButtons.forEach(button=>button.addEventListener('click',()=>{
    root.dataset.scdDensity=button.dataset.density;
    densityButtons.forEach(x=>x.setAttribute('aria-pressed',String(x===button)));
  }));

  // Inspector controls belong exclusively to Visual Lab; public product nav never selects a private screen.
  const templateButtons=[...document.querySelectorAll('[data-lab-select]')];
  const templates=[...document.querySelectorAll('section[data-scd-template]')];
  function activateLabTemplate(id,scroll=true){
    const selected=templates.find(section=>section.id===id);
    if(!selected)return;
    templates.forEach(section=>{section.hidden=section!==selected});
    templateButtons.forEach(button=>{
      if(button.dataset.labSelect===id)button.setAttribute('aria-current','page');
      else button.removeAttribute('aria-current');
    });
    if(scroll){
      const lead=document.querySelector('.lab-review-lead');
      (lead||selected).scrollIntoView({block:'start',behavior:reducedMotion()?'auto':'smooth'});
    }
  }
  templateButtons.forEach(button=>button.addEventListener('click',()=>activateLabTemplate(button.dataset.labSelect)));
  activateLabTemplate('T01_PUBLIC_EDITORIAL',false);

  // Prototype only. No R20 credentials, session, auth simulation, or internal URL is involved.
  const labReservedDialog=document.getElementById('labReservedDialog');
  document.querySelectorAll('[data-public-access]').forEach(button=>{
    button.addEventListener('click',()=>{
      if(labReservedDialog && typeof labReservedDialog.showModal==='function')labReservedDialog.showModal();
    });
  });
  document.querySelector('[data-close-reserved-dialog]')?.addEventListener('click',()=>labReservedDialog?.close());
  labReservedDialog?.addEventListener('click',event=>{
    if(event.target===labReservedDialog)labReservedDialog.close();
  });

  // Legacy deep-links remain inspector-only and are never wired to public navigation.
  document.querySelectorAll('[data-jump]').forEach(button=>button.addEventListener('click',()=>{
    activateLabTemplate(button.dataset.jump);
  }));
  const tabs=[...document.querySelectorAll('[data-scene-tab]')];
  const panels=[...document.querySelectorAll('[data-scene-panel]')];
  tabs.forEach(button=>button.addEventListener('click',()=>{
    const scene=button.dataset.sceneTab;
    tabs.forEach(x=>x.setAttribute('aria-pressed',String(x===button)));
    panels.forEach(panel=>panel.hidden=panel.dataset.scenePanel!==scene);
  }));
})();
