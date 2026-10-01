import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const {issueIntakeToken,verifyIntakeToken}=require('../lib/intake-links');

const secret='test-secret-abcdefghijklmnopqrstuvwxyz-1234567890';
const now=1900000000;
const token=issueIntakeToken({slug:'tesseramenti',mode:'TOKENIZED',expiresInSeconds:3600,secret,now,nonce:'fixed-nonce'});
const ok=verifyIntakeToken(token,{secret,slug:'tesseramenti',now:now+20});
if(!ok.ok)throw new Error('valid token rejected '+ok.error);
if(ok.payload.slug!=='tesseramenti'||ok.payload.aud!=='SCD_INTAKE')throw new Error('payload contract invalid');
if(JSON.stringify(ok.payload).match(/email|name|phone|athlete/i))throw new Error('PII-like fields found in token');
const tampered=token.slice(0,-1)+(token.endsWith('a')?'b':'a');
if(verifyIntakeToken(tampered,{secret,slug:'tesseramenti',now:now+20}).ok)throw new Error('tampered token accepted');
if(verifyIntakeToken(token,{secret,slug:'partner',now:now+20}).ok)throw new Error('slug mismatch accepted');
if(verifyIntakeToken(token,{secret,slug:'tesseramenti',now:now+4000}).ok)throw new Error('expired token accepted');
console.log('SCD INTAKE LINK FACTORY PASS');
