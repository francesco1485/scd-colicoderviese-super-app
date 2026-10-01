(()=>{
  const qs=new URLSearchParams(location.search);
  const slug=(qs.get('form')||'').trim().toLowerCase();
  const $=s=>document.querySelector(s);
  const status=$('#formStatus'),title=$('#formTitle'),cat=$('#formCategory'),type=$('#documentType'),hint=$('#uploadHint'),submit=$('#submitBtn'),file=$('#fileInput');
  fetch('./intake-config.public.json',{cache:'no-store'}).then(r=>r.json()).then(cfg=>{
    const f=cfg.forms?.[slug]||null;
    if(!f){
      status.textContent='Link non riconosciuto';
      title.textContent='Modulo non disponibile';
      cat.textContent='SCD INTAKE HUB';
      return;
    }
    document.title=f.title+' · SCD';
    title.textContent=f.title;
    cat.textContent=f.category;
    type.innerHTML=(f.types||['Documento']).map(v=>'<option>'+v+'</option>').join('');
    const ready=cfg.runtimeState==='READY';
    status.textContent=ready?'Servizio attivo':'Servizio in attivazione';
    hint.textContent=ready?('Fino a '+f.maxFiles+' file · '+f.accepted.join(', ')):'La struttura di instradamento è pronta. L’upload resta disabilitato finché il collegamento server-side a Drive non è verificato.';
    file.disabled=!ready; submit.disabled=!ready;
    if(ready) file.accept=(f.accepted||[]).map(x=>'.'+x.toLowerCase()).join(',');
  }).catch(()=>{
    status.textContent='Configurazione non disponibile';
    title.textContent='Modulo temporaneamente non disponibile';
  });

  $('#intakeForm').addEventListener('submit',async e=>{
    e.preventDefault();
    if(submit.disabled)return;
    // Intentionally fail-closed until the server-side Drive adapter is verified.
  });
})();