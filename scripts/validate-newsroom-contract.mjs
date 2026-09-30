import fs from 'node:fs';

function fail(message){console.error('SCD NEWSROOM CONTRACT FAIL:',message);process.exitCode=1}
function assert(condition,message){if(!condition)fail(message)}
function readJson(path){try{return JSON.parse(fs.readFileSync(path,'utf8'))}catch(e){fail('invalid json '+path);return {}}}

const newsroom=readJson('content/weekly-news.json');
const server=fs.readFileSync('server.js','utf8');
const app=fs.readFileSync('app.js','utf8');
const router=fs.readFileSync('app-r24-router.js','utf8');

assert(newsroom.schema_version==='1.0.0','weekly newsroom schema version mismatch');
assert(['DRAFT','PUBLISHED'].includes(newsroom.status),'weekly newsroom status invalid');
assert(newsroom.policy==='VERIFIED_STRUCTURED_FACTS_ONLY','weekly newsroom policy mismatch');
assert(Array.isArray(newsroom.sources),'weekly newsroom sources must be array');
assert(Array.isArray(newsroom.cards),'weekly newsroom cards must be array');

if(newsroom.status==='PUBLISHED'){
  assert(/^\d{4}-\d{2}-\d{2}$/.test(newsroom.weekStart),'published newsroom weekStart required');
  assert(Boolean(newsroom.generatedAt),'published newsroom generatedAt required');
  assert(newsroom.sources.length>0,'published newsroom needs evidence sources');
  assert(newsroom.cards.length>0,'published newsroom needs cards');
  for(const card of newsroom.cards){
    assert(Boolean(card.id&&card.title&&card.body),'published newsroom card fields missing');
    assert(Array.isArray(card.evidence)&&card.evidence.length>0,'published newsroom card needs evidence');
  }
}

for(const token of ['buildWeeklyNewsroom','readWeeklyEditorial','DISABLED_FOR_NEWS','VERIFIED_STRUCTURED_FACTS_ONLY']){
  assert(server.includes(token),'server newsroom token missing '+token);
}
assert(app.includes('NEWSROOM_API'),'client newsroom API missing');
assert(app.includes('loadWeeklyNewsroom'),'client newsroom loader missing');
assert(router.includes('SETTIMANA SCD · TUTTE LE ANNATE'),'all-annate weekly calendar missing');
assert(router.includes('SCD NEWSROOM AI · SETTIMANALE'),'weekly AI newsroom UI missing');
assert(!/p\.highlights\|\|\[\]\)\.slice\(0,7\)/.test(router),'Pulse must not render old highlights as news');
assert(!/fetchOfficialPosts\(\)|fetchGoogleNews\(\)/.test(server),'legacy stale-site fetchers must not remain active');

if(process.exitCode)process.exit(process.exitCode);
console.log('SCD NEWSROOM CONTRACT PASS',{
  status:newsroom.status,
  policy:newsroom.policy,
  weekStart:newsroom.weekStart
});