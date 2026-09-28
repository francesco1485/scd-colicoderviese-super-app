import React,{useEffect,useMemo,useState} from "react";
import {createRoot} from "react-dom/client";
import "./styles.css";

const API="/api/scd";
const NAV=[
  ["home","Home"],["radar","Radar"],["community","Tifosi"],["join","Gioca"],["business","Partner"],["more","Altro"]
];
const HUB=[
  ["join","⚽","Gioca con noi","Pre-iscrizione, prova, open day"],
  ["business","🤝","Diventa sponsor","Partnership e proposte commerciali"],
  ["tournaments","🏆","Iscrivi una squadra","Tornei, eventi e manifestazioni"],
  ["fields","🏟️","Affitta un campo","Richiedi disponibilità impianti"],
  ["tickets","🎟️","Biglietti","Prenota gare ed eventi"],
  ["cards","💳","Card SCD","Tifoso, famiglia, tesserato, partner"],
  ["fantasy","⭐","Fantacalcio SCD","Interno e community, senza denaro"],
  ["community","📣","Area tifosi","Sondaggi, foto, idee e community"],
  ["ideas","💡","Proponi un'idea","Sport, sociale, tecnologia, territorio"],
  ["reports","✉️","Segnalazioni","Info, correzioni, problemi tecnici"],
  ["safe","🛡️","Safeguarding","Canale separato e riservato"],
  ["contact","☎️","Contatti","Parla con la società"]
];

function App(){
 const [page,setPage]=useState("home");
 const [feed,setFeed]=useState(null);
 const [loading,setLoading]=useState(true);
 const [sky,setSky]=useState(false);
 useEffect(()=>{loadFeed();const t=setInterval(loadFeed,60000);return()=>clearInterval(t)},[]);
 useEffect(()=>{if("serviceWorker"in navigator) navigator.serviceWorker.register("/sw.js").catch(()=>{})},[]);
 async function loadFeed(){
   try{
     const r=await fetch(API,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"public.feed",payload:{limit:30}})});
     const j=await r.json(); setFeed(j?.data||null);
   }catch(e){setFeed(null)} finally{setLoading(false)}
 }
 const pageTitle=useMemo(()=>HUB.find(x=>x[0]===page)?.[2]||"",[page]);
 return <div className="app-shell">
   <header className="topbar">
     <button className="brand" onClick={()=>setPage("home")}>
       <div className="crest">SCD</div>
       <div><b>S.D.C. <span>COLICO</span>DERVIESE</b><small>PIÙ DI UNA SQUADRA · UN TERRITORIO · UNA FAMIGLIA</small></div>
     </button>
     <button className="bell">●</button>
   </header>
   <main>
    {page==="home"&&<Home feed={feed} loading={loading} go={setPage}/>}
    {page==="radar"&&<Radar feed={feed} loading={loading}/>}
    {page==="community"&&<Community go={setPage}/>}
    {page==="business"&&<Business/>}
    {page==="join"&&<Join/>}
    {page==="fantasy"&&<SimplePage title="Fantacalcio SCD" kicker="COMMUNITY GAME" body="Due modalità: interno SCD ed esterno/community. Solo utenti registrati, nessun denaro e nessuna scommessa. Rose, giornate, punteggi e classifiche verranno alimentati dal gestionale." cta="Registrati per partecipare"/>}
    {page==="fields"&&<RequestForm title="Affitta un campo" type="AFFITTO_CAMPO" fields={["Nome referente","Società / Ente","Telefono","Email","Data richiesta","Fascia oraria","Numero persone"]}/>}
    {page==="tournaments"&&<RequestForm title="Iscrivi la tua squadra a un torneo" type="TORNEO" fields={["Società","Categoria / Annata","Referente","Email","Telefono","Note"]}/>}
    {page==="tickets"&&<RequestForm title="Biglietti ed eventi" type="BIGLIETTO" fields={["Nome","Cognome","Email","Telefono","Evento / Gara","Numero biglietti"]}/>}
    {page==="cards"&&<RequestForm title="Richiedi una Card SCD" type="CARD" fields={["Nome","Cognome","Email","Telefono","Tipo Card: Tifoso / Tesserato / Famiglia / Partner"]}/>}
    {page==="ideas"&&<RequestForm title="Proponi un'idea o progetto" type="IDEA_PROGETTO" fields={["Nome","Cognome","Email","Telefono","Titolo idea","Area","Descrizione"]}/>}
    {page==="reports"&&<RequestForm title="Segnalazioni e informazioni" type="SEGNALAZIONE" fields={["Nome","Cognome","Email","Telefono","Categoria","Oggetto","Dettagli"]}/>}
    {page==="contact"&&<SimplePage title="Contatti" kicker="SCD COLICODERVIESE" body="Per informazioni generali, tesseramento, tornei, collaborazioni e servizi puoi utilizzare i moduli dedicati nella Super App. Le richieste vengono instradate verso il settore corretto." cta="Torna ai servizi"/>}
    {page==="safe"&&<Safeguarding/>}
    {page==="more"&&<Hub go={setPage}/>}
    {!["home","radar","community","business","join","fantasy","fields","tournaments","tickets","cards","ideas","reports","contact","safe","more"].includes(page)&&<SimplePage title={pageTitle||"SCD"} kicker="SUPER APP" body="Sezione in attivazione e collegamento con il gestionale centrale." cta="Torna alla Home"/>}
   </main>
   <button className="sky" onClick={()=>setSky(!sky)} aria-label="Assistente Sky"><span>🐿️</span><i></i></button>
   {sky&&<SkyPanel go={setPage} close={()=>setSky(false)}/>}
   <nav className="bottom-nav">
     {NAV.map(([id,label])=><button key={id} className={page===id?"active":""} onClick={()=>setPage(id)}><span>{id==="home"?"⌂":id==="radar"?"⌁":id==="community"?"♟":id==="join"?"⚽":id==="business"?"◇":"☰"}</span>{label}</button>)}
   </nav>
 </div>
}

