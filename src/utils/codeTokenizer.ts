import type { FileState } from '@/scenario.types';

export type TokType = 'keyword' | 'builtin' | 'string' | 'comment' | 'number' | 'decorator' | 'variable' | 'operator' | 'plain';
export interface Tok { type: TokType; value: string }

const PY_KW = new Set([
  'def', 'class', 'return', 'import', 'from', 'if', 'elif', 'else',
  'for', 'while', 'try', 'except', 'finally', 'with', 'as', 'not', 'in',
  'is', 'and', 'or', 'True', 'False', 'None', 'lambda', 'yield', 'raise',
  'pass', 'break', 'continue', 'global', 'nonlocal', 'del', 'assert',
  'async', 'await',
]);
const PY_BUILTIN = new Set([
  'print', 'len', 'range', 'str', 'int', 'float', 'list', 'dict', 'set',
  'tuple', 'type', 'isinstance', 'hasattr', 'getattr', 'setattr', 'super',
  'object', 'JsonResponse', 'render', 'request', 'HttpResponse', 'self',
  'open', 'enumerate', 'zip', 'map', 'filter', 'sorted', 'reversed',
]);
const NGX_KW = new Set([
  'server', 'http', 'location', 'events', 'upstream', 'map', 'geo', 'stream',
  'types', 'include', 'listen', 'root', 'index', 'error_log', 'access_log',
  'server_name', 'proxy_pass', 'proxy_set_header', 'add_header', 'return',
  'rewrite', 'limit_req', 'limit_req_zone', 'ssl_certificate',
  'ssl_certificate_key', 'worker_processes', 'worker_connections', 'try_files',
  'expires', 'gzip', 'keepalive_timeout', 'client_max_body_size', 'deny', 'allow',
]);

export function detectLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    py: 'python', pyw: 'python',
    js: 'javascript', ts: 'typescript', jsx: 'javascript', tsx: 'typescript',
    conf: 'nginx', nginx: 'nginx',
    php: 'php',
    sh: 'bash', bash: 'bash',
    yaml: 'yaml', yml: 'yaml',
    json: 'json',
    md: 'markdown',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    c: 'c', cpp: 'cpp', h: 'c',
    sql: 'sql',
    xml: 'xml', html: 'html',
    css: 'css',
  };
  return map[ext] ?? 'generic';
}

export function tokenizeLine(line: string, lang: string): Tok[] {
  const toks: Tok[] = [];
  let rest = line;

  while (rest.length > 0) {
    if (rest[0] === '#') { toks.push({ type: 'comment', value: rest }); break; }

    if (lang === 'python' && rest[0] === '@') {
      const m = rest.match(/^@[\w.]+/);
      if (m) { toks.push({ type: 'decorator', value: m[0] }); rest = rest.slice(m[0].length); continue; }
    }

    if ((lang === 'nginx' || lang === 'conf') && rest[0] === '$') {
      const m = rest.match(/^\$\w+/);
      if (m) { toks.push({ type: 'variable', value: m[0] }); rest = rest.slice(m[0].length); continue; }
    }

    if (rest[0] === '"' || rest[0] === "'") {
      const q = rest[0];
      let i = 1;
      while (i < rest.length && rest[i] !== q) { if (rest[i] === '\\') i++; i++; }
      const val = rest.slice(0, Math.min(i + 1, rest.length));
      toks.push({ type: 'string', value: val });
      rest = rest.slice(val.length);
      continue;
    }

    if (/\d/.test(rest[0])) {
      const m = rest.match(/^\d+(?:\.\d+)?/);
      if (m) { toks.push({ type: 'number', value: m[0] }); rest = rest.slice(m[0].length); continue; }
    }

    if (/[a-zA-Z_]/.test(rest[0])) {
      const m = rest.match(/^[a-zA-Z_]\w*/);
      if (m) {
        const word = m[0];
        let tokType: TokType = 'plain';
        if (lang === 'python') {
          if (PY_KW.has(word)) tokType = 'keyword';
          else if (PY_BUILTIN.has(word)) tokType = 'builtin';
        } else if (lang === 'nginx' || lang === 'conf') {
          if (NGX_KW.has(word)) tokType = 'keyword';
        }
        toks.push({ type: tokType, value: word });
        rest = rest.slice(word.length);
        continue;
      }
    }

    const opMatch = rest.match(/^[+\-*/%=<>!&|^~:;,.()[\]{}]+/);
    if (opMatch) { toks.push({ type: 'operator', value: opMatch[0] }); rest = rest.slice(opMatch[0].length); continue; }

    toks.push({ type: 'plain', value: rest[0] });
    rest = rest.slice(1);
  }

  return toks;
}

// VS Code Dark+ token colours
export const TOK_COLORS: Record<TokType, string> = {
  keyword:   'text-blue-400',
  builtin:   'text-yellow-300',
  string:    'text-orange-300',
  comment:   'text-green-600 italic',
  number:    'text-emerald-300',
  decorator: 'text-purple-400',
  variable:  'text-sky-300',
  operator:  'text-gray-300',
  plain:     'text-gray-300',
};

const DEF_PATTERNS: Partial<Record<string, RegExp>> = {
  python:     /^\s*(?:def|class)\s+(\w+)/,
  javascript: /^\s*(?:export\s+)?(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=|class\s+(\w+))/,
  typescript: /^\s*(?:export\s+)?(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=|class\s+(\w+))/,
  bash:       /^\s*(?:function\s+)?(\w+)\s*\(\s*\)\s*\{/,
  go:         /^\s*func\s+(?:\(\w+\s+\*?\w+\)\s+)?(\w+)\s*\(/,
  rust:       /^\s*(?:pub(?:\s+\w+)?\s+)?fn\s+(\w+)/,
};

export function findDefinition(word: string, files: Record<string, FileState>): { filePath: string; lineNumber: number } | null {
  for (const [filePath, state] of Object.entries(files)) {
    const lang = detectLanguage(filePath);
    const pattern = DEF_PATTERNS[lang];
    if (!pattern) continue;
    const lines = state.content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(pattern);
      if (m && m.slice(1).some(g => g === word)) {
        return { filePath, lineNumber: i + 1 };
      }
    }
  }
  return null;
}
