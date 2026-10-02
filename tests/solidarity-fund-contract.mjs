import fs from 'node:fs';

function fail(message){console.error('Solidarity Fund contract FAIL:',message);process.exit(1)}
function assert(condition,message){if(!condition)fail(message)}

const html=fs.readFileSync(new URL('../sponsor/index.html',import.meta.url),'utf8');
const js=fs.readFileSync(new URL('../sponsor/sponsor.js',import.meta.url),'utf8');
const server=fs.readFileSync(new URL('../server.js',import.meta.url),'utf8');
const manifest=JSON.parse(fs.readFileSync(new URL('../SCD_SYSTEM_MANIFEST.json',import.meta.url),'utf8'));

for(const token of [
  'id="fondo-solidale"',
  'id="solidarityDonationForm"',
  'data-donation-amount="10"',
  'data-donation-amount="25"',
  'data-donation-amount="50"',
  'data-donation-amount="100"',
  'name="amount"',
  'name="donorType"',
  'name="preference"',
  'name="anonymous"',
  'name="privacy"',
  'Nessun pagamento viene effettuato in questa pagina',
  'non attribuisce automaticamente qualità di socio, tesserato o sponsor'
]) assert(html.includes(token),'public support surface missing: '+token);

assert(!/name=["'](?:card|cardNumber|cvv|cvc|pan)["']/i.test(html),'card/payment credentials must not be collected in public support form');
assert(js.includes("api('/api/sponsor/solidarity-intent'"),'public support form endpoint missing');
assert(js.includes("data.anonymous=new FormData(form).get('anonymous')==='on'"),'anonymous default handling missing');
assert(server.includes("u.pathname==='/api/sponsor/solidarity-intent'"),'Solidarity endpoint route missing');
assert(server.includes("callAppsScript('public.ticketSubmit'"),'Solidarity endpoint must use public intake');
assert(server.includes("amount<5||amount>5000"),'Solidarity amount server validation missing');
assert(server.includes("paymentStatus:'NON_EFFETTUATO'"),'support intent must never claim payment');

const fund=manifest.product_direction?.solidarity_fund;
assert(fund?.payment_processing==='OUTSIDE_CURRENT_APP','payment boundary mismatch');
assert(fund?.card_data_collection===false,'card data collection guard missing');
assert(fund?.donor_publication_default===false,'donor publication default must remain private');
assert(fund?.publication_requires_separate_consent===true,'separate publication consent guard missing');
assert(fund?.membership_effect==='NONE','support must not create membership');
assert(fund?.role_effect==='NONE','support must not grant roles');
assert((manifest.capability_map||[]).some(x=>x.id==='CAP-SOLIDARITY-FUND'),'CAP-SOLIDARITY-FUND missing');

console.log('Solidarity Fund contract PASS');
