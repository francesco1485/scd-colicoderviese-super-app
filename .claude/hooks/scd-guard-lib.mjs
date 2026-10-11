// SCD guard rules shared by the Claude Code hooks in .claude/settings.json.
// Pure functions only, so tests/claude-hooks.test.mjs can verify every rule.

export const SECRET_PATTERNS = [
  { id: 'IBAN', re: /\b[A-Z]{2}\d{2}[A-Z]\d{10}[0-9A-Z]{12}\b/ },
  { id: 'CODICE_FISCALE', re: /\b[A-Z]{6}\d{2}[A-EHLMPR-T]\d{2}[A-Z]\d{3}[A-Z]\b/ },
  { id: 'PRIVATE_KEY', re: /-----BEGIN (?:RSA |EC |OPENSSH |)PRIVATE KEY-----/ },
  { id: 'GITHUB_TOKEN', re: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/ },
  { id: 'ANTHROPIC_KEY', re: /\bsk-ant-[A-Za-z0-9_-]{20,}/ },
  { id: 'GOOGLE_API_KEY', re: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  { id: 'SUPABASE_SERVICE_JWT', re: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]*cm9sZSI6InNlcnZpY2Vfcm9sZS[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+/ }
];

// Files that must never be written into the public repository.
export const FORBIDDEN_PATHS = [
  { id: 'ENV_FILE', re: /(^|\/)\.env(\.[^/]*)?$/ },
  { id: 'SPREADSHEET_EXPORT', re: /\.(xlsx|xlsm|xls|csv)$/i, allow: /(^|\/)(apps\/[^/]+\/src\/data|tests\/fixtures)\// },
  // Data files named after credentials; source code such as password-reset.tsx stays allowed.
  { id: 'CREDENTIALS_FILE', re: /(credential|password|accessi[-_ ]mail|secret)[^/]*\.(txt|json|md|csv|xlsx?|pdf|docx?)$/i }
];

export function findSecrets(text) {
  if (!text) return [];
  return SECRET_PATTERNS.filter(({ re }) => re.test(text)).map(({ id }) => id);
}

export function checkPath(filePath) {
  if (!filePath) return [];
  const p = filePath.replace(/\\/g, '/');
  return FORBIDDEN_PATHS.filter(({ re, allow }) => re.test(p) && !(allow && allow.test(p))).map(({ id }) => id);
}

// True when `git push` names no refspec, so the target depends on the current branch.
export function isBarePush(command) {
  const m = (command || '').match(/\bgit push\b([^;&|]*)/);
  if (!m) return false;
  const args = m[1].trim().split(/\s+/).filter((a) => a && !a.startsWith('-'));
  return args.length <= 1; // nothing, or only the remote name
}

// Returns { block: boolean, reason?: string, runManifest?: boolean, scanStaged?: boolean }
export function classifyBash(command) {
  const cmd = (command || '').replace(/\s+/g, ' ').trim();
  if (!cmd) return { block: false };

  if (/\bgit push\b/.test(cmd)) {
    if (/(^|\s)(-f|--force|--force-with-lease)(\s|=|$)/.test(cmd)) {
      return { block: true, reason: 'Force push is not allowed. Push a normal commit instead.' };
    }
    if (/\bgit push\b[^;&|]*\s(\S+:)?(main|master|production)(\s|$)/.test(cmd)) {
      return { block: true, reason: 'Pushing to main/production needs explicit approval from Francesco (Nessuna pubblicazione senza approvazione).' };
    }
  }
  if (/\bgh pr merge\b/.test(cmd) || /\bgh api\b[^;&|]*\/merge\b/.test(cmd)) {
    return { block: true, reason: 'Merging a pull request needs explicit approval from Francesco.' };
  }
  if (/\bgit (reset --hard|clean -[a-z]*f)/.test(cmd) && !/--dry-run|-n\b/.test(cmd)) {
    return { block: true, reason: 'Destructive git command blocked. Stash or branch first.' };
  }
  if (/\bgit commit\b/.test(cmd)) {
    if (/--no-verify\b/.test(cmd)) {
      return { block: true, reason: 'git commit --no-verify skips the SCD checks.' };
    }
    return { block: false, runManifest: true, scanStaged: true };
  }
  return { block: false };
}
