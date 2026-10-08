import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const manifest=JSON.parse(fs.readFileSync(new URL('../SCD_SYSTEM_MANIFEST.json',import.meta.url),'utf8'));
const bridge=fs.readFileSync(new URL('../backend_patch_R21_6_http_api.gs',import.meta.url),'utf8');
const sources=new Map(manifest.source_registry.sources.map(row=>[row.id,row.resource_id]));
const core=sources.get('CORE_SHEET');
const ops=sources.get('SCD_OPERATIVO_PILOTA');

const coreTabs=new Set(['APP PUBLIC REQUESTS','APP AUDIT','APP COMMERCIAL CRM']);
const opsTabs=new Set(['UTENTI','UTENTI_AREE','STAKEHOLDERS_MASTER','TOUCHPOINTS_MASTER','TASKS_MASTER','COMMERCIALE_OPPORTUNITA','SPONSOR_CONTRATTI','INIZIATIVE_COMMERCIALI','FORNITORI_SPONSOR_RADAR','EMAIL_TEMPLATE','FIRME_RUOLI','MAIL_ARCHIVIO','DATA_LINEAGE','SOCIETA_PROFILE']);
function runBridge(){
  const reads=[],writes=[];
  const tab=(id,name)=>{
    const allowed=id===core?coreTabs:id===ops?opsTabs:new Set();
    if(!allowed.has(name))throw new Error('WRONG_WORKBOOK '+name+' in '+id);
    return {
      marker:id,name,
      getLastColumn(){return 4},
      getRange(){return {getDisplayValues(){return [['OPPORTUNITY_ID','STAGE','CORRELATION_ID','ACTION']]}}},
      appendRow(values){writes.push({id,name,values})}
    };
  };
  const sandbox={
    SCD:{CORE_ID:core},
    sheet_:(id,name)=>{reads.push({id,name});return tab(id,name)},
    table_:sheet=>({rows:[{marker:sheet.marker,name:sheet.name}]}),
    SpreadsheetApp:{openById:id=>({getSheetByName:name=>tab(id,name)})},
    console
  };
  vm.createContext(sandbox);
  vm.runInContext(bridge,sandbox,{filename:'backend_patch_R21_6_http_api.gs'});
  return {sandbox,reads,writes};
}

test('R20 reads canonical stakeholders, tasks, opportunities and users from Operativo Pilota',()=>{
  assert.ok(core&&ops&&core!==ops,'distinct canonical IDs must exist');
  const {sandbox}=runBridge();
  for(const tab of ['STAKEHOLDERS_MASTER','TASKS_MASTER','COMMERCIALE_OPPORTUNITA','UTENTI']){
    const result=sandbox.r216CrmTable_(tab);
    assert.equal(result[0].marker,ops,tab+' must be read from Operativo Pilota');
  }
});

test('R20 keeps public requests and access audit on canonical Core rather than duplicate tab',()=>{
  const {sandbox}=runBridge();
  assert.equal(sandbox.r216CrmTable_('APP PUBLIC REQUESTS')[0].marker,core);
  assert.equal(sandbox.r216CrmTable_('APP AUDIT')[0].marker,core);
});

test('R20 writes proposals and mail lineage only to verified Operativo Pilota tabs',()=>{
  const {sandbox,writes}=runBridge();
  sandbox.r216AppendByHeader_('COMMERCIALE_OPPORTUNITA',{STAGE:'DA SVILUPPARE',CORRELATION_ID:'FLOW-QA'});
  sandbox.r216AppendByHeader_('MAIL_ARCHIVIO',{CORRELATION_ID:'MAIL-QA'});
  assert.equal(writes.length,2);
  assert.deepEqual(writes.map(x=>x.id),[ops,ops]);
  assert.equal(writes[0].values[1],'DA SVILUPPARE');
});

test('R20 keeps authentication audit writes on Core and rejects missing tables',()=>{
  const {sandbox,writes}=runBridge();
  sandbox.r216AppendByHeader_('APP AUDIT',{ACTION:'ACCESS_PRIVATE_DESK_OPEN'});
  assert.equal(writes[0].id,core);
  assert.equal(writes[0].values[3],'ACCESS_PRIVATE_DESK_OPEN');
  assert.throws(()=>sandbox.r216CrmTable_('UNMAPPED_UNKNOWN_TABLE'),/WRONG_WORKBOOK/);
});
