(()=>{ 
  const KEY='scd:twin:v1';
  const VISIT_KEY='scd:twin:last-visit';
  const stages=[
    {name:'Scintilla',min:0,next:40},
    {name:'Rookie',min:40,next:120},
    {name:'Playmaker',min:120,next:260},
    {name:'Capitano',min:260,next:500},
    {name:'Leggenda',min:500,next:900}
  ];
  function read(){try{return {...{xp:0,actions:0,badges:0},...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{return {xp:0,actions:0,badges:0}}}
  function save(v){localStorage.setItem(KEY,JSON.stringify(v));return v}
  function add(points,reason){
    const v=read();v.xp=Math.max(0,(Number(v.xp)||0)+points);v.actions=(Number(v.actions)||0)+1;v.lastReason=reason||'partecipazione';v.updatedAt=new Date().toISOString();save(v);refresh();return v
  }
  function dailyVisit(){
    const key=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    if(localStorage.getItem(VISIT_KEY)!==key){localStorage.setItem(VISIT_KEY,key);add(3,'visita SCD')}
  }
  function stageFor(xp){let s=stages[0];for(const x of stages)if(xp>=x.min)s=x;return s}
  function pct(xp,s){if(!s.next)return 100;return Math.max(0,Math.min(100,Math.round(((xp-s.min)/(s.next-s.min))*100)))}
  function avatarMarkup(){
    try{
      const saved=JSON.parse(localStorage.getItem('scd:avatar:v1')||'null');
      if(saved&&typeof window.avatarSvgMarkup==='function') return window.avatarSvgMarkup(saved);
    }catch{}
    return '<img src="./assets/sky.png" alt="Compagno digitale SCD">';
  }
  function refresh(){
    const v=read(),s=stageFor(v.xp),p=pct(v.xp,s);
    document.querySelectorAll('[data-twin-stage]').forEach(el=>el.textContent=s.name);
    document.querySelectorAll('[data-twin-xp]').forEach(el=>el.textContent=v.xp+' XP');
    document.querySelectorAll('[data-twin-progress]').forEach(el=>el.style.setProperty('--xp',p+'%'));
    document.querySelectorAll('[data-twin-actions]').forEach(el=>el.textContent=String(v.actions||0));
  }
  function mount(root=document){
    dailyVisit();
    root.querySelectorAll('.r38-twin-avatar').forEach(el=>{
      el.innerHTML='<div class="r38-core">'+avatarMarkup()+'</div>';
      const card=el.closest('.r38-twin-card');
      if(card&&!card.dataset.twinBound){
        card.dataset.twinBound='1';
        card.addEventListener('pointermove',e=>{
          if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
          const r=card.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;
          el.style.transform='rotateX('+(-y*10)+'deg) rotateY('+(x*14)+'deg)';
        });
        card.addEventListener('pointerleave',()=>el.style.transform='rotateX(0) rotateY(0)');
      }
    });
    root.querySelectorAll('[data-twin-evolve]').forEach(b=>{
      if(b.dataset.evoBound)return;b.dataset.evoBound='1';
      b.addEventListener('click',()=>add(Number(b.dataset.twinEvolve)||1,b.dataset.evoReason||'esplorazione'));
    });
    root.querySelectorAll('[data-twin-avatar-open]').forEach(b=>b.onclick=()=>{add(2,'avatar');if(typeof window.openAvatarStudio==='function')window.openAvatarStudio()});
    root.querySelectorAll('[data-twin-mirror-open]').forEach(b=>b.onclick=()=>{add(1,'mirror');if(typeof window.openSky==='function')window.openSky()});

    root.querySelectorAll('[data-mirror-form]').forEach(form=>{
      if(form.dataset.bound)return;form.dataset.bound='1';
      form.addEventListener('submit',async e=>{
        e.preventDefault();
        const input=form.querySelector('input'),feed=form.closest('.r38-mirror')?.querySelector('.r38-mirror-feed');
        const q=(input?.value||'').trim();if(!q||!feed)return;
        const u=document.createElement('div');u.className='r38-mirror-bubble user';u.textContent=q;feed.appendChild(u);
        let answer='Sky informativo temporaneamente non disponibile. Per assistenza contatta sportclubcolico@gmail.com.';
        try{
          const response=await fetch('/api/sky/ask',{
            method:'POST',headers:{'content-type':'application/json'},
            credentials:'same-origin',cache:'no-store',
            body:JSON.stringify({question:q,app:'ONE'})
          });
          const result=await response.json();
          if(response.ok&&result.ok===true&&typeof result.data?.answer==='string'){
            answer=result.data.answer;
          }
        }catch{} 
        const a=document.createElement('div');a.className='r38-mirror-bubble';a.textContent=answer;feed.appendChild(a);
        input.value='';feed.scrollTop=feed.scrollHeight;add(2,'dialogo Mirror');
      });
    });
    root.querySelectorAll('[data-mirror-prompt]').forEach(b=>b.onclick=()=>{
      const mirror=b.closest('.r38-mirror'),input=mirror?.querySelector('input'),form=mirror?.querySelector('[data-mirror-form]');
      if(input){input.value=b.dataset.mirrorPrompt||b.textContent||'';form?.requestSubmit()}
    });
    refresh();
  }
  window.SCDTwin={mount,add,read,refresh};
})();