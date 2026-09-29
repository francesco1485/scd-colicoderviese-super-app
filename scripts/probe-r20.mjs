const direct='https://script.google.com/macros/s/AKfycbwYQ_3yLYsp-6jX3FIgufBjpmaZb9uO1AklF9hdG-CuLII9J4ITUX1EA-EKuWXBMEc/exec';
const proxy='https://scd-colicoderviese-official-r21.onrender.com/api/scd';
const payload=JSON.stringify({action:'public.datafabric.contract',payload:{},sessionToken:''});

async function probe(label,url){
  const r=await fetch(url,{
    method:'POST',
    redirect:'follow',
    headers:{'content-type':'application/json','x-scd-client':'r29-direct-probe'},
    body:payload
  });
  const text=await r.text();
  let json=null;try{json=JSON.parse(text)}catch{}
  const safe={
    label,
    finalUrl:r.url,
    httpStatus:r.status,
    ok:r.ok,
    body:json&&typeof json==='object'?json:{parseError:true,preview:text.slice(0,300)}
  };
  console.log('R20_PROBE '+JSON.stringify(safe));
  return safe;
}

const directResult=await probe('DIRECT_APPS_SCRIPT',direct);
const proxyResult=await probe('RENDER_PROXY',proxy);

const d=proxyResult.body&&proxyResult.body.data||{};
const contractOk=
  proxyResult.httpStatus===200 &&
  proxyResult.body?.ok===true &&
  d.release==='R29' &&
  d.contractVersion==='1.0.0';

console.log('R20_PROBE_SUMMARY '+JSON.stringify({
  directHttp:directResult.httpStatus,
  proxyHttp:proxyResult.httpStatus,
  proxyContractOk:contractOk,
  proxyError:proxyResult.body?.error||null
}));

if(!contractOk)process.exit(2);
