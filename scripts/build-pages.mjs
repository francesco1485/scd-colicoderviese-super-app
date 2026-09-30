import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const out=path.join(root,'_site');
const files=[
  'index.html',
  'styles.css',
  'ui-r21-11.css',
  'ui-r24-shell.css',
  'ui-r26-pulse.css',
  'ui-r38-universe.css',
  'ui-r39-human.css',
  'ui-r40-weekly.css',
  'app.js',
  'scd-meta-engine.js',
  'scd-twin.js',
  'scd-experience-engine.js',
  'app-r24-router.js',
  'manifest.webmanifest',
  'sw.js',
  'delete-account.html',
  'content/weekly-news.json',
  'robots.txt',
  'sitemap.xml'
];

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
for(const required of ['ui-r21-11.css','ui-r24-shell.css','ui-r26-pulse.css','ui-r38-universe.css','ui-r39-human.css','ui-r40-weekly.css','app.js','scd-meta-engine.js','scd-twin.js','scd-experience-engine.js','app-r24-router.js','manifest.webmanifest']){
  if(!html.includes(required)) throw new Error('index.html does not reference '+required);
}
const sw=fs.readFileSync(path.join(out,'sw.js'),'utf8');
for(const required of ['ui-r21-11.css','ui-r24-shell.css','ui-r26-pulse.css','ui-r38-universe.css','ui-r39-human.css','ui-r40-weekly.css','scd-meta-engine.js','scd-twin.js','scd-experience-engine.js','app-r24-router.js','delete-account.html']){
  if(!sw.includes(required)) throw new Error('service worker does not cache '+required);
}

console.log('SCD Pages artifact built', {files:files.length, assets:fs.readdirSync(path.join(out,'assets')).length});
