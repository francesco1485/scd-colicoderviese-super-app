import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Check,
  ChevronDown,
  CircleDot,
  Clock3,
  Filter,
  Menu,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import logoScd from "@/assets/logo-scd.png.asset.json";
import logoLnd from "@/assets/logo-lnd.png.asset.json";
import logoSgs from "@/assets/logo-sgs.png.asset.json";
import logoMonza from "@/assets/logo-monza.png.asset.json";
import { demoRows, templates, type TemplateId } from "./templates";

const statusItems = [
  { label: "Urgente", value: "03", note: "richiede review", tone: "danger" },
  { label: "Oggi", value: "07", note: "azioni demo", tone: "accent" },
  { label: "In attesa", value: "04", note: "input esterno", tone: "muted" },
  { label: "Approvazioni", value: "02", note: "Direzione", tone: "primary" },
];

function DemoMark({ compact = false }: { compact?: boolean }) {
  return <span className={cn("demo-mark", compact && "demo-mark-compact")}>DEMO_NOT_RUNTIME</span>;
}

function Affiliations() {
  return (
    <div className="affiliations" aria-label="Affiliazioni">
      <span>Affiliazioni</span>
      {[logoLnd, logoSgs, logoMonza].map((logo, index) => (
        <img key={logo.url} src={logo.url} alt={["LND", "SGS", "Monza affiliazione"][index]} />
      ))}
    </div>
  );
}

function FormationScene() {
  const players = [
    [50, 88, "P1"], [20, 70, "P2"], [42, 65, "P3"], [62, 65, "P4"], [82, 70, "P5"],
    [30, 43, "P6"], [52, 48, "P7"], [73, 42, "P8"], [22, 20, "P9"], [50, 16, "PLAYER-DEMO-09"], [78, 20, "P11"],
  ] as const;
  return (
    <div className="pitch" aria-label="Formazione demo 2D">
      <div className="pitch-line pitch-mid" /><div className="pitch-circle" /><div className="pitch-box pitch-top" /><div className="pitch-box pitch-bottom" />
      {players.map(([left, top, label]) => (
        <button key={label} className={cn("player-dot", label === "PLAYER-DEMO-09" && "player-selected")} style={{ left: `${left}%`, top: `${top}%` }} aria-label={label}>
          <span>{label === "PLAYER-DEMO-09" ? "09" : label.slice(1)}</span><small>{label}</small>
        </button>
      ))}
    </div>
  );
}

function VanScene() {
  const seats = ["AUTISTA", "ACCOMP.", "01", "02", "03", "04", "05", "06", "07"];
  return (
    <div className="van-map" aria-label="Pulmino con posti semantici">
      <div className="van-front"><span>PULMINO-DEMO-A</span><span>FRONTE</span></div>
      <div className="seat-grid">
        {seats.map((seat, index) => <button key={seat} className={cn("seat", index < 2 && "seat-role", index === 5 && "seat-alert")}><span>{seat}</span><small>{index === 5 ? "CHECK" : index < 2 ? "RUOLO" : "LIBERO"}</small></button>)}
      </div>
    </div>
  );
}

function FacilityScene() {
  return (
    <div className="facility-map" aria-label="Campi e spogliatoi demo">
      <button className="field-zone field-a"><strong>CAMPO A</strong><span>FINESTRA DEMO 18:00</span></button>
      <button className="field-zone field-b"><strong>CAMPO B</strong><span>PENDING_VISUAL_APPROVAL</span></button>
      <button className="room-zone room-1"><strong>SPOGL. 01</strong><span>ASSEGNATO</span></button>
      <button className="room-zone room-2"><strong>SPOGL. 02</strong><span>DA VERIFICARE</span></button>
      <div className="path-line" aria-hidden="true" />
    </div>
  );
}

