(()=>{
  const API=location.hostname.endsWith('github.io')?'https://scd-universe.onrender.com':'';
  const qs=new URLSearchParams(location.search);
  const slug=(qs.get('form')||'').trim().toLowerCase();
  const token=qs.get('token')||'';
  const $=s=>document.querySelector(s);
  const status=$('#formStatus'),title=$('#formTitle'),cat=$('#formCategory'),type=$('#documentType'),hint=$('#uploadHint'),submit=$('#submitBtn'),file=$('#fileInput');

  async function load(){
    if(!slug||!token){
      status.textContent='Link incompleto o non valido';
      title.textContent='Modulo non disponibile';
      cat.textContent='SCD INTAKE HUB';
      return;
    }
    try{
      const r=await fetch(API+'/api/intake/form?slug='+encodeURIComponent(slug)+'&token='+encodeURIComponent(token),{cache:'no-store'});
      const j=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(j.reason||j.error||'LINK_INVALID');
      const f=j.form;
      document.title=f.title+' · SCD';
      title.textContent=f.title;
      cat.textContent=f.category;
      type.innerHTML=(f.documentTypes||['Documento']).map(v=>'<option>'+v+'</option>').join('');
      const ready=j.runtimeState==='READY'&&f.uploadReady===true;
      status.textContent=ready?'Link verificato · servizio attivo':'Link verificato · caricamento documenti in attivazione';
      hint.textContent=ready?('Fino a '+f.maxFiles+' file · '+f.acceptedTypes.join(', ')):'Il link è autentico e il modulo è corretto. L’upload resta disabilitato finché il collegamento server-side a Drive non è verificato.';
      file.disabled=!ready;
      submit.disabled=!ready;
      if(ready)file.accept=(f.acceptedTypes||[]).map(x=>'.'+x.toLowerCase()).join(',');
    }catch(e){
      status.textContent='Link scaduto, non valido o non autorizzato';
      title.textContent='Modulo non disponibile';
      cat.textContent='SCD INTAKE HUB';
      hint.textContent='Richiedi un nuovo link alla Segreteria o alla Direzione.';
      file.disabled=true;submit.disabled=true;
    }
  }

  $('#intakeForm').addEventListener('submit',e=>{
    e.preventDefault();
    if(submit.disabled)return;
    // Upload intentionally remains fail-closed until the Drive adapter is verified.
  });
  load();
})();