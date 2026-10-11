#!/usr/bin/env node
// PreToolUse hook for Write/Edit/MultiEdit/NotebookEdit. Exit 2 blocks the write.
import { checkPath, findSecrets } from './scd-guard-lib.mjs';

const input = JSON.parse(await new Response(process.stdin).text() || '{}');
const t = input?.tool_input || {};
const filePath = t.file_path || t.notebook_path || '';

// Only guard files inside this repository; scratch files elsewhere are not published.
const root = process.env.CLAUDE_PROJECT_DIR;
if (root && filePath && !filePath.startsWith(root)) process.exit(0);

const pathHits = checkPath(filePath);
if (pathHits.length) {
  process.stderr.write(`SCD guard: ${filePath} looks like a sensitive file (${pathHits.join(', ')}) and must not live in the public repository. Keep it in the scratchpad or in a reserved Drive folder.\n`);
  process.exit(2);
}

const text = [t.content, t.new_string, t.new_source, ...(Array.isArray(t.edits) ? t.edits.map((e) => e.new_string) : [])]
  .filter(Boolean).join('\n');
const hits = findSecrets(text);
if (hits.length) {
  process.stderr.write(`SCD guard: the new content contains sensitive data (${hits.join(', ')}). Never write IBAN, codici fiscali, keys or tokens into the repository.\n`);
  process.exit(2);
}
process.exit(0);
