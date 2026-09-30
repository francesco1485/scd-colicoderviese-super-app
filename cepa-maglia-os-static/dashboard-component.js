const COPY=Object.freeze({
  heroTitle:"Persone, protezione e opportunità per un territorio che cresce.",
  heroBody:"Dal Lario alla Valtellina, Maglia 360 mette in relazione consulenza, territorio, competenze specialistiche e sviluppo C.E.P.A.",
  territories:["Colico","Mandello del Lario","Lecco","Valtellina","Lago di Como"]
});
const FALLBACK=Object.freeze({
  partners:[],products:[],collaborators:[],actions:[],
  benchmark:{solid:[],improve:[]},
  metrics:{docs:0,market:0,knowledge:"0/0",terms:"0/0",partnerDocs:"0/0",cepa:"0/0"},
  cepa:{steps:["Centro CEPA","Sportelli SAP","Mandello","Lecco","Italia"]},
  user:{label:"Area riservata",role:""}
});
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const ICONS={
  car:'<svg viewBox="0 0 24 24"><path d="m5 15 1.8-5h10.4L19 15m-15 0h16v4H4zm2.5 4v2m11-2v2"/></svg>',
  home:'<svg viewBox="0 0 24 24"><path d="M3 11.5 12 4l9 7.5V20h-6v-6H9v6H3z"/></svg>',
  heart:'<svg viewBox="0 0 24 24"><path d="M12 20 4.8 13a4.7 4.7 0 0 1 6.7-6.6L12 7l.5-.6A4.7 4.7 0 1 1 19.2 13z"/></svg>',
  chart:'<svg viewBox="0 0 24 24"><path d="M4 20V9m6 11V4m6 16v-7m4 7H2"/></svg>',
  shield:'<svg viewBox="0 0 24 24"><path d="M12 3 5 6v5c0 4.8 2.6 8 7 10 4.4-2 7-5.2 7-10V6z"/></svg>',
  mail:'<svg viewBox="0 0 24 24"><path d="M3 6h18v12H3zM3 7l9 7 9-7"/></svg>',
  search:'<svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></svg>',
  docs:'<svg viewBox="0 0 24 24"><path d="M7 3h8l4 4v14H7zM15 3v5h5M10 12h6m-6 4h6"/></svg>',
  people:'<svg viewBox="0 0 24 24"><circle cx="8" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20c0-4 2-7 5-7s5 3 5 7m1-5c3 0 5 2 5 5"/></svg>',
  scale:'<svg viewBox="0 0 24 24"><path d="M12 4v16m-5-2h10M5 7h14M5 7l-3 6h6zm14 0-3 6h6z"/></svg>',
  school:'<svg viewBox="0 0 24 24"><path d="m3 10 9-5 9 5-9 5zM7 13v5c3 2 7 2 10 0v-5"/></svg>',
  radar:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 12 18 6"/></svg>'
};
class MagliaDashboard extends HTMLElement{
  constructor(){super();this.attachShadow({mode:"open"});this._data=structuredClone(FALLBACK)}
  set data(v){this._data={...structuredClone(FALLBACK),...(v||{})};this.render()}
  get data(){return this._data}
  connectedCallback(){this.render()}
  dispatch(type,detail={}){this.dispatchEvent(new CustomEvent(type,{detail,bubbles:true,composed:true}))}
  icon(name){return '<span class="icon">'+(ICONS[name]||ICONS.chart)+'</span>'}
  render(){
    const d=this._data||FALLBACK,p=d.partners||[],pr=d.products||[],c=d.collaborators||[],m=d.metrics||FALLBACK.metrics,b=d.benchmark||FALLBACK.benchmark,a=d.actions||[];
    const productIcon=x=>({mobilita:"car",casa:"home",salute:"heart",tutela_legale:"scale",impresa:"chart",energia:"shield",previdenza:"chart"}[x.category]||"shield");
    this.shadowRoot.innerHTML=\`
<style>
:host{display:block;color:#143247;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
*{box-sizing:border-box}button,input{font:inherit}button{cursor:pointer}
.shell{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:12px}
.main{display:grid;gap:10px;min-width:0}.rail{display:grid;grid-template-rows:auto auto 1fr auto;gap:10px;min-width:0}
.panel{background:#fff;border:1px solid #dbe5e9;border-radius:16px;box-shadow:0 8px 24px rgba(13,48,72,.055);overflow:hidden}
.hero{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(225px,.55fr);gap:18px;padding:20px;background:linear-gradient(135deg,#0b3853,#0d5e70 58%,#218c84);color:#fff}
.heroCopy{display:flex;flex-direction:column;justify-content:center;gap:10px;padding:6px 8px}.crumb{font-size:9px;font-weight:800;color:#d2edf3;letter-spacing:.04em}
.hero h1{margin:0;font-family:Georgia,"Times New Roman",serif;font-size:clamp(30px,4vw,53px);line-height:.98;max-width:820px}
.hero p{margin:0;color:#e7f2f5;font-size:11px;line-height:1.5;max-width:700px}.heroActions{display:flex;gap:8px;flex-wrap:wrap}
.heroActions button{border:0;border-radius:999px;padding:9px 13px;font-size:9px;font-weight:900}.primary{background:#18a06f;color:#fff}.secondary{background:#fff;color:#17445f}
.visual{display:grid;gap:8px;border:1px solid rgba(255,255,255,.2);border-radius:14px;padding:12px;background:rgba(255,255,255,.09)}
.map{width:100%;height:120px}.map path{fill:none;stroke:#dff5ed;stroke-width:2}.map .lake{fill:#69b7cf;stroke:none;opacity:.85}.map circle{fill:#fff;stroke:#129169;stroke-width:3}
.territories{display:flex;flex-wrap:wrap;gap:5px}.territories span{border:1px solid rgba(255,255,255,.24);border-radius:999px;padding:4px 7px;font-size:8px;color:#f1fbfd}
.sectionHead{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:9px 11px;border-bottom:1px solid #ecf0f2}
.sectionHead>div{display:flex;align-items:center;gap:8px;min-width:0}.sectionHead strong{display:block;font-size:11px;color:#123a56}.sectionHead small{display:block;font-size:7.5px;color:#71838e;margin-top:1px}
.linkBtn{border:0;background:transparent;color:#1674a6;font-size:8px;font-weight:800;white-space:nowrap}
.icon{width:28px;height:28px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(145deg,#0d5d92,#1685bb);color:#fff;flex:0 0 auto}.icon svg{width:15px;height:15px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.partners{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:7px;padding:9px}.partner{display:flex;flex-direction:column;gap:5px;border:1px solid #dce6ea;border-radius:11px;background:#fbfdfe;padding:10px;min-height:102px;text-align:left}
.logo{width:42px;height:30px;border-radius:9px;display:grid;place-items:center;background:#eaf5ef;color:#0c7457;font-weight:950;font-size:8px}.partner strong{font-size:10px;color:#153c57;line-height:1.15}.partner small{font-size:7px;color:#758792;line-height:1.3}
.badge{margin-top:auto;display:flex;justify-content:center;border-radius:999px;padding:4px 6px;background:#e8f5ed;color:#327357;font-size:6.5px;font-weight:900;text-transform:uppercase}
.products{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:7px;padding:9px}.product{display:flex;align-items:center;gap:8px;border:1px solid #dfe7ea;border-radius:10px;background:#fbfcfd;padding:8px;text-align:left;color:inherit}
.product .icon{width:34px;height:34px;background:#e8f3fa;color:#186d9d}.product strong{display:block;font-size:8.5px;color:#143d59}.product small{display:block;font-size:6.8px;color:#7a8b95;line-height:1.25;margin-top:2px}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px}.rows{padding:5px 10px 9px}.row{display:grid;grid-template-columns:minmax(0,1.1fr) .85fr .7fr;gap:8px;align-items:center;padding:7px 2px;border-bottom:1px solid #edf1f2;font-size:7.5px}
.row:last-child{border-bottom:0}.row strong{font-size:8px;color:#153b55}.row span{color:#748690}.row b{color:#0f976a;text-align:right}.benchmark{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:9px}
.bench{border-radius:10px;padding:9px;background:#edf7f1}.bench.warn{background:#fff1ef}.bench h4{margin:0 0 6px;font-size:8.5px;color:#143b55}.bench div{display:flex;gap:5px;font-size:7px;color:#657982;line-height:1.4;margin:3px 0}
.bench div::before{content:"✓";color:#109368;font-weight:950}.bench.warn div::before{content:"△";color:#d64e4e}
.bottom{display:grid;grid-template-columns:1.25fr .75fr;gap:10px}.journey{display:grid;grid-template-columns:repeat(9,auto);align-items:center;gap:5px;padding:12px;overflow:auto}
.step{display:flex;flex-direction:column;align-items:center;gap:4px;border:0;background:transparent;min-width:75px}.step span{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(145deg,#e7f4fb,#dcefe6);border:1px solid #c9dce4;color:#145f8d;font-size:7px;font-weight:900}
.step strong{font-size:7px;color:#153c57}.step small{font-size:6.5px;color:#81919a}.line{width:16px;height:2px;background:#19a171}
.tools{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:9px}.tool{display:flex;gap:8px;align-items:flex-start;border:1px solid #dfe7ea;background:#fff;border-radius:10px;padding:9px;text-align:left;color:inherit}
.tool .icon{width:30px;height:30px;background:#edf5fa;color:#176c9d}.tool strong{display:block;font-size:8px;color:#163c56}.tool small{display:block;font-size:6.7px;color:#7b8c96;line-height:1.3;margin-top:2px}
.control{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;padding:9px}.metric{border:1px solid #dfe7ea;border-radius:10px;background:#fbfcfd;padding:9px;text-align:left}.metric span{display:block;font-size:6.5px;color:#7b8c96;text-transform:uppercase;font-weight:900}.metric strong{display:block;font-size:18px;color:#153a54;margin-top:4px}
.assistant{display:grid;grid-template-rows:auto 205px auto;background:#fff}.assistantHead{display:flex;align-items:center;gap:8px;padding:10px;border-bottom:1px solid #e7ecee}.avatar{width:38px;height:38px;border-radius:50%;object-fit:cover;border:2px solid #fff;box-shadow:0 0 0 1px #dbe5e9}
.assistantHead strong{display:block;font-size:10px;color:#143a55}.assistantHead small{display:block;font-size:7px;color:#758792}.status{display:flex;align-items:center;gap:5px}.dot{width:7px;height:7px;border-radius:50%;background:#32aa75}
.portrait{background:linear-gradient(160deg,#edf6f1,#d9eee6 48%,#cbe4e9);overflow:hidden}.portrait img{width:100%;height:205px;object-fit:cover;object-position:50% 12%;mix-blend-mode:multiply}
.quick{display:grid;gap:6px;padding:9px}.quick button{display:flex;align-items:center;gap:8px;border:1px solid #dfe7ea;border-radius:10px;background:#fff;padding:9px;text-align:left;color:#153b55}.quick .icon{width:29px;height:29px;background:#edf5fa;color:#176c9d}.quick strong{font-size:8.5px}.quick small{display:block;font-size:6.8px;color:#7c8c96;margin-top:2px}
.chat{display:grid;grid-template-columns:1fr 34px;gap:6px;padding:9px;border-top:1px solid #e7ecee}.chat input{min-width:0;border:1px solid #d4dfe4;border-radius:9px;padding:8px 9px;font-size:8px;outline:none}.chat input:focus{border-color:#168f69;box-shadow:0 0 0 3px rgba(22,143,105,.1)}.chat button{border:0;border-radius:9px;background:#176b99;color:#fff}
.today{padding:8px}.todayRow{display:grid;grid-template-columns:1fr auto;gap:7px;padding:8px;border-bottom:1px solid #edf1f2}.todayRow:last-child{border-bottom:0}.todayRow strong{font-size:8px;color:#153b55}.todayRow small{display:block;font-size:6.8px;color:#798a94;margin-top:2px}.todayRow span{font-size:6.5px;border-radius:999px;background:#fff1df;color:#86662e;padding:4px 6px;height:max-content}
.user{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px}.user strong{display:block;font-size:8px;color:#153b55}.user small{display:block;font-size:6.5px;color:#7d8c95}.privacy{font-size:6.5px;color:#758791;border:1px solid #dce5e8;border-radius:999px;padding:4px 6px}
@media(max-width:1180px){.shell{grid-template-columns:1fr}.rail{grid-template-columns:1fr 1fr;grid-template-rows:auto auto}.assistant{grid-template-columns:240px 1fr;grid-template-rows:auto auto}.portrait{grid-row:1/3}.quick{grid-column:2}.chat{grid-column:1/-1}.products{grid-template-columns:repeat(3,1fr)}}
@media(max-width:820px){.hero{grid-template-columns:1fr}.visual{display:none}.partners{display:flex;overflow:auto}.partner{min-width:170px}.products{display:flex;overflow:auto}.product{min-width:150px}.grid2,.bottom{grid-template-columns:1fr}.control{grid-template-columns:1fr 1fr}.rail{display:none}}
@media(max-width:520px){.hero h1{font-size:31px}.hero{padding:14px}.products,.partners{padding-right:2px}.control{grid-template-columns:1fr 1fr}.row{grid-template-columns:1fr auto}.row span{display:none}}
</style>
<div class="shell">
  <div class="main">
    <section class="panel hero">
      <div class="heroCopy">
        <div class="crumb">Lago di Como · Colico · Mandello · Lecco · Valtellina</div>
        <h1>\${esc(COPY.heroTitle)}</h1>
        <p>\${esc(COPY.heroBody)}</p>
        <div class="heroActions">
          <button class="primary" data-nav="cepa">Scopri C.E.P.A. →</button>
          <button class="secondary" data-nav="territories">Il territorio</button>
          <button class="secondary" data-public>Vetrina progetto</button>
        </div>
      </div>
      <div class="visual">
        <svg class="map" viewBox="0 0 280 140" aria-label="Mappa concettuale Lario e Valtellina">
          <path class="lake" d="M112 18c18 15 20 28 16 40-4 12-14 20-8 34 5 12 20 20 13 34-7 12-25 8-34-2-11-12-15-29-7-43 6-11 12-19 10-30-2-13-4-22 10-33Z"/>
          <path d="M18 105C50 88 70 75 94 53M126 116c28-6 51-18 72-38m-62-47c36 8 66 24 96 55"/>
          <circle cx="74" cy="71" r="5"/><circle cx="116" cy="31" r="5"/><circle cx="135" cy="100" r="5"/><circle cx="198" cy="77" r="5"/>
        </svg>
        <div class="territories">\${COPY.territories.map(x=>'<span>'+esc(x)+'</span>').join('')}</div>
      </div>
    </section>

    <section class="panel">
      <div class="sectionHead"><div>\${this.icon("shield")}<div><strong>Compagnie madri e collaborazioni</strong><small>Un ecosistema di competenze in un colpo d'occhio.</small></div></div><button class="linkBtn" data-nav="products">Tutte le competenze →</button></div>
      <div class="partners">\${p.slice(0,5).map((x,i)=>'<button class="partner" data-partner="'+esc(x.id)+'"><span class="logo">'+esc(x.short||x.code||("P"+(i+1)))+'</span><strong>'+esc(x.name)+'</strong><small>'+esc(x.subtitle||x.capability||"Competenza da definire")+'</small><span class="badge">'+esc(x.label||"partner")+'</span></button>').join('')||'<div class="partner"><strong>Dati partner in caricamento</strong></div>'}</div>
    </section>

    <section class="panel">
      <div class="sectionHead"><div>\${this.icon("chart")}<div><strong>Prodotti e sintesi</strong><small>Leggere subito il bisogno, poi aprire il dettaglio.</small></div></div><button class="linkBtn" data-nav="products">Vedi prodotti →</button></div>
      <div class="products">\${pr.slice(0,6).map(x=>'<button class="product" data-product="'+esc(x.id)+'">'+this.icon(productIcon(x))+'<div><strong>'+esc(x.label||x.name)+'</strong><small>'+esc(x.shortSummary||x.category||"Scheda in sviluppo")+'</small></div></button>').join('')||'<div class="product"><strong>Prodotti in caricamento</strong></div>'}</div>
    </section>

    <div class="grid2">
      <section class="panel">
        <div class="sectionHead"><div>\${this.icon("people")}<div><strong>Collaboratori e remunerazioni</strong><small>Rete, portafoglio e sviluppo.</small></div></div><button class="linkBtn" data-nav="collaborators">Gestisci →</button></div>
        <div class="rows">\${c.slice(0,5).map(x=>'<button class="row" data-collaborator="'+esc(x.id)+'"><strong>'+esc(x.name)+'</strong><span>'+esc(x.detail||"")+'</span><b>'+esc(x.value||"")+'</b></button>').join('')||'<div class="row"><strong>Nessun dato disponibile</strong></div>'}</div>
      </section>
      <section class="panel">
        <div class="sectionHead"><div>\${this.icon("scale")}<div><strong>Confronti e benchmark</strong><small>Solidità e aree da completare.</small></div></div><button class="linkBtn" data-nav="comparisons">Apri analisi →</button></div>
        <div class="benchmark"><div class="bench"><h4>Punti solidi</h4>\${(b.solid||[]).slice(0,4).map(x=>'<div>'+esc(x)+'</div>').join('')}</div><div class="bench warn"><h4>Da completare</h4>\${(b.improve||[]).slice(0,4).map(x=>'<div>'+esc(x)+'</div>').join('')}</div></div>
      </section>
    </div>

    <div class="bottom">
      <section class="panel">
        <div class="sectionHead"><div>\${this.icon("school")}<div><strong>C.E.P.A. · Centro Educazione Previdenziale e Assicurativa</strong><small>Formazione, contenuti, SAP e territorio.</small></div></div><button class="linkBtn" data-nav="cepa">Scopri CEPA →</button></div>
        <div class="journey">\${(d.cepa?.steps||FALLBACK.cepa.steps).map((x,i)=>'<button class="step" data-nav="'+(i===1||i===2||i===3?'territories':'cepa')+'"><span>0'+(i+1)+'</span><strong>'+esc(x)+'</strong><small>'+(i===0?'Centro':i===4?'Visione':'Territorio')+'</small></button>'+(i<4?'<i class="line"></i>':'')).join('')}</div>
      </section>
      <section class="panel">
        <div class="sectionHead"><div>\${this.icon("radar")}<div><strong>Strumenti di lavoro</strong><small>Accessi rapidi alle azioni utili.</small></div></div></div>
        <div class="tools">
          <button class="tool" data-nav="documents">\${this.icon("docs")}<div><strong>Documenti</strong><small>\${esc(m.docs)} riferimenti</small></div></button>
          <button class="tool" data-nav="aiMail">\${this.icon("mail")}<div><strong>AI Mail & Chat</strong><small>Comunicazioni guidate</small></div></button>
          <button class="tool" data-nav="networkRadar">\${this.icon("radar")}<div><strong>Radar Rete</strong><small>\${esc(m.market)} soggetti osservati</small></div></button>
          <button class="tool" data-nav="growthKits">\${this.icon("people")}<div><strong>Kit Collaboratore</strong><small>Valutazione e strumenti cliente</small></div></button>
        </div>
      </section>
    </div>

    <section class="panel">
      <div class="sectionHead"><div>\${this.icon("shield")}<div><strong>Control Tower della conoscenza</strong><small>Quanto è realmente documentato.</small></div></div></div>
      <div class="control">
        <button class="metric" data-nav="products"><span>Prodotti</span><strong>\${esc(m.knowledge)}</strong></button>
        <button class="metric" data-nav="collaborators"><span>Remunerazioni</span><strong>\${esc(m.terms)}</strong></button>
        <button class="metric" data-nav="documents"><span>Dossier partner</span><strong>\${esc(m.partnerDocs)}</strong></button>
        <button class="metric" data-nav="cepa"><span>CEPA readiness</span><strong>\${esc(m.cepa)}</strong></button>
      </div>
    </section>
  </div>

  <aside class="rail">
    <section class="panel assistant">
      <div class="assistantHead"><img class="avatar" src="./assistant_avatar.webp" alt=""><div><div class="status"><span class="dot"></span><strong>Lia</strong></div><small>La tua collega digitale Maglia 360</small></div></div>
      <div class="portrait"><img src="./assistant_avatar.webp" alt="Assistente territoriale Maglia 360"></div>
      <div class="quick">
        <button data-ai="Cosa devo fare oggi?">\${this.icon("chart")}<div><strong>Cosa facciamo oggi?</strong><small>Priorità e scadenze.</small></div></button>
        <button data-ai="Preparami un incontro con un cliente">\${this.icon("people")}<div><strong>Prepara un incontro</strong><small>Domande, documenti e grafica.</small></div></button>
        <button data-ai="Trova opportunità di rete">\${this.icon("search")}<div><strong>Trova opportunità</strong><small>Radar e nuova rete.</small></div></button>
        <button data-nav="aiMail">\${this.icon("mail")}<div><strong>Scrivi una mail</strong><small>Bozza personalizzata.</small></div></button>
      </div>
      <form class="chat"><input aria-label="Chiedi a Lia" placeholder="Chiedi a Lia..."><button aria-label="Invia">→</button></form>
    </section>

    <section class="panel">
      <div class="sectionHead"><div>\${this.icon("chart")}<div><strong>Oggi</strong><small>Le prime attività che meritano attenzione.</small></div></div><button class="linkBtn" data-nav="actions">Agenda →</button></div>
      <div class="today">\${a.slice(0,5).map(x=>'<button class="todayRow" data-action="'+esc(x.id)+'"><div><strong>'+esc(x.title)+'</strong><small>'+esc(x.detail||"")+'</small></div><span>'+esc(x.priority||"")+'</span></button>').join('')||'<div class="todayRow"><strong>Nessuna attività aperta</strong></div>'}</div>
    </section>

    <section class="panel user"><div><strong>\${esc(d.user?.label||"Area riservata")}</strong><small>\${esc(d.user?.role||"")}</small></div><span class="privacy">🔒 riservato</span></section>
  </aside>
</div>\`;
    this.shadowRoot.querySelectorAll("[data-nav]").forEach(el=>el.addEventListener("click",()=>this.dispatch("navigate",{view:el.dataset.nav})));
    this.shadowRoot.querySelectorAll("[data-partner]").forEach(el=>el.addEventListener("click",()=>this.dispatch("open-partner",{id:el.dataset.partner})));
    this.shadowRoot.querySelectorAll("[data-product]").forEach(el=>el.addEventListener("click",()=>this.dispatch("open-product",{id:el.dataset.product})));
    this.shadowRoot.querySelectorAll("[data-collaborator]").forEach(el=>el.addEventListener("click",()=>this.dispatch("open-collaborator",{id:el.dataset.collaborator})));
    this.shadowRoot.querySelectorAll("[data-action]").forEach(el=>el.addEventListener("click",()=>this.dispatch("open-action",{id:el.dataset.action})));
    this.shadowRoot.querySelectorAll("[data-ai]").forEach(el=>el.addEventListener("click",()=>this.dispatch("ask-assistant",{prompt:el.dataset.ai})));
    const form=this.shadowRoot.querySelector(".chat");form?.addEventListener("submit",e=>{e.preventDefault();const input=form.querySelector("input");const q=input.value.trim();if(q){this.dispatch("ask-assistant",{prompt:q});input.value=""}});
    this.shadowRoot.querySelector("[data-public]")?.addEventListener("click",()=>window.open("./presentazione.html","_blank","noopener"));
  }
}
if(!customElements.get("maglia-dashboard"))customElements.define("maglia-dashboard",MagliaDashboard);
