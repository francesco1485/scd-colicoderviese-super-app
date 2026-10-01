import fs from 'node:fs';

const fail=m=>{console.error('INTAKE CONTRACT FAIL: '+m);process.exitCode=1};
const m=JSON.parse(fs.readFileSync('SCD_SYSTEM_MANIFEST.json','utf8'));
const cfg=JSON.parse(fs.readFileSync('config/scd-intake-hub.v1.json','utf8'));
const pub=JSON.parse(fs.readFileSync('intake/intake-config.public.json','utf8'));
const html=fs.readFileSync('intake/index.html','utf8');
const js=fs.readFileSync('intake/intake.js','utf8');

if(m.data_architecture?.intake_hub?.fail_closed!==true)fail('manifest intake must fail closed');
if(cfg.runtime?.upload_adapter!=='NOT_CONNECTED')fail('upload adapter status must remain NOT_CONNECTED until verified');
if(cfg.runtime?.ephemeral_disk_final_storage!==false)fail('ephemeral disk cannot be final storage');
if(pub.runtimeState!=='UPLOAD_ADAPTER_NOT_CONNECTED')fail('public intake must expose blocked state until adapter is verified');
if(!html.includes('SCD INTAKE HUB'))fail('intake UI missing');
if(!html.includes('fileInput'))fail('file control missing');
if(!js.includes('Intentionally fail-closed'))fail('fail-closed submit marker missing');
if(!js.includes('submit.disabled=!ready'))fail('submit must stay disabled unless runtime is READY');
if(!cfg.security?.audit_required||!cfg.security?.rate_limit_required||!cfg.security?.mime_allowlist_required)fail('security requirements incomplete');
if(!cfg.domains?.SAFEGUARDING_ISOLATO)fail('safeguarding isolation missing');
if(m.data_architecture?.intake_hub?.link_factory?.signing!=='HMAC_SHA256_SERVER_SIDE')fail('signed link factory contract missing');
if(m.data_architecture?.intake_hub?.link_factory?.token_payload!=='NO_PII')fail('no-PII token contract missing');
if(!process.exitCode)console.log('SCD INTAKE HUB CONTRACT PASS');
