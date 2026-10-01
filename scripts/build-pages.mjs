import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const out=path.join(root,'_site');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'SCD_SYSTEM_MANIFEST.json'),'utf8'));
const nextgen=manifest.architecture?.nextgen_preview?.visual_mode==='SYNTHETIC_NO_REAL_PHOTOGRAPHY';

const common=[
  'index.html','manifest.webmanifest','sw.js','delete-account.html',
  'content/weekly-news.json','robots.txt','sitemap.xml'
];
const legacy=[
  'styles.css','ui-r21-11.css','ui-r24-shell.css','ui-r26-pulse.css',
  'ui-r38-universe.css','ui-r39-human.css','ui-r40-weekly.css',
  'app.js','scd-meta-engine.js','scd-twin.js','scd-experience-engine.js','app-r24-router.js'
];
const nova=[
  'scd-ng.css','scd-synth.css','scd-ng.js','scd-interactions.js',
  'scd-meta-engine.js','scd-twin.js','scd-experience-engine.js'
];
const files=[...common,...(nextgen?nova:legacy)];

fs.rmSync(out,{recursive:true,force:true});
fs.mkdirSync(out,{recursive:true});
fs.mkdirSync(path.join(out,'assets'),{recursive:true});

for(const file of files){
  const src=path.join(root,file);
  if(!fs.existsSync(src)) throw new Error('Missing Pages runtime file: '+file);
  const dest=path.join(out,file);
  fs.mkdirSync(path.dirname(dest),{recursive:true});
  fs.copyFileSync(src,dest);
}
fs.cpSync(path.join(root,'assets'),path.join(out,'assets'),{recursive:true});
fs.writeFileSync(path.join(out,'.nojekyll'),'','utf8');

const html=fs.readFileSync(path.join(out,'index.html'),'utf8');
const htmlRequired=nextgen
  ?['scd-ng.css','scd-synth.css','scd-ng.js','scd-interactions.js','scd-meta-engine.js','scd-twin.js','scd-experience-engine.js','manifest.webmanifest']
  :['ui-r21-11.css','ui-r24-shell.css','ui-r26-pulse.css','ui-r38-universe.css','ui-r39-human.css','ui-r40-weekly.css','app.js','scd-meta-engine.js','scd-twin.js','scd-experience-engine.js','app-r24-router.js','manifest.webmanifest'];
for(const required of htmlRequired){
  if(!html.includes(required)) throw new Error('index.html does not reference '+required);
}

const sw=fs.readFileSync(path.join(out,'sw.js'),'utf8');
const swRequired=nextgen
  ?['scd-ng.css','scd-synth.css','scd-ng.js','scd-interactions.js','scd-meta-engine.js','scd-twin.js','scd-experience-engine.js']
  :['ui-r21-11.css','ui-r24-shell.css','ui-r26-pulse.css','ui-r38-universe.css','ui-r39-human.css','ui-r40-weekly.css','scd-meta-engine.js','scd-twin.js','scd-experience-engine.js','app-r24-router.js','delete-account.html'];
for(const required of swRequired){
  if(!sw.includes(required)) throw new Error('service worker does not cache '+required);
}

console.log('SCD Pages artifact built',{mode:nextgen?'NOVA':'LEGACY',files:files.length,assets:fs.readdirSync(path.join(out,'assets')).length});
