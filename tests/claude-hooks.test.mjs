// Tests for the SCD Claude Code guard hooks (.claude/hooks).
// Sample secrets are assembled at runtime so this file never contains one literally.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { classifyBash, findSecrets, checkPath, isBarePush } from '../.claude/hooks/scd-guard-lib.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fakeIban = ['IT', '60', 'X', '0542811101', '000000123456'].join('');
const fakeCf = ['RSS', 'MRA', '80', 'A', '01', 'F205', 'X'].join('');
const fakeGh = 'ghp_' + 'a'.repeat(36);

test('blocks force push, push to main, merges and destructive git', () => {
  for (const cmd of [
    'git push --force origin staging/superapp',
    'git push -f',
    'git push origin main',
    'cd repo && git push origin HEAD:main',
    'gh pr merge 140 --squash',
    'gh api -X PUT repos/o/r/pulls/140/merge',
    'git reset --hard origin/main',
    'git clean -fd',
    'git commit --no-verify -m x'
  ]) {
    assert.equal(classifyBash(cmd).block, true, cmd);
  }
});

test('allows normal work and asks for checks on commit', () => {
  assert.deepEqual(classifyBash('git push origin staging/superapp'), { block: false });
  assert.deepEqual(classifyBash('npm run test:manifest'), { block: false });
  assert.deepEqual(classifyBash('git clean -n'), { block: false });
  const c = classifyBash('git add -A && git commit -m "feat: x"');
  assert.equal(c.block, false);
  assert.equal(c.runManifest, true);
  assert.equal(c.scanStaged, true);
});

test('detects sensitive values', () => {
  assert.deepEqual(findSecrets(`iban ${fakeIban}`), ['IBAN']);
  assert.deepEqual(findSecrets(`cf ${fakeCf}`), ['CODICE_FISCALE']);
  assert.deepEqual(findSecrets(`token ${fakeGh}`), ['GITHUB_TOKEN']);
  assert.deepEqual(findSecrets('Calendario 2026/27, 156 gare, ATV LED 8 min'), []);
});

test('flags files that must not enter the public repo', () => {
  assert.deepEqual(checkPath('/repo/.env'), ['ENV_FILE']);
  assert.deepEqual(checkPath('/repo/docs/master.xlsx'), ['SPREADSHEET_EXPORT']);
  assert.deepEqual(checkPath('/repo/Accessi Mail.json'), ['CREDENTIALS_FILE']);
  assert.deepEqual(checkPath('/repo/apps/superapp/src/data/calendar.csv'), []);
  assert.deepEqual(checkPath('/repo/apps/superapp/src/routes/password-reset.tsx'), []);
});

function runHook(script, payload, env = {}) {
  return spawnSync('node', [join(root, '.claude/hooks', script)], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_PROJECT_DIR: root, ...env }
  });
}

test('pre-write hook blocks secrets end to end and allows clean writes', () => {
  const bad = runHook('pre-write.mjs', { tool_name: 'Write', tool_input: { file_path: join(root, 'docs/x.md'), content: `IBAN ${fakeIban}` } });
  assert.equal(bad.status, 2);
  assert.match(bad.stderr, /IBAN/);
  const ok = runHook('pre-write.mjs', { tool_name: 'Edit', tool_input: { file_path: join(root, 'docs/x.md'), new_string: 'Quadro settimanale' } });
  assert.equal(ok.status, 0);
  const outside = runHook('pre-write.mjs', { tool_name: 'Write', tool_input: { file_path: '/tmp/scratch/master.xlsx', content: '' } });
  assert.equal(outside.status, 0);
});

test('pre-bash hook blocks a main push end to end', () => {
  const r = runHook('pre-bash.mjs', { tool_name: 'Bash', cwd: root, tool_input: { command: 'git push origin main' } });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /approval/);
});

test('session-state hook prints the SCD:STATE fields', () => {
  const r = runHook('session-state.mjs', {});
  assert.equal(r.status, 0);
  for (const field of ['REPOSITORY', 'CURRENT_WORKING_BRANCH', 'WORKING_TREE', 'MANIFEST_VERSION_OR_HASH', 'NO STATE -> NO WRITE']) {
    assert.match(r.stdout, new RegExp(field));
  }
});

test('detects pushes whose target depends on the current branch', () => {
  assert.equal(isBarePush('git push'), true);
  assert.equal(isBarePush('git push origin'), true);
  assert.equal(isBarePush('git push -u origin'), true);
  assert.equal(isBarePush('git push origin staging/superapp'), false);
  assert.equal(isBarePush('npm test'), false);
});
