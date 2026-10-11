#!/usr/bin/env node
// SessionStart hook: prints a verified SCD:STATE snapshot into Claude's context.
// Read-only. Remote fields (PR, CI, Pages, Render) stay UNVERIFIED until checked.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const git = (...args) => {
  try { return execFileSync('git', args, { cwd: root, encoding: 'utf8', timeout: 10000 }).trim(); } catch { return null; }
};

const branch = git('rev-parse', '--abbrev-ref', 'HEAD');
const head = git('rev-parse', '--short', 'HEAD');
const mainSha = git('rev-parse', '--short', 'origin/main');
const dirty = git('status', '--porcelain');
const ahead = git('rev-list', '--left-right', '--count', `HEAD...@{upstream}`);
const manifestPath = join(root, 'SCD_SYSTEM_MANIFEST.json');
const manifestHash = existsSync(manifestPath)
  ? createHash('sha256').update(readFileSync(manifestPath)).digest('hex').slice(0, 12)
  : null;

const v = (val) => (val === null ? 'NOT_AVAILABLE' : `VERIFIED ${val}`);
const lines = [
  'SCD:STATE (local snapshot at session start, refresh before any write)',
  `REPOSITORY: ${v((git('config', '--get', 'remote.origin.url') || '').replace(/\/\/[^@/]+@/, '//') || null)}`,
  `CURRENT_MAIN_SHA: ${mainSha ? `VERIFIED ${mainSha} (last fetch)` : 'UNVERIFIED'}`,
  `CURRENT_WORKING_BRANCH: ${v(branch && head ? `${branch} @ ${head}` : null)}`,
  `WORKING_TREE: ${dirty === null ? 'NOT_AVAILABLE' : dirty ? `VERIFIED dirty (${dirty.split('\n').length} files)` : 'VERIFIED clean'}`,
  `UPSTREAM_AHEAD_BEHIND: ${ahead ? `VERIFIED ${ahead.replace(/\s+/, ' ahead / ')} behind` : 'NOT_AVAILABLE'}`,
  `MANIFEST_VERSION_OR_HASH: ${v(manifestHash)}`,
  'OPEN_PR / PR_STATUS / CI_STATUS / PAGES_STATUS / RENDER_STATUS: UNVERIFIED (check with gh api and Render before writing)',
  'RULES: NO STATE -> NO WRITE. No merge, main push or production deploy without Francesco. UNKNOWN != ZERO.'
];
process.stdout.write(lines.join('\n') + '\n');
