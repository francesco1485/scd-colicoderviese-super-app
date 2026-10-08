import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {extractAnchors,scanSourceHtml,mergeCandidates}=require('../lib/scd-dirigenza-radar.js');
const fail=m=>{console.error('DIRIGENZA RADAR FAIL:',m);process.exit(1)};
const assert=(c,m)=>{if(!c)fail(m)};
const sources=JSON.parse(fs.readFileSync(new URL('../config/scd-dirigenza-radar-sources.v1.json',import.meta.url),'utf8'));
const snapshot=JSON.parse(fs.readFileSync(new URL('../data/scd-dirigenza-radar.snapshot.json',import.meta.url),'utf8'));
const visualLab=fs.readFileSync(new URL('../docs/visual-lab/gestionale-foundation.html',import.meta.url),'utf8');
assert(sources.id==='SCD_DIRIGENZA_RADAR_SOURCES','source registry id');
assert(sources.rules?.noInvention===true,'no invention rule');
assert(sources.rules?.discoveredIsNotVerified===true,'discovered cannot be auto verified');
for(const id of ['REGIONE_LOMBARDIA_SPORT_BANDI','DIPARTIMENTO_SPORT_BANDI','SPORT_E_SALUTE_BANDI_ALTRI_ENTI','INVITALIA_INCENTIVI','EU_SPORT_FUNDING','VISIT_COLICO_EVENTS','COMUNE_DERVIO_EVENTS']){
  assert(sources.sources.some(x=>x.id===id),'missing source '+id);
}
assert(snapshot.verifiedItems?.some(x=>x.id==='OPP-EVENTI2026'),'verified seed opportunity missing');
assert(snapshot.verifiedItems?.some(x=>x.territory==='COLICO'),'verified Colico seed missing');
assert(snapshot.territoryStatus?.some(x=>x.territory==='DERVIO'),'Dervio monitoring status missing');
assert(snapshot.calendarReconciledAt,'calendar reconciliation timestamp missing');
assert(snapshot.verifiedItems?.filter(x=>x.category==='TERRITORY').every(x=>x.calendarReconciliation),'territory items must expose calendar reconciliation');
assert(snapshot.verifiedItems?.some(x=>x.calendarConflict==='SAME_DAY_LOCAL_OVERLAP_REVIEW'),'expected at least one coordination alert');
assert(visualLab.includes('data-scd-dirigenza-radar="true"'),'Direction radar visual staging missing');
assert(visualLab.includes('PENDING_VISUAL_APPROVAL'),'visual staging must stay pending human approval');
assert(visualLab.includes('BANDI &amp; OPPORTUNITÀ'),'opportunity radar visual staging missing');
assert(visualLab.includes('RADAR TERRITORIO · COLICO / DERVIO'),'territory radar visual staging missing');
assert(visualLab.includes('COORDINAMENTO ALTO')||visualLab.includes('STESSO GIORNO'),'calendar coordination signal missing after reconciliation');
assert(!visualLab.includes('CONFLITTO SCD NON VERIFICATO'),'stale unreconciled calendar label must not remain after verified reconciliation');
for(const item of snapshot.verifiedItems||[]){
  assert(item.sourceUrl?.startsWith('https://'),'verified item missing source URL '+item.id);
  assert(String(item.verification||'').startsWith('WEB_VERIFIED'),'verified item lacks verification state '+item.id);
}
const fixture='<html><body><a href="/bandi/123">Nuovo bando contributi ASD 2026</a><a href="/privacy">Privacy</a><a href="/bandi/123">Nuovo bando contributi ASD 2026</a></body></html>';
const src={id:'TEST',category:'OPPORTUNITIES',url:'https://example.org/',authority:'Test',trust:'PRIMARY_OFFICIAL',scanKeywords:['bando','contribut']};
const anchors=extractAnchors(fixture,src.url);
assert(anchors.length===3,'anchor extraction');
const scan=scanSourceHtml(src,fixture);
assert(scan.length===1,'scan must deduplicate and filter');
assert(scan[0].verification==='DISCOVERED_NEEDS_REVIEW','scan must fail closed');
const merged=mergeCandidates([],scan,'2026-10-08T10:00:00Z');
assert(merged[0].firstDetectedAt==='2026-10-08T10:00:00Z','first detected timestamp');
console.log('DIRIGENZA RADAR CONTRACT PASS',{sources:sources.sources.length,verifiedItems:snapshot.verifiedItems.length});
