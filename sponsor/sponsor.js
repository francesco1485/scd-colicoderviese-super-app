const $=s=>document.querySelector(s);
const $$=s=>Array.from(document.querySelectorAll(s));

function modal(name){
  return name==='access'?$('#accessModal'):$('#loginModal');
}
function openModal(name){
  $$('.modal').forEach(x=>x.hidden=true);
  const m=modal(name); if(!m)return;
  m.hidden=false;
  document.body.classList.add('modal-open');
  requestAnimationFrame(()=>m.querySelector('input,select,textarea,button')?.focus());
}
function closeModals(){
  $$('.modal').forEach(x=>x.hidden=true);
  document.body.classList.remove('modal-open');
}
$$('[data-open]').forEach(b=>b.addEventListener('click',()=>openModal(b.dataset.open)));
$$('[data-close]').forEach(b=>b.addEventListener('click',closeModals));
$$('[data-switch]').forEach(b=>b.addEventListener('click',()=>openModal(b.dataset.switch)));
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModals()});
$$('.modal').forEach(m=>m.addEventListener('mousedown',e=>{if(e.target===m)closeModals()}));

async function api(url,body){
  const res=await fetch(url,{
    method:'POST',
    headers:{'content-type':'application/json'},
    credentials:'same-origin',
    body:JSON.stringify(body)
  });
  let data={};
  try{data=await res.json()}catch{}
  if(!res.ok||data.ok===false)throw new Error(data.error||data.message||'Operazione non riuscita');
  return data;
}
function formData(form){
  const f=new FormData(form),o=Object.fromEntries(f.entries());
  o.privacy=f.get('privacy')==='on';
  return o;
}
function pending(btn,on){
  if(!btn)return;
  btn.disabled=on;
  if(on){btn.dataset.original=btn.textContent;btn.textContent='Invio in corso…'}
  else if(btn.dataset.original){btn.textContent=btn.dataset.original}
}

$('#partnerLeadForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const form=e.currentTarget,state=$('#partnerLeadState'),btn=form.querySelector('[type=submit]');
  const d=formData(form);
  state.textContent='';
  pending(btn,true);
  try{
    const r=await api('/api/sponsor/lead',d);
    state.className='form-state ok';
    state.textContent='Richiesta registrata'+(r.requestId?' · '+r.requestId:'')+'. La Direzione SCD ti ricontatterà.';
    form.reset();
  }catch(err){
    state.className='form-state error'; state.textContent=err.message;
  }finally{pending(btn,false)}
});

$('#accessRequestForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const form=e.currentTarget,state=$('#accessState'),btn=form.querySelector('[type=submit]');
  const d=formData(form);
  state.textContent='';
  pending(btn,true);
  try{
    const r=await api('/api/sponsor/request-access',d);
    state.className='form-state ok';
    state.textContent='Richiesta inviata alla Direzione'+(r.requestId?' · '+r.requestId:'')+'. Dopo l’approvazione potrai richiedere il codice temporaneo.';
    form.reset();
  }catch(err){
    state.className='form-state error';state.textContent=err.message;
  }finally{pending(btn,false)}
});

let loginEmail='';
$('#otpRequestForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const form=e.currentTarget,state=$('#loginState'),btn=form.querySelector('[type=submit]');
  loginEmail=new FormData(form).get('email').trim();
  pending(btn,true);state.textContent='';
  try{
    await api('/api/sponsor/otp',{email:loginEmail});
    state.className='form-state ok';
    state.textContent='Se l’indirizzo è stato approvato, il codice temporaneo è stato inviato via email.';
    $('#otpLoginForm').hidden=false;
    $('#otpLoginForm input').focus();
  }catch(err){
    state.className='form-state error';state.textContent=err.message;
  }finally{pending(btn,false)}
});

$('#otpLoginForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const form=e.currentTarget,state=$('#loginState'),btn=form.querySelector('[type=submit]');
  const code=new FormData(form).get('code').trim();
  pending(btn,true);state.textContent='';
  try{
    const r=await api('/api/sponsor/login',{email:loginEmail,code});
    state.className='form-state ok';
    state.textContent='Accesso verificato. Apertura piattaforma…';
    location.href=r.isDirection?'/sponsor/admin':'/sponsor/app';
  }catch(err){
    state.className='form-state error';state.textContent=err.message;
  }finally{pending(btn,false)}
});

// If a valid session already exists, keep a discreet shortcut available.
fetch('/api/sponsor/session',{credentials:'same-origin'}).then(async r=>{
  if(!r.ok)return;
  const d=await r.json();
  const b=document.createElement('a');
  b.className='session-chip';
  b.href=d.isDirection?'/sponsor/admin':'/sponsor/app';
  b.textContent='Sessione attiva · Apri area riservata';
  document.body.appendChild(b);
}).catch(()=>{});