function SpatialWorkspace() {
  const [scene, setScene] = useState<"formation" | "van" | "facility">("formation");
  return (
    <section className="workspace-shell">
      <div className="section-heading">
        <div><span className="eyebrow">T05 / 2D SPATIAL OPERATIONS</span><h2>Spatial Workspace</h2></div>
        <div className="segmented" aria-label="Seleziona scena">
          <button className={scene === "formation" ? "active" : ""} onClick={() => setScene("formation")}>Formazione</button>
          <button className={scene === "van" ? "active" : ""} onClick={() => setScene("van")}>Pulmino</button>
          <button className={scene === "facility" ? "active" : ""} onClick={() => setScene("facility")}>Impianti</button>
        </div>
      </div>
      <div className="spatial-layout">
        <div className="scene-canvas">{scene === "formation" ? <FormationScene /> : scene === "van" ? <VanScene /> : <FacilityScene />}</div>
        <aside className="scene-panel">
          <DemoMark compact />
          <span className="eyebrow">SELEZIONE CORRENTE</span>
          <h3>{scene === "formation" ? "PLAYER-DEMO-09" : scene === "van" ? "POSTO 04" : "CAMPO A"}</h3>
          <dl>
            <div><dt>Stato</dt><dd>DA VERIFICARE</dd></div>
            <div><dt>Origine</dt><dd>Dataset sintetico</dd></div>
            <div><dt>Scrittura</dt><dd>Disabilitata</dd></div>
          </dl>
          <Button variant="outline" className="w-full">Apri dettaglio <ArrowRight size={16} /></Button>
        </aside>
      </div>
    </section>
  );
}

function EditorialTemplate() {
  return <section className="editorial-stage"><div className="editorial-number">01</div><div className="editorial-copy"><DemoMark /><span className="eyebrow">TERRITORIO / IDENTITÀ / COMUNITÀ</span><h2>Il campo come infrastruttura sociale.</h2><p>Trattamento editoriale dimostrativo. Contenuti e immagini finali non ancora approvati.</p><Button>Apri anteprima <ArrowRight size={16} /></Button></div><div className="editorial-graphic" aria-hidden="true"><span>SCD</span><div /></div></section>;
}

function OperationalHome() {
  return <section><div className="section-heading"><div><span className="eyebrow">T02 / ACTION FIRST</span><h2>Operational Home</h2></div><Button variant="outline"><Filter size={16} /> Filtra</Button></div><div className="priority-strip">{statusItems.map(item => <button key={item.label} className={`priority priority-${item.tone}`}><span>{item.label}</span><strong>{item.value}</strong><small>{item.note}</small></button>)}</div><div className="ops-grid"><div className="ops-feed"><span className="eyebrow">PROSSIMA AZIONE</span><h3>Verificare input esterni prima della review</h3><p>Nessuna azione modifica sistemi reali. Il flusso simula priorità e presa in carico.</p><div className="timeline"><span /><div><strong>ENTITY-DEMO-03</strong><small>Review assegnata · 09:40</small></div><span /><div><strong>PROJECT-DEMO-02</strong><small>Dipendenza segnalata · 08:55</small></div></div></div><div className="signal-panel"><span className="eyebrow">SEGNALE OPERATIVO</span><strong>74</strong><div className="signal-bar"><i /></div><small>Indicatore demo, non decisionale</small></div></div></section>;
}

function DomainHub({ openDetail }: { openDetail: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => demoRows.filter(row => row.id.toLowerCase().includes(query.toLowerCase()) || row.area.toLowerCase().includes(query.toLowerCase())), [query]);
  return <section><div className="section-heading"><div><span className="eyebrow">T03 / DOMAIN OVERVIEW</span><h2>Domain Hub</h2></div><div className="search-box"><Search size={16} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Cerca dati demo" aria-label="Cerca dati demo" /></div></div><div className="domain-layout"><aside className="domain-index"><span className="eyebrow">PERIMETRO</span><strong>03</strong><p>Entità demo in osservazione</p><div className="mini-bars"><i /><i /><i /></div></aside><div className="data-list">{filtered.map(row => <button key={row.id} onClick={() => openDetail(row.id)}><div><strong>{row.id}</strong><span>{row.area} · {row.owner}</span></div><span className="state-pill"><CircleDot size={12} />{row.status}</span><b>{row.signal}</b><ArrowRight size={17} /></button>)}</div></div></section>;
}

