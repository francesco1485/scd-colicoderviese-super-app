const direct='https://script.google.com/macros/s/AKfycbwYQ_3yLYsp-6jX3FIgufBjpmaZb9uO1AklF9hdG-CuLII9J4ITUX1EA-EKuWXBMEc/exec';
const proxy='https://scd-colicoderviese-official-r21.onrender.com/api/scd';

async function probe(label,url,action,payload={}){
  const r=await fetch(url,{
    method:'POST',
    redirect:'follow',
    headers:{'content-type':'application/json','x-scd-client':'r29-direct-probe'},
    body:JSON.stringify({action,payload,sessionToken:''})
  });
  const text=await r.text();
  let json=null;try{json=JSON.parse(text)}catch{}
  const body=json&&typeof json==='object'?json:null;
  const safe={
    label,action,
    finalHost:new URL(r.url).host,
    httpStatus:r.status,
    ok:r.ok,
    parsed:Boolean(body),
    apiOk:body?.ok??null,
    version:body?.version??body?.data?.version??null,
    error:body?.error??null,
    dataType:Array.isArray(body?.data)?'array':typeof body?.data,
    dataKeys:body?.data&&typeof body.data==='object'&&!Array.isArray(body.data)?Object.keys(body.data).slice(0,20):[]
  };
  console.log('R20_PROBE '+JSON.stringify(safe));
  return {safe,body};
}

const directFeed=await probe('DIRECT_APPS_SCRIPT',direct,'public.feed',{limit:1});
const proxyFeed=await probe('RENDER_PROXY',proxy,'public.feed',{limit:1});
const directContract=await probe('DIRECT_APPS_SCRIPT',direct,'public.datafabric.contract',{});
const proxyContract=await probe('RENDER_PROXY',proxy,'public.datafabric.contract',{});

const d=proxyContract.body?.data||{};
const contractOk=
  proxyContract.safe.httpStatus===200 &&
  proxyContract.body?.ok===true &&
  d.release==='R29' &&
  d.contractVersion==='1.0.0';

console.log('R20_PROBE_SUMMARY '+JSON.stringify({
  directFeed:directFeed.safe,
  proxyFeed:proxyFeed.safe,
  directContract:directContract.safe,
  proxyContract:proxyContract.safe,
  contractOk
}));

if(!contractOk)process.exit(2);
