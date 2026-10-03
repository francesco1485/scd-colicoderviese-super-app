import fs from 'node:fs';

const file='config/ai-portfolio.v1.json';
const fail=m=>{console.error('AI PORTFOLIO CONTRACT FAIL: '+m);process.exitCode=1};
const ok=(cond,m)=>{if(!cond)fail(m)};

const p=JSON.parse(fs.readFileSync(file,'utf8'));
ok(p.id==='SCD_MAGLIA_AI_PORTFOLIO','portfolio id mismatch');
ok(p.schemaVersion==='2.0.0','portfolio schema version mismatch');
ok(p.totalApps===4,'portfolio must contain exactly 4 canonical apps');
ok(Array.isArray(p.apps)&&p.apps.length===4,'apps[] must contain exactly 4 entries');

const ids=p.apps.map(x=>x.id);
const expected=['SCD_ONE','SCD_CORE','SCD_GROW','CEPA_360'];
ok(new Set(ids).size===4,'app ids must be unique');
for(const id of expected)ok(ids.includes(id),'missing canonical app '+id);

const scd=p.apps.filter(x=>x.owner==='SCD_COLICODERVIESE');
const maglia=p.apps.filter(x=>x.owner==='MAGLIA_ASSICURAZIONI');
ok(scd.length===3,'portfolio must contain exactly 3 SCD apps');
ok(maglia.length===1,'portfolio must contain exactly 1 Maglia app');
ok(p.universalDeveloperCommand==='WEBAPP:MASTER','universal developer command mismatch');

for(const app of p.apps){
  ok(Array.isArray(app.commands)&&app.commands.includes('WEBAPP:MASTER'),app.id+' missing WEBAPP:MASTER');
  ok(typeof app.aiBranch==='string'&&app.aiBranch.startsWith('ai-'),app.id+' missing canonical ai branch');
}

const core=p.apps.find(x=>x.id==='SCD_CORE');
for(const name of ['SECRETARIAT','FACILITY_WEEK','SMART_FACILITY','WAREHOUSE','KIT','LAUNDRY'])ok(core.modules.includes(name),'SCD_CORE missing '+name);

const grow=p.apps.find(x=>x.id==='SCD_GROW');
for(const name of ['CRM','LEAD_RADAR','COMMERCIAL_PIPELINE','PROOF','RENEWALS'])ok(grow.modules.includes(name),'SCD_GROW missing '+name);
ok((grow.absorbedWorkstreams||[]).includes('ai-scd-commercial-lia'),'SCD_GROW must absorb Commercial/Lia');

const cepa=p.apps.find(x=>x.id==='CEPA_360');
ok(cepa.canonicalSourceBranch==='cepa-maglia-os-hosting','CEPA_360 canonical source mismatch');
for(const name of ['CEPA_PUBLIC','MAGLIA360_CONTROL_ROOM','CRM','HISTORY_INTELLIGENCE'])ok(cepa.modules.includes(name),'CEPA_360 missing '+name);

const command=(p.sharedTechnicalEngines||[]).find(x=>x.id==='SCD_COMMAND_R22');
ok(Boolean(command),'SCD_COMMAND_R22 shared engine missing');
ok(!ids.includes('SCD_COMMAND_R22'),'SCD_COMMAND_R22 must not be counted as one of the four apps');

console.log('AI PORTFOLIO CONTRACT OK',{
  total:p.apps.length,
  scd:scd.length,
  maglia:maglia.length,
  apps:p.apps.map(x=>x.displayName),
  sharedEngine:command?.id
});
