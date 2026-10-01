import fs from 'node:fs';

function fail(m){console.error('Sponsor vision contract FAIL:',m);process.exit(1)}
function assert(c,m){if(!c)fail(m)}

const pub=fs.readFileSync(new URL('../sponsor/index.html',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../sponsor/app.html',import.meta.url),'utf8');
const js=fs.readFileSync(new URL('../sponsor/app.js',import.meta.url),'utf8');

for(const token of [
  'LEDWall SCD',
  'Divise sublimatiche',
  'Striscioni & cartellonistica',
  'Gazebo & Partner Corner',
  'Strutture brandizzate',
  'Tornei brandizzati',
  'Mascotte Partner',
  'Pixellot & Match Content',
  'Merchandising SCD',
  'Carta Tifoso',
  'Carta Tesserato',
  'Web App Partner Hub'
]) assert(pub.includes(token),'public sponsor concept missing: '+token);

for(const token of [
  'Catalogo sponsorizzazioni',
  'Card, merchandising & convenzioni',
  'LED, Video & Pixellot',
  'Pubblico → Community → Partner → Area riservata'
]) assert(app.includes(token),'reserved-area concept missing: '+token);

assert(pub.includes('PRONTA PER FORMALIZZAZIONE'),'convention formalization status missing');
assert(pub.includes('IN ATTIVAZIONE'),'convention activation status missing');

for(const token of [
  'GGlass',
  'TA Cleaning',
  'AGC Medical',
  'Preview video: 1920×1080 · 25 fps · 20 sec',
  'Non un cartellone. Un palinsesto.',
  'SCD Supporter Card',
  'SCD Tesserato Card',
  'La passione che ti porta più vicino.',
  'Dentro la squadra. Dentro i vantaggi.',
  'Più vicini al club. Più valore sul territorio.'
]) assert(pub.includes(token),'R47 commercial experience missing: '+token);

assert(pub.includes('I loghi ufficiali saranno mostrati solo dopo caricamento'),'official logo governance missing');
assert(js.includes("SOSPESA · NON INVIARE"),'suspended prospect visibility missing');
assert(js.includes("Pixellot & Match Content"),'internal video asset missing');
assert(js.includes("Partner Hub Web App"),'internal web app partner asset missing');

console.log('Sponsor vision contract PASS');
