import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const source=path.join(root,'docs/visual-lab');
const outDir=path.join(root,'test-output/scd-ecosistema');
fs.mkdirSync(outDir,{recursive:true});
const load=name=>fs.readFileSync(path.join(source,name),'utf8');
let html=load('scd-ecosistema.html');
const css=load('scd-ecosistema.css');
const js=load('scd-ecosistema.js');
const assets=['logo-scd.png','sky.webp','hero-colico.webp'];
const types={'.png':'image/png','.webp':'image/webp'};
for(const basename of assets){
  const asset=path.join(root,'assets',basename);
  if(!fs.existsSync(asset))throw new Error('LOCKED_OR_OFFICIAL_ASSET_UNAVAILABLE:'+basename);
  const mime=types[path.extname(basename)];
  const payload='data:'+mime+';base64,'+fs.readFileSync(asset).toString('base64');
  html=html.replaceAll('../../assets/'+basename,payload);
  // In CSS, original territorial image is referenced from the Visual Lab path.
  // This replacement happens on the stylesheet after it is inlined, below.
}
const hero=path.join(root,'assets','hero-colico.webp');
const heroData='data:image/webp;base64,'+fs.readFileSync(hero).toString('base64');
const inlineCss=css.replaceAll('../../assets/hero-colico.webp',heroData);
if(!html.includes('<link rel="stylesheet" href="./scd-ecosistema.css">'))throw new Error('CSS_LINK_MISMATCH');
if(!html.includes('<script src="./scd-ecosistema.js"></script>'))throw new Error('SCRIPT_LINK_MISMATCH');
html=html.replace('<link rel="stylesheet" href="./scd-ecosistema.css">','<style data-scd-visual-lab>'+inlineCss+'</style>');
html=html.replace('<script src="./scd-ecosistema.js"></script>','<script>'+js.replaceAll('</script','<\\/script')+'</script>');
if(html.includes('../../assets/')||html.includes('src="./scd-ecosistema.js"'))throw new Error('STANDALONE_ASSET_NOT_INLINED');
const output=path.join(outDir,'scd-ecosistema-interattivo.html');
fs.writeFileSync(output,html,'utf8');
console.log('SCD_ECOSYSTEM_OFFLINE_PREVIEW_BUILT',JSON.stringify({output,bytes:Buffer.byteLength(html),officialAssets:assets}));
