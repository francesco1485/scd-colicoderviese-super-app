import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const runtime=fs.readFileSync(new URL('../scd-ng.js',import.meta.url),'utf8');
test('private desk requires server-confirmed R20 audit after loading scoped workspace',()=>{
  const entry=runtime.slice(runtime.indexOf('async function ensurePrivateDesk('),runtime.indexOf('function privateProfileName('));
  assert.ok(entry.includes("privatePost('auth.validate'"),'must validate R20 session');
  assert.ok(entry.includes("privatePost('dashboard.summary'"),'must load R20 scoped data');
  assert.ok(entry.includes("privatePost('auth.access.log'"),'must submit canonical R56 access event');
  assert.ok(entry.includes("eventType:'PRIVATE_DESK_OPEN'"),'must record desk open event');
  assert.ok(entry.includes("audit.stored!==true"),'must check audit persistence acknowledgement');
  assert.ok(entry.includes("ACCESS_AUDIT_UNCONFIRMED"),'must fail closed when audit is unconfirmed');
  assert.ok(entry.indexOf('state.workspace=')>entry.indexOf("eventType:'PRIVATE_DESK_OPEN'"),'renderable workspace must be set only after audit');
});
