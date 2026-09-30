(()=>{
  const panels=[...document.querySelectorAll('[data-view-panel]')];
  const navs=[...document.querySelectorAll('[data-view]')];
  const sidebar=document.getElementById('sidebar');
  const menu=document.getElementById('menuBtn');
  const open=(name)=>{
    panels.forEach(p=>p.classList.toggle('active',p.dataset.viewPanel===name));
    navs.forEach(n=>n.classList.toggle('active',n.dataset.view===name));
    if(sidebar)sidebar.classList.remove('open');
    history.replaceState(null,'','#'+name);
    window.scrollTo({top:0,behavior:'smooth'});
  };
  navs.forEach(b=>b.addEventListener('click',()=>open(b.dataset.view)));
  document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>open(b.dataset.go)));
  if(menu)menu.addEventListener('click',()=>sidebar&&sidebar.classList.toggle('open'));
  const initial=(location.hash||'#home').slice(1);
  open(panels.some(p=>p.dataset.viewPanel===initial)?initial:'home');
})();