import fs from 'node:fs';

const file='config/ai-portfolio.v1.json';
const fail=(m)=>{console.error('AI PORTFOLIO CONTRACT FAIL: '+m);process.exitCode=1};
const ok=(cond,m)=>{if(!cond)fail(m)};

const p=JSON.parse(fs.readFileSync(file,'utf8'));
ok(p.id==='SCD_MAGLIA_AI_PORTFOLIO','portfolio id mismatch');
ok(p.totalApps===4,'portfolio must contain exactly 4 apps');
ok(Array.isArray(p.apps)&&p.apps.length===4,'apps[] must contain exactly 4 entries');

const ids=p.apps.map(x=>x.id);
ok(new Set(ids).size===ids.length,'app ids must be unique');

const scd=p.apps.filter(x=>x.owner==='SCD_COLICODERVIESE');
const maglia=p.apps.filter(x=>x.owner==='MAGLIA_ASSICURAZIONI');
ok(scd.length===3,'portfolio must contain exactly 3 SCD apps');
ok(maglia.length===1,'portfolio must contain exactly 1 Maglia app');

for(const required of ['SCD_UNIVERSE','SCD_SPONSOR_PLATFORM','SCD_COMMAND_R22','MAGLIA_360_CEPA']){
  ok(ids.includes(required),'missing canonical app '+required);
}

const forbiddenStandalone=['SCD_COMMERCIAL_LIA','CEPA_MAGLIA_OS','MAGLIA360_OFFICE'];
for(const id of forbiddenStandalone) ok(!ids.includes(id),'superseded standalone app present: '+id);

const magliaApp=p.apps.find(x=>x.id==='MAGLIA_360_CEPA');
ok(magliaApp?.canonicalSourceBranch==='cepa-maglia-os-hosting','Maglia canonical source must be cepa-maglia-os-hosting');
ok(magliaApp?.aiBranch==='ai-maglia360-cepa-unified','Maglia unified AI branch mismatch');
ok((magliaApp?.includes||[]).includes('CEPA_PUBLIC'),'CEPA public layer missing from unified Maglia app');
ok((magliaApp?.includes||[]).includes('MAGLIA360_CONTROL_ROOM'),'Maglia360 private layer missing from unified Maglia app');

const sponsor=p.apps.find(x=>x.id==='SCD_SPONSOR_PLATFORM');
ok((sponsor?.includes||[]).includes('COMMERCIAL_PIPELINE'),'Sponsor commercial pipeline missing');
ok((sponsor?.absorbedWorkstreams||[]).includes('ai-scd-commercial-lia'),'Commercial/Lia split must remain absorbed');

const universe=p.apps.find(x=>x.id==='SCD_UNIVERSE');
for(const module of ['SEGRETERIA','FACILITY','TORNEI','PRIVATE_DESK']){
  ok((universe?.internalModules||[]).includes(module),'SCD Universe module missing: '+module);
}

console.log('AI PORTFOLIO CONTRACT OK',{
  total:p.apps.length,
  scd:scd.length,
  maglia:maglia.length,
  apps:ids
});
