import fs from 'node:fs';

function ok(condition,message){if(!condition)throw new Error(message)}
const html=fs.readFileSync('sponsor/app.html','utf8');
const js=fs.readFileSync('sponsor/app.js','utf8');
const engine=fs.readFileSync('sponsor/grow-pipeline.js','utf8');
const css=fs.readFileSync('sponsor/grow-pipeline.css','utf8');

ok(html.includes('id="growPipeline"'),'GROW pipeline mount missing');
ok(html.includes('./grow-pipeline.js?v=1.0.0'),'GROW pipeline engine not loaded');
ok(html.includes('./grow-pipeline.css?v=1.0.0'),'GROW pipeline stylesheet not loaded');
ok(js.includes('renderGrowPipeline()'),'GROW pipeline renderer not wired');
ok(js.includes('function crmOpportunityCard('),'canonical CRM evidence renderer missing');
ok(js.includes('function crmTaskCard('),'canonical CRM task evidence renderer missing');
ok(js.includes('function renderCrmTouchpoint('),'CRM provenance timeline renderer missing');
ok(js.includes('function renderActivationProofs('),'activation proof renderer missing');
ok(js.includes('possibleDuplicateProspects'),'duplicate prospect diagnostics not surfaced');
ok(js.includes('Nessuna probabilità, valore o scadenza viene dedotta.'),'evidence no-inference disclosure missing');
ok(js.includes("$$('[data-grow-crm-id]').forEach"),'GROW pipeline CRM actions must use multi-selector');
ok(!js.split("\n").some(line=>line.trimStart().startsWith("$('[data-grow-crm-id]').forEach")),'GROW pipeline must not call forEach on a single-element selector');
ok(js.includes("crmState.sourceState='VERIFIED'"),'verified CRM source state missing');
ok(js.includes("crmState.sourceState='UNAVAILABLE'"),'fail-closed CRM source state missing');
ok(engine.includes("PROSPECT")&&engine.includes("PROPOSE")&&engine.includes("ACTIVATE"),'relationship stage classifier incomplete');
ok(engine.includes('NO_CONTACT'),'contact blocking policy missing');
ok(engine.includes('function diagnose('),'canonical CRM duplicate diagnostics missing');
ok(engine.includes('function activationProofs('),'activation proof extraction missing');
ok(engine.includes('function safeEvidenceUrl('),'safe evidence URL guard missing');
ok(css.includes('@media(max-width:700px)'),'mobile GROW composition missing');
ok(css.includes('GROW-02 · canonical CRM evidence'),'GROW-02 evidence styling missing');
ok(css.includes('GROW-02 · proof provenance'),'proof provenance styling missing');
ok(css.includes('prefers-reduced-motion:reduce'),'reduced-motion support missing');

await import('../sponsor/grow-pipeline.js');
await import('../tests/scd-grow-pipeline-contract.mjs');

console.log('SCD GROW CONTRACT PASS');