function EntityDetail() {
  return <section><div className="entity-header"><div className="entity-monogram">ED</div><div><DemoMark compact /><span className="eyebrow">T04 / ENTITY DETAIL</span><h2>ENTITY-DEMO-03</h2><p>Profilo sintetico · nessun dato anagrafico reale</p></div><Button variant="outline">Apri audit</Button></div><div className="entity-ledger"><div><span>STATO</span><strong>PRONTO PER REVIEW</strong></div><div><span>REFERENTE</span><strong>UTENTE-DEMO-C</strong></div><div><span>ULTIMO CHECK</span><strong>DATA-DEMO</strong></div><div><span>PROVENIENZA</span><strong>DEMO_NOT_RUNTIME</strong></div></div><div className="entity-note"><ShieldCheck size={20}/><div><strong>Perimetro controllato</strong><p>Il record dimostra gerarchia, leggibilità e tracciabilità senza rappresentare una persona o organizzazione reale.</p></div></div></section>;
}

function CommunicationHub() {
  const items = ["BOZZA-DEMO / convocazione", "BOZZA-DEMO / aggiornamento", "BOZZA-DEMO / comunicato"];
  return <section><div className="section-heading"><div><span className="eyebrow">T06 / APPROVAL FLOW</span><h2>Communication Hub</h2></div><Button><Check size={16}/> Review simulata</Button></div><div className="comm-layout"><div className="comm-queue">{items.map((item, index) => <button key={item}><span>0{index + 1}</span><div><strong>{item}</strong><small>{index === 0 ? "PRIORITÀ DEMO" : "IN ATTESA"}</small></div><ArrowRight size={17}/></button>)}</div><div className="comm-preview"><DemoMark/><span className="eyebrow">ANTEPRIMA EDITORIALE</span><h3>Testo non approvato</h3><div className="copy-lines"><i/><i/><i/></div><div className="approval-line"><span>Direzione</span><b>PENDING_VISUAL_APPROVAL</b></div></div></div></section>;
}

function DataFinance() {
  return <section><div className="section-heading"><div><span className="eyebrow">T07 / READ ONLY</span><h2>Data & Finance</h2></div><span className="lock-label"><ShieldCheck size={15}/> Dati sintetici</span></div><div className="finance-band"><div><span>VALORE DEMO</span><strong>€ —</strong><small>UNVERIFIED</small></div><div><span>COPERTURA DEMO</span><strong>—%</strong><small>DEMO_NOT_RUNTIME</small></div><div><span>SCOSTAMENTO</span><strong>—</strong><small>NESSUNA FONTE COLLEGATA</small></div></div><div className="chart-area"><div className="chart-y"><span>100</span><span>50</span><span>0</span></div><div className="chart-bars">{[42,58,48,72,64,83,69].map((height,index)=><i key={index} style={{height:`${height}%`}}><span>D{index+1}</span></i>)}</div><div className="chart-watermark">DEMO_NOT_RUNTIME</div></div></section>;
}

function ProjectDevelopment() {
  const stages = ["Brief", "Verifica", "Proposta", "Review", "Decisione"];
  return <section><div className="section-heading"><div><span className="eyebrow">T08 / PROJECT FLOW</span><h2>Project Development</h2></div><Button variant="outline"><ChevronDown size={16}/> Vista roadmap</Button></div><div className="project-track">{stages.map((stage,index)=><div key={stage} className={index < 2 ? "done" : index === 2 ? "current" : ""}><span>{index < 2 ? <Check size={15}/> : index+1}</span><strong>{stage}</strong><small>{index === 2 ? "PENDING_VISUAL_APPROVAL" : index < 2 ? "DEMO COMPLETATA" : "NON AVVIATO"}</small></div>)}</div><div className="project-bottom"><div><AlertTriangle size={19}/><p><strong>Dipendenza demo</strong><br/>Input esterno non collegato alla preview.</p></div><div><Clock3 size={19}/><p><strong>Prossimo controllo</strong><br/>DATA-DEMO · ORA-DEMO</p></div></div></section>;
}

function TemplateContent({ active, openDetail }: { active: TemplateId; openDetail: (id: string) => void }) {
  if (active === "T01") return <EditorialTemplate />;
  if (active === "T02") return <OperationalHome />;
  if (active === "T03") return <DomainHub openDetail={openDetail} />;
  if (active === "T04") return <EntityDetail />;
  if (active === "T05") return <SpatialWorkspace />;
  if (active === "T06") return <CommunicationHub />;
  if (active === "T07") return <DataFinance />;
  return <ProjectDevelopment />;
}

