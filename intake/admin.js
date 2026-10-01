(()=>{
  const API=location.hostname.endsWith('github.io')?'https://scd-universe.onrender.com':'';
  const SESSION_KEY='scd:session:v1';
  const $=s=>document.querySelector(s);
  const state={templates:[]};
  function session(){
    try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'{}')}catch{return {}}
  }
  async function post(path,payload){
    const r=await fetch(API+path,{method:'POST',headers:{'content-type':'application/json','x-scd-client':'intake-admin'},body:JSON.stringify(payload)});
    const j=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(j.error||('HTTP_'+r.status));
    return j;
  }
  function renderMeta(){
    const slug=$('#templateSelect').value;
    const t=state.templates.find(x=>x.slug===slug);
    $('#factoryMeta').innerHTML=t?'<b>'+t.category+'</b><span>'+t.audience+' · '+t.accessMode+'</span><small>'+t.maxFiles+' file max · '+t.acceptedTypes.join(', ')+'</small>':'';
  }
  async function init(){
    const s=session();
    if(!s.token){
      $('#adminStatus').textContent='Sessione Direzione assente';
      $('#adminBlock').hidden=false;
      return;
    }
    try{
      const j=await post('/api/intake/admin/templates',{sessionToken:s.token});
      state.templates=j.templates||[];
      if(!state.templates.length)throw new Error('NO_TEMPLATES');
      $('#templateSelect').innerHTML=state.templates.map(t=>'<option value="'+t.slug+'">'+t.title+'</option>').join('');
      $('#adminStatus').textContent=j.uploadReady?'Link Factory attiva · upload collegato':'Link Factory attiva · upload documenti ancora protetto/disabilitato';
      $('#linkFactory').hidden=false;
      renderMeta();
    }catch(e){
      $('#adminStatus').textContent='Accesso non autorizzato';
      $('#adminBlock').hidden=false;
    }
  }
  $('#templateSelect').addEventListener('change',renderMeta);
  $('#linkFactory').addEventListener('submit',async e=>{
    e.preventDefault();
    const s=session(),btn=e.currentTarget.querySelector('button[type="submit"]');
    btn.disabled=true;btn.textContent='Genero…';
    try{
      const j=await post('/api/intake/admin/link',{
        sessionToken:s.token,
        slug:$('#templateSelect').value,
        expiresHours:Number($('#expiry').value)
      });
      $('#generatedLink').value=j.url;
      $('#openLink').href=j.url;
      $('#linkWarning').textContent=j.uploadReady?'Il link può ricevere documenti secondo la policy attiva.':'Il link è valido per aprire il modulo, ma l’upload resta disabilitato finché il Drive adapter non è verificato.';
      $('#linkResult').hidden=false;
    }catch(err){
      $('#adminStatus').textContent='Generazione non riuscita: '+err.message;
    }finally{
      btn.disabled=false;btn.textContent='Genera link protetto';
    }
  });
  $('#copyLink').addEventListener('click',async()=>{
    const v=$('#generatedLink').value;
    try{await navigator.clipboard.writeText(v);$('#copyLink').textContent='Copiato';setTimeout(()=>$('#copyLink').textContent='Copia link',1400)}
    catch{$('#generatedLink').select()}
  });
  init();
})();