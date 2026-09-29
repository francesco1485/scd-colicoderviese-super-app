const url='https://script.google.com/macros/s/AKfycbwYQ_3yLYsp-6jX3FIgufBjpmaZb9uO1AklF9hdG-CuLII9J4ITUX1EA-EKuWXBMEc/exec';
const r=await fetch(url,{
  method:'POST',
  redirect:'follow',
  headers:{'content-type':'application/json'},
  body:JSON.stringify({action:'public.datafabric.contract',payload:{},sessionToken:''})
});
const text=await r.text();
let json=null;try{json=JSON.parse(text)}catch{}
const safe={
  httpStatus:r.status,
  ok:r.ok,
  body:json&&typeof json==='object'?json:{parseError:true,preview:text.slice(0,300)}
};
console.log('R20_DIRECT_PROBE '+JSON.stringify(safe));
if(!r.ok)process.exit(2);
