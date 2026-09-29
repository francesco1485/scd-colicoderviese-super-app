import fs from 'node:fs';

const targets=[
  'https://scd-colicoderviese-official-r21.onrender.com',
  'https://scd-colicoderviese-super-app.onrender.com',
  'https://scd-colicoderviese-command-r22.onrender.com'
];

fs.mkdirSync('test-output',{recursive:true});
const out={checkedAt:new Date().toISOString(),targets:[]};

async function get(url,options={}){
  const ctrl=new AbortController();
  const t=setTimeout(()=>ctrl.abort(),20000);
  try{
    const r=await fetch(url,{redirect:'follow',cache:'no-store',signal:ctrl.signal,...options});
    const text=await r.text();
    let json=null;try{json=JSON.parse(text)}catch{}
    return {status:r.status,ok:r.ok,json,text:text.slice(0,500)};
  }catch(e){
    return {status:0,ok:false,error:String(e.message||e)};
  }finally{clearTimeout(t)}
}

for(const base of targets){
  const item={base};
  item.health=await get(base+'/health?discovery='+Date.now());
  item.capabilities=await get(base+'/api/capabilities?discovery='+Date.now());
  item.contract=await get(base+'/api/scd',{
    method:'POST',
    headers:{'content-type':'application/json','x-scd-client':'runtime-discovery'},
    body:JSON.stringify({action:'public.datafabric.contract',payload:{},sessionToken:''})
  });
  const h=item.health.json||{};
  const c=item.capabilities.json||{};
  const d=(item.contract.json||{}).data||{};
  item.summary={
    healthVersion:h.version||null,
    service:h.service||null,
    capabilitiesVersion:c.version||null,
    dataFabricFlag:c.featureFlags?.dataFabricObservability??null,
    contractAction:Array.isArray(c.actions)?c.actions.includes('public.datafabric.contract'):false,
    contractRelease:d.release||null,
    contractError:(item.contract.json||{}).error||null
  };
  out.targets.push(item);
  console.log('SCD RUNTIME TARGET',item.summary,base);
}
fs.writeFileSync('test-output/render-discovery.json',JSON.stringify(out,null,2)+'\n');
console.log('SCD RUNTIME DISCOVERY COMPLETE');
