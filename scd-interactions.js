(()=>{
  const q=(s,r=document)=>r.querySelector(s);
  const qa=(s,r=document)=>[...r.querySelectorAll(s)];
  const twinKey='scd:twin:v1';
  window.SCDExperience?.bind?.(document,'base');

  q('#ngMirrorQuick')?.addEventListener('click',()=>{
    window.SCDMeta?.record?.('mirror',1);
    window.SCDNextGen?.openMirror?.();
  });

  q('#twinLocker')?.addEventListener('click',e=>{
    const b=e.target.closest('[data-kit]');
    if(!b)return;
    qa('#twinLocker [data-kit]').forEach(x=>x.classList.toggle('active',x===b));
    const figure=q('#avatarFigure');
    if(figure)figure.dataset.kit=b.dataset.kit;
    try{
      const t=JSON.parse(localStorage.getItem(twinKey)||'{}');
      t.kit=b.dataset.kit;
      localStorage.setItem(twinKey,JSON.stringify(t));
    }catch{}
  });

  try{
    const t=JSON.parse(localStorage.getItem(twinKey)||'{}');
    if(t.kit)q('#twinLocker [data-kit="'+t.kit+'"]')?.click();
  }catch{}

  const synth=('speechSynthesis' in window)?window.speechSynthesis:null;
  const voiceSelect=q('#mirrorVoice');
  let voices=[];
  let profile='adult';

  function refreshVoices(){
    if(!synth||!voiceSelect)return;
    voices=synth.getVoices();
    voiceSelect.innerHTML='<option value="">Voce dispositivo automatica</option>';
    voices.forEach((v,i)=>{
      const o=document.createElement('option');
      o.value=String(i);
      o.textContent=(v.name||'Voce')+' · '+(v.lang||'');
      voiceSelect.appendChild(o);
    });
  }

  refreshVoices();
  if(synth)synth.onvoiceschanged=refreshVoices;

  qa('[data-voice-profile]').forEach(b=>b.addEventListener('click',()=>{
    profile=b.dataset.voiceProfile||'adult';
    qa('[data-voice-profile]').forEach(x=>x.classList.toggle('active',x===b));
  }));

  function latestMirror(){
    const rows=qa('#mirrorMessages .msg.ai');
    return rows.at(-1)?.textContent?.trim()||'';
  }

  q('#readMirror')?.addEventListener('click',()=>{
    if(!synth)return;
    const text=latestMirror();
    if(!text)return;
    synth.cancel();
    const u=new SpeechSynthesisUtterance(text);
    const idx=parseInt(voiceSelect?.value||'',10);
    if(Number.isInteger(idx)&&voices[idx])u.voice=voices[idx];
    if(profile==='bright'){u.pitch=1.08;u.rate=.98}
    else if(profile==='youth'){u.pitch=1.45;u.rate=1}
    else{u.pitch=.96;u.rate=.94}
    synth.speak(u);
  });

  q('#stopMirror')?.addEventListener('click',()=>synth?.cancel());
})();