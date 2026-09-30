import fs from 'node:fs';

const required=[
  'mobile/package.json',
  'mobile/app.json',
  'mobile/tsconfig.json',
  'mobile/App.tsx',
  'mobile/src/lib/supabase.ts',
  'mobile/src/lib/context.ts',
  'mobile/.env.example',
  'mobile/README.md'
];

for(const file of required){
  if(!fs.existsSync(file)){
    console.error('SCD MOBILE CONTRACT FAIL: missing',file);
    process.exitCode=1;
  }
}

const pkg=JSON.parse(fs.readFileSync('mobile/package.json','utf8'));
if(!pkg.dependencies?.['@supabase/supabase-js']){console.error('SCD MOBILE CONTRACT FAIL: Supabase client missing');process.exitCode=1}
if(!pkg.dependencies?.expo){console.error('SCD MOBILE CONTRACT FAIL: Expo missing');process.exitCode=1}

const app=fs.readFileSync('mobile/App.tsx','utf8');
for(const token of ['signInWithPassword','loadMyContext','UNVERIFIED']){
  if(!app.includes(token)){console.error('SCD MOBILE CONTRACT FAIL: missing '+token);process.exitCode=1}
}

const supabase=fs.readFileSync('mobile/src/lib/supabase.ts','utf8');
if(!supabase.includes('EXPO_PUBLIC_SCD_SUPABASE_URL')){console.error('SCD MOBILE CONTRACT FAIL: public URL env missing');process.exitCode=1}
if(!supabase.includes('EXPO_PUBLIC_SCD_SUPABASE_PUBLISHABLE_KEY')){console.error('SCD MOBILE CONTRACT FAIL: publishable key env missing');process.exitCode=1}
if(/service[_-]?role/i.test(supabase)){console.error('SCD MOBILE CONTRACT FAIL: service role reference forbidden in mobile client');process.exitCode=1}

if(process.exitCode)process.exit(process.exitCode);
console.log('SCD MOBILE CONTRACT PASS',{channel:'ANDROID_IOS',auth:'SUPABASE_AUTH',rpc:'scd_my_context'});
