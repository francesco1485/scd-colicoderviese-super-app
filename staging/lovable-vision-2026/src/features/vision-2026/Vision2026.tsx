import { SCDFidelitySix } from './SCDFidelitySix';
/**
 * Riferimento grafico utente: tavola madre “Sistema grafico definitivo / struttura app in tempo reale”,
 * descritta nel mandato UI SCD 2026/27 del 9 ottobre 2026; originali non caricati in Lovable.
 * Asset pubblici canonici (nessuna foto personale):
 * https://francesco1485.github.io/scd-colicoderviese-super-app/assets/logo-scd.png
 * https://francesco1485.github.io/scd-colicoderviese-super-app/assets/sky.png
 * Composizione di revisione PENDING_VISUAL_APPROVAL, non promossa al runtime.
 */
import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import * as Dialog from '@radix-ui/react-dialog';
import { ArrowLeft, ArrowRight, LockKeyhole, MessageCircle, X, Check, Unplug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import logo from '@/assets/logo-scd.png.asset.json';
import sky from '@/assets/sky.png.asset.json';
import { OfficialAsset } from './OfficialAsset';
import { ScreenPreview, TerritoryPlaceholder } from './ScreenPreview';
import { visionScreens, visionData, type VisionScreenId } from './screens';
import './vision.css';

function VisionGallery() {
  const [selected, setSelected] = useState<VisionScreenId>('home');
  const [assistant, setAssistant] = useState(false);
  const current = visionScreens.find(s => s.id === selected) ?? visionScreens[0];
  return <div className="vision-page">
    <header className="vision-header"><Link to="/" className="vision-back" aria-label="Torna alla Visual Foundation"><ArrowLeft size={18} /></Link><div className="vision-brand"><OfficialAsset src={logo.url} alt="Logo ufficiale SCD" /><div><strong>S.C.D. COLICODERVIESE</strong><span>LABORATORIO VISIVO · 2026/27</span></div></div><span className="vision-header-status"><LockKeyhole size={13} />NON PUBBLICATO</span></header>
    <main>
      <section className="vision-hero" aria-labelledby="vision-title">
        <TerritoryPlaceholder />
        <div className="vision-hero-content"><OfficialAsset src={logo.url} alt="Stemma SCD ufficiale" className="vision-hero-crest" /><div><span className="vision-kicker">UN CLUB. UN SISTEMA. UN'IDENTITÀ.</span><h1 id="vision-title">SCD <em>2026/27</em></h1><p>Il club, dentro ogni esperienza.</p><div className="vision-families"><span>SCD UNIVERSE</span><span>SCD GESTIONALE</span><span>SCD SPONSOR</span></div></div></div>
        <Button variant="nav" className="vision-sky" onClick={() => setAssistant(true)} aria-label="Apri assistente Sky"><OfficialAsset src={sky.url} alt="Sky, mascotte ufficiale SCD" /><span><MessageCircle size={15} />CIAO, SONO SKY<ArrowRight size={15} /></span></Button>
      </section>
      <div className="vision-review"><span><i />VISUAL_STAGING</span><strong>{visionData.status}</strong><span>DA REVISIONARE · {visionData.approval}</span></div>
      <Tabs value={selected} onValueChange={value => { if (visionScreens.some(s => s.id === value)) setSelected(value as VisionScreenId); }} className="vision-workspace">
        <div className="vision-workspace-heading"><div><span className="vision-kicker">SEI ACCESSI AL MONDO SCD</span><h2>Stessa identità. Spazi diversi.</h2></div><span className="vision-slice">01 / PRIMA SLICE</span></div>
        <TabsList className="vision-navigation" aria-label="Schermate SCD">{visionScreens.map(screen => <TabsTrigger key={screen.id} value={screen.id}><screen.icon size={18} /><span>{screen.short}</span></TabsTrigger>)}</TabsList>
        <div className="vision-panorama"><div className="vision-screen-grid">{visionScreens.map(screen => <TabsContent key={screen.id} value={screen.id} forceMount className="vision-screen-slot"><ScreenPreview screen={screen} selected={selected === screen.id} onSelect={() => setSelected(screen.id)} /></TabsContent>)}</div>
          <aside className="vision-context" aria-label="Contesto della schermata selezionata"><span className="vision-kicker">IN REVISIONE</span><div className="vision-context-index">0{visionScreens.findIndex(s => s.id === selected) + 1}<ArrowUpMark /></div><h2>{current.title}</h2><p>{current.subtitle}</p><dl><div><dt>Famiglia</dt><dd>{current.family}</dd></div><div><dt>Dati</dt><dd>NULL · NON COLLEGATI</dd></div><div><dt>Stato</dt><dd>DEMO_NOT_RUNTIME</dd></div></dl><div className="vision-context-note"><Unplug size={20} /><strong>Nessuna fonte privata</strong><p>Nessun accesso, salvataggio o dato operativo reale.</p></div><div className="vision-checklist"><span><Check size={14} />Logo e Sky ufficiali</span><span><LockKeyhole size={14} />Approvazione visuale in attesa</span><span><Unplug size={14} />Assistente non collegato</span></div><small>FOTO / MEDIA<br />IN ATTESA DI ASSET APPROVATI<br />SCD_INTAKE_LOG</small></aside>
        </div>
      </Tabs>
    </main>
    <footer className="vision-footer"><Link to="/"><ArrowLeft size={14} />Visual Foundation T01–T08</Link><span>GESTIONALE · LABORATORIO NON PUBBLICATO</span><span>NESSUNA SCRITTURA REALE</span></footer>
    <Dialog.Root open={assistant} onOpenChange={setAssistant}><Dialog.Portal><Dialog.Overlay className="vision-dialog-overlay" /><Dialog.Content className="vision-dialog"><OfficialAsset src={sky.url} alt="Sky ufficiale" /><span className="vision-demo">DEMO_NOT_RUNTIME</span><Dialog.Title>Assistente non collegato nella preview</Dialog.Title><Dialog.Description>Sky è presente solo come funzione demo. Nessuna conversazione viene inviata o salvata.</Dialog.Description><Dialog.Close asChild><Button variant="outline"><X size={17} />Chiudi</Button></Dialog.Close></Dialog.Content></Dialog.Portal></Dialog.Root>
  </div>;
}

function ArrowUpMark() { return <ArrowRight size={24} aria-hidden="true" />; }
/** Default route is the actual full-page SCD ONE staging UI. The original six-screen
 *  visual lab is explicitly preserved for side-by-side review, without data access. */
export function Vision2026() {
  const [galleryOpen, setGalleryOpen] = useState(false);
  if (galleryOpen) return <div><button type="button" onClick={() => setGalleryOpen(false)} style={{position:'sticky',top:0,zIndex:120,width:'100%',background:'#ffdf13',color:'#09264d',fontWeight:800,padding:14,minHeight:48}}>← Torna alla Home SCD ONE</button><VisionGallery /></div>;
  return <SCDFidelitySix onOpenGallery={() => setGalleryOpen(true)} />;
}
