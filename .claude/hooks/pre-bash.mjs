#!/usr/bin/env node
// PreToolUse hook for Bash. Exit 2 blocks the command and returns stderr to Claude.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { classifyBash, findSecrets, isBarePush } from './scd-guard-lib.mjs';

const input = JSON.parse(await new Response(process.stdin).text() || '{}');
const command = input?.tool_input?.command || '';
const verdict = classifyBash(command);

if (verdict.block) {
  process.stderr.write(`SCD guard: ${verdict.reason}\n`);
  process.exit(2);
}

if (isBarePush(command)) {
  const cwdRoot = gitRoot(input.cwd) || gitRoot(process.env.CLAUDE_PROJECT_DIR);
  let branch = '';
  try { branch = cwdRoot ? execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: cwdRoot, encoding: 'utf8' }).trim() : ''; } catch { branch = ''; }
  if (/^(main|master|production)$/.test(branch)) {
    process.stderr.write(`SCD guard: you are on ${branch}; a bare git push would publish it. Pushing to main/production needs explicit approval from Francesco.\n`);
    process.exit(2);
  }
}

if (verdict.runManifest || verdict.scanStaged) {
  const cwd = gitRoot(input.cwd) || gitRoot(process.env.CLAUDE_PROJECT_DIR);
  if (cwd) {
    if (verdict.scanStaged) {
      let diff = '';
      try {
        diff = execFileSync('git', ['diff', '--cached', '--unified=0', '--no-color'], { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
      } catch { diff = ''; }
      const added = diff.split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++')).join('\n');
      const hits = findSecrets(added);
      if (hits.length) {
        process.stderr.write(`SCD guard: staged changes contain sensitive data (${hits.join(', ')}). Remove it before committing; the repository is public.\n`);
        process.exit(2);
      }
    }
    if (verdict.runManifest && existsSync(join(cwd, 'scripts/validate-system-manifest.mjs'))) {
      try {
        execFileSync('node', ['scripts/validate-system-manifest.mjs'], { cwd, stdio: ['ignore', 'ignore', 'pipe'], timeout: 60000 });
      } catch (err) {
        process.stderr.write(`SCD guard: npm run test:manifest failed, commit blocked.\n${String(err.stderr || err.message).slice(0, 2000)}\n`);
        process.exit(2);
      }
    }
  }
}
process.exit(0);

function gitRoot(dir) {
  if (!dir) return null;
  try {
    return execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: dir, encoding: 'utf8' }).trim();
  } catch { return null; }
}