function Home({feed,loading,go}){
 const items=feed?.items||[];
 const next=feed?.nextMatch||null;
 const result=feed?.lastResult||null;
 return <>
  <section className="hero">
    <div className="mountains"></div>
    <div className="hero-copy">
      <p className="eyebrow">COLICO · ALTO LARIO</p>
      <h1>Questa settimana<br/><em>vive qui.</em></h1>
      <p>Gare, risultati, eventi, territorio e community. Tutto il mondo ColicoDerviese in un'unica app.</p>
      <div className="hero-actions"><button onClick={()=>go("join")}>GIOCA CON NOI</button><button className="ghost" onClick={()=>go("business")}>DIVENTA PARTNER</button></div>
    </div>
  </section>
  <section className="flash"><b>FLASH</b><span>Informazioni ufficiali, eventi e aggiornamenti live</span><button onClick={()=>go("radar")}>VEDI TUTTO ›</button></section>
  <section className="match-grid">
    <Match label="PROSSIMA GARA" match={next} loading={loading}/>
    <Match label="ULTIMO RISULTATO" match={result} loading={loading}/>
  </section>
  <section className="section">
    <div className="section-head"><div><p className="eyebrow">VIVI LA COLICODERVIESE</p><h2>Entra nel mondo SCD</h2></div></div>
    <Hub go={go} compact/>
  </section>
  <section className="section deep-block">
    <div className="section-head"><div><p className="eyebrow">SCD RADAR</p><h2>In primo piano</h2></div><button onClick={()=>go("radar")}>TUTTO IL RADAR</button></div>
    <div className="feed-grid">
      {loading?[1,2,3].map(i=><div className="skeleton" key={i}/>):items.slice(0,6).map((x,i)=><article className="feed-card" key={x.id||i}><small>{x.source||x.kind||"SCD"}</small><h3>{x.title||"Aggiornamento SCD"}</h3><p>{x.body||x.summary||"Contenuto ufficiale in aggiornamento."}</p>{x.link&&<a href={x.link} target="_blank" rel="noreferrer">APRI FONTE ↗</a>}</article>)}
      {!loading&&items.length===0&&<div className="empty">Dati pubblici in sincronizzazione con il gestionale. Nessun contenuto inventato viene mostrato.</div>}
    </div>
  </section>
  <Affiliations/>
 </>;
}
function Match({label,match,loading}){
 return <article className="match-card"><small>{label}</small>{loading?<div className="skeleton line"/>:match?<><div className="teams"><b>SCD COLICODERVIESE</b><strong>VS</strong><b>{match.avversario?.nome||match.avversario||"AVVERSARIO"}</b></div><h3>{match.data||match.date||""} {match.ora||match.time||""}</h3><p>{match.competizione||match.campionato||""}</p></>:<><h3>DATO IN SINCRONIZZAZIONE</h3><p>Appena disponibile dal backend ufficiale verrà mostrato qui.</p></>}</article>
}
function Hub({go,compact=false}){return <div className={compact?"hub compact":"hub"}>{HUB.map(([id,ic,t,s])=><button key={id} onClick={()=>go(id)}><span className="hub-icon">{ic}</span><b>{t}</b><small>{s}</small></button>)}</div>}
function Radar({feed,loading}){const items=feed?.items||[];return <Page title="SCD Radar" sub="Sito ufficiale, fonti sportive, federazione, social e web: sempre con fonte e link originale."><div className="radar-list">{loading?<div className="skeleton big"/>:items.length?items.map((x,i)=><article key={x.id||i}><div><small>{x.source||x.kind||"FONTE"}</small><h3>{x.title||"Aggiornamento"}</h3><p>{x.body||x.summary||""}</p></div>{x.link?<a href={x.link} target="_blank" rel="noreferrer">FONTE ↗</a>:<span>VERIFICA</span>}</article>):<div className="empty">Radar in sincronizzazione. I contenuti appariranno solo dopo verifica della fonte.</div>}</div></Page>}
function Community({go}){return <Page title="SCD Community" sub="Lo spazio dei tifosi, delle famiglie e di chi vive il territorio. Tutti i contributi sono moderati."><div className="feature-grid"><Card t="Muro dei tifosi" d="Messaggi e foto dal territorio, pubblicati solo dopo moderazione."/><Card t="Sondaggi" d="MVP, eventi, iniziative e preferenze community."/><Card t="Pronostico SCD" d="Solo gioco community, nessun denaro e nessun premio monetario."/><Card t="Fantacalcio" d="Leghe interne ed esterne per utenti registrati." on={()=>go("fantasy")}/></div></Page>}
function Business(){return <Page title="Partner Hub" sub="La Super App è anche una piattaforma commerciale del territorio. Sponsor, fornitori e partner possono entrare nel progetto SCD."><div className="feature-grid"><Card t="Main Partner" d="Presenza premium su app, eventi, squadre e territorio."/><Card t="Digital Partner" d="Banner, ticker, contenuti e performance misurabili."/><Card t="Event Partner" d="Tornei, iniziative, naming e attivazioni locali."/><Card t="Proponi prodotti o servizi" d="Fornitori e aziende possono proporre collaborazioni." /></div><RequestForm embedded title="Richiedi una proposta" type="SPONSOR" fields={["Azienda","Referente","Email","Telefono","Settore","Interesse","Budget indicativo","Messaggio"]}/></Page>}
function Join(){return <Page title="Vuoi giocare con noi?" sub="Pre-iscrizione, prova, open day e richiesta informazioni per entrare nella SCD ColicoDerviese."><RequestForm embedded title="Invia la tua richiesta" type="TESSERAMENTO" fields={["Nome atleta","Cognome atleta","Data di nascita","Comune","Nome genitore se minore","Email","Telefono","Categoria / Annata","Esperienza precedente","Richiesta prova / Open Day"]}/></Page>}
function Safeguarding(){return <Page title="Safeguarding" sub="Canale separato e riservato. Le segnalazioni non confluiscono nel CRM, nella community o nelle richieste ordinarie."><div className="safe-box"><h3>Segnalazione riservata</h3><p>Puoi segnalare fatti o situazioni anche se non sei direttamente coinvolto. Per il canale formale utilizza la PEC <b>calciocolicoderviese@pec.it</b> con oggetto <b>RISERVATO - SAFEGUARDING</b>.</p><p>In caso di pericolo immediato, emergenza o possibile reato contatta il 112 o le autorità competenti.</p><a href="mailto:calciocolicoderviese@pec.it?subject=RISERVATO%20-%20SAFEGUARDING">APRI IL CANALE RISERVATO</a></div></Page>}
function RequestForm({title,type,fields,embedded=false}){
 const [sent,setSent]=useState(false);
 function submit(e){e.preventDefault();setSent(true)}
 return <section className={embedded?"form-wrap embedded":"form-wrap"}><h2>{title}</h2>{sent?<div className="success">Richiesta preparata. Il collegamento diretto al gestionale è in attivazione; non vengono inventate conferme o pagamenti.</div>:<form onSubmit={submit}>{fields.map(f=><label key={f}>{f}<input required={["Email","Telefono"].includes(f)} placeholder={f}/></label>)}<label className="check"><input type="checkbox" required/> Acconsento al trattamento dei dati per questa richiesta.</label><button>INVIA RICHIESTA</button><small>Tipo richiesta: {type}. Nessun pagamento viene richiesto in questa fase.</small></form>}</section>
}
function SimplePage({title,kicker,body,cta}){return <Page title={title} sub={body}><div className="simple"><p className="eyebrow">{kicker}</p><button onClick={()=>location.reload()}>{cta}</button></div></Page>}
function Page({title,sub,children}){return <div className="page"><section className="page-hero"><p className="eyebrow">S.D.C. COLICODERVIESE</p><h1>{title}</h1><p>{sub}</p></section>{children}<Affiliations/></div>}
function Card({t,d,on}){return <button className="feature-card" onClick={on}><h3>{t}</h3><p>{d}</p></button>}
function Affiliations(){return <section className="aff"><p>LE NOSTRE AFFILIAZIONI E RICONOSCIMENTI</p><div><b>LND</b><b>INSIEME AL MONZA</b><b>FIGC SGS · 3° LIVELLO</b></div></section>}
function SkyPanel({go,close}){const quick=[["radar","Prossima partita"],["join","Come mi iscrivo?"],["business","Diventare sponsor"],["safe","Safeguarding"],["contact","Contatti"]];return <div className="sky-panel"><header><b>Sky · Assistente SCD</b><button onClick={close}>×</button></header><p>Ciao! Ti porto subito nella sezione giusta.</p>{quick.map(([id,t])=><button key={id} onClick={()=>{go(id);close()}}>{t} ›</button>)}</div>}
createRoot(document.getElementById("root")).render(<App/>);