const crypto=require('crypto');

function b64url(input){
  return Buffer.from(input).toString('base64url');
}
function decodeJson(part){
  return JSON.parse(Buffer.from(part,'base64url').toString('utf8'));
}
function sign(data,secret){
  return crypto.createHmac('sha256',secret).update(data).digest('base64url');
}
function safeEqual(a,b){
  const aa=Buffer.from(String(a||'')),bb=Buffer.from(String(b||''));
  return aa.length===bb.length&&crypto.timingSafeEqual(aa,bb);
}
function issueIntakeToken({slug,mode='TOKENIZED',expiresInSeconds=86400,secret,now=Math.floor(Date.now()/1000),nonce}){
  if(!secret||secret.length<24)throw new Error('INTAKE_LINK_SECRET_NOT_CONFIGURED');
  if(!/^[a-z0-9-]{2,80}$/.test(String(slug||'')))throw new Error('INVALID_SLUG');
  const ttl=Math.max(300,Math.min(Number(expiresInSeconds)||86400,30*86400));
  const payload={
    aud:'SCD_INTAKE',
    slug:String(slug),
    mode:String(mode),
    iat:now,
    exp:now+ttl,
    nonce:nonce||crypto.randomBytes(12).toString('base64url')
  };
  const header={alg:'HS256',typ:'SCDI1'};
  const data=b64url(JSON.stringify(header))+'.'+b64url(JSON.stringify(payload));
  return data+'.'+sign(data,secret);
}
function verifyIntakeToken(token,{secret,slug,now=Math.floor(Date.now()/1000)}={}){
  if(!secret||secret.length<24)return {ok:false,error:'SECRET_NOT_CONFIGURED'};
  const parts=String(token||'').split('.');
  if(parts.length!==3)return {ok:false,error:'MALFORMED'};
  const data=parts[0]+'.'+parts[1];
  if(!safeEqual(sign(data,secret),parts[2]))return {ok:false,error:'BAD_SIGNATURE'};
  try{
    const header=decodeJson(parts[0]),payload=decodeJson(parts[1]);
    if(header.alg!=='HS256'||header.typ!=='SCDI1')return {ok:false,error:'BAD_HEADER'};
    if(payload.aud!=='SCD_INTAKE')return {ok:false,error:'BAD_AUDIENCE'};
    if(!Number.isFinite(payload.exp)||payload.exp<now)return {ok:false,error:'EXPIRED'};
    if(payload.iat>now+120)return {ok:false,error:'ISSUED_IN_FUTURE'};
    if(slug&&payload.slug!==slug)return {ok:false,error:'SLUG_MISMATCH'};
    return {ok:true,payload};
  }catch{return {ok:false,error:'INVALID_PAYLOAD'}}
}
module.exports={issueIntakeToken,verifyIntakeToken};