export function VisualFoundation() {
  const [active, setActive] = useState<TemplateId>("T02");
  const [menuOpen, setMenuOpen] = useState(false);
  const [drawer, setDrawer] = useState<string | null>(null);
  const current = templates.find(item => item.id === active) ?? templates[0]!;
  const selectTemplate = (id: TemplateId) => { setActive(id); setMenuOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); };
  return (
    <div className="app-shell">
      <aside className={cn("sidebar", menuOpen && "sidebar-open")}>
        <div className="brand-lockup"><img src={logoScd.url} alt="S.C.D. ColicoDerviese"/><div><strong>GESTIONALE</strong><span>Visual staging</span></div><Button variant="nav" size="icon" className="sidebar-close" onClick={() => setMenuOpen(false)} aria-label="Chiudi menu"><X size={19}/></Button></div>
        <nav aria-label="Macro-template Visual Foundation">{templates.map(item => { const Icon = item.icon; return <button key={item.id} className={active === item.id ? "active" : ""} onClick={() => selectTemplate(item.id)}><Icon size={18}/><span><b>{item.id}</b>{item.label}</span></button>; })}</nav>
        <div className="sidebar-status"><span className="status-dot"/>STAGING · READ ONLY<small>Source of Truth non collegata</small></div>
      </aside>
      {menuOpen && <button className="backdrop" onClick={() => setMenuOpen(false)} aria-label="Chiudi menu"/>}
      <main className="main-stage">
        <header className="topbar"><Button variant="outline" size="icon" className="menu-trigger" onClick={() => setMenuOpen(true)} aria-label="Apri menu"><Menu size={20}/></Button><div className="route-title"><span>{current.id}</span><div><strong>{current.code}</strong><small>Laboratorio approvativo</small></div></div><div className="top-actions"><DemoMark compact/><Button variant="outline" size="icon" aria-label="Notifiche demo"><Bell size={18}/></Button><button className="avatar" aria-label="Profilo demo">GD</button></div></header>
        <div className="staging-ribbon"><ShieldCheck size={15}/><strong>STAGING VISIVO</strong><span>Nessun database · Nessuna autenticazione · Nessuna scrittura reale</span></div>
        <div className="content-frame">
          <div className="page-intro"><div><span className="eyebrow">VISUAL FOUNDATION / {current.id}</span><h1>{current.label}</h1><p>{current.note}</p></div><Affiliations/></div>
          <TemplateContent active={active} openDetail={setDrawer}/>
          <footer><span>SCD COMMAND CENTER / GESTIONALE</span><DemoMark compact/><span>PENDING_VISUAL_APPROVAL dove indicato</span></footer>
        </div>
      </main>
      <nav className="bottom-nav" aria-label="Navigazione mobile">{templates.slice(0,4).map(item=>{const Icon=item.icon;return <button key={item.id} className={active===item.id?"active":""} onClick={()=>selectTemplate(item.id)}><Icon size={20}/><span>{item.id}</span></button>})}<button onClick={()=>setMenuOpen(true)}><Menu size={20}/><span>Menu</span></button></nav>
      {drawer && <><button className="drawer-backdrop" onClick={()=>setDrawer(null)} aria-label="Chiudi dettaglio"/><aside className="detail-drawer" aria-label="Dettaglio demo"><div className="drawer-head"><div><DemoMark compact/><h2>{drawer}</h2></div><Button variant="outline" size="icon" onClick={()=>setDrawer(null)} aria-label="Chiudi dettaglio"><X size={18}/></Button></div><div className="drawer-state"><CircleDot size={15}/> PRONTO PER REVIEW</div><dl><div><dt>Tipo</dt><dd>Entità sintetica</dd></div><div><dt>Responsabile</dt><dd>UTENTE-DEMO-C</dd></div><div><dt>Fonte</dt><dd>DEMO_NOT_RUNTIME</dd></div><div><dt>Scrittura</dt><dd>Disabilitata</dd></div></dl><div className="drawer-warning"><AlertTriangle size={18}/><p>Questa vista non rappresenta dati, persone o organizzazioni reali.</p></div><Button variant="outline" className="w-full" onClick={()=>setDrawer(null)}>Chiudi anteprima</Button></aside></>}
    </div>
  );
}