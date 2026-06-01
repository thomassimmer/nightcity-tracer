import type { TerminalPanelConfig, LogEntry, FileState, Payload, DbCollection } from '@/scenario.types';

export interface TerminalLine {
  type: 'input' | 'output' | 'error' | 'success';
  text: string;
}

export interface TerminalRuntime {
  logs: LogEntry[];
  stepReachedIds: Set<string>;
  deletedXssEntries: Set<string>;
  resourceValues: Map<string, string | null>;
}

interface CommandResult {
  data: string[];
  error?: string;
}

interface ExecCallbacks {
  blockIP?: (ip: string) => void;
  revokeToken?: (token: string) => void;
  deleteStoredXss?: (key: string) => void;
}

function serializePayload(p: Payload): string[] {
  if (typeof p === 'string') return [`  ↳ ${p}`];
  switch (p.type) {
    case 'http':
      return [
        ...Object.entries(p.headers ?? {}).map(([k, v]) => `  ↳ ${k}: ${v}`),
        ...(p.body != null ? [`  ↳ ${p.body}`] : []),
      ];
    case 'lines':
      return p.lines.map(l => `  ↳ ${l}`);
    case 'file':
      return [`  ↳ ${p.filename}`, ...p.preview.split('\n').map(l => `    ${l}`)];
  }
}

function renderLogEntry(l: LogEntry): string[] {
  const header = l.method && l.method !== 'SYS'
    ? `[${l.timestamp}] ${l.ip} - ${l.method} ${l.path} -> ${l.status}`
    : `[${l.timestamp}] ${l.message}`;
  return l.payload ? [header, ...serializePayload(l.payload)] : [header];
}

function execCat(
  file: string,
  logFiles: Record<string, string>,
  logs: LogEntry[],
  virtualFiles: Record<string, FileState>,
): CommandResult {
  if (!file) return { data: [], error: 'cat: Missing target file argument.' };
  const source = logFiles[file];
  if (source !== undefined) {
    return { data: logs.filter(l => l.source === source).flatMap(renderLogEntry) };
  }
  if (virtualFiles[file]) {
    return { data: virtualFiles[file].content.split('\n') };
  }
  return { data: [], error: `cat: ${file}: No such virtual log or file.` };
}

function execLs(
  logFiles: Record<string, string>,
  logs: LogEntry[],
  virtualFiles: Record<string, FileState>,
): CommandResult {
  const available = Object.entries(logFiles)
    .filter(([, source]) => logs.some(l => l.source === source))
    .map(([name]) => name);
  return { data: [...available, ...Object.keys(virtualFiles)] };
}

function execWaf(
  act: string | undefined,
  ip: string | undefined,
  blockIP?: (ip: string) => void,
): CommandResult {
  if (act === 'block' && ip) {
    blockIP?.(ip);
    return { data: [`SUCCESS: Applied WAF block drop rule on ${ip}.`] };
  }
  return { data: [], error: 'Usage: waf block <ip>' };
}

function execToken(
  act: string | undefined,
  token: string | undefined,
  revokeToken?: (t: string) => void,
): CommandResult {
  if (act === 'revoke' && token) {
    revokeToken?.(token);
    return { data: [`SUCCESS: Revoked oauth session token [${token}].`] };
  }
  return { data: [], error: 'Usage: token revoke <token>' };
}

function execDb(
  args: string[],
  collections: DbCollection[] | undefined,
  resourceValues: Map<string, string | null>,
  deletedXssEntries: Set<string>,
  deleteStoredXss?: (key: string) => void,
): CommandResult {
  if (!collections?.length) return { data: [], error: 'db: no database configured for this scenario.' };

  const sub = args[0];
  const target = args[1];

  if (sub === 'list' && target) {
    const col = collections.find(c => c.name === target);
    if (!col) return { data: [], error: `db: collection "${target}" not found.` };
    const visible = col.records.filter(r => {
      if (r.requires_resource && resourceValues.get(r.requires_resource) == null) return false;
      if (r.xss_key && deletedXssEntries.has(r.xss_key)) return false;
      return true;
    });
    return { data: [`${target} -- ${visible.length} entries`, ...visible.flatMap(r => r.display_lines)] };
  }

  if (sub === 'delete' && target?.includes('/')) {
    const slash = target.indexOf('/');
    const colName = target.slice(0, slash);
    const id = target.slice(slash + 1);
    const col = collections.find(c => c.name === colName);
    if (!col) return { data: [], error: `db: collection "${colName}" not found.` };
    const record = col.records.find(r => r.id === id);
    if (!record) return { data: [], error: `db: ${target}: record not found.` };
    if (record.delete_denied) return { data: [], error: `db: ${target}: permission denied.` };
    if (record.requires_resource && resourceValues.get(record.requires_resource) == null) {
      return { data: [], error: `db: ${target}: record not found.` };
    }
    if (record.xss_key) {
      if (deletedXssEntries.has(record.xss_key)) return { data: [], error: `db: ${target}: record not found.` };
      deleteStoredXss?.(record.xss_key);
      return { data: [`SUCCESS: ${target} deleted from database.`] };
    }
    return { data: [], error: `db: ${target}: permission denied.` };
  }

  return { data: [], error: 'Usage: db list <collection> | db delete <collection>/<id>' };
}

function execHelp(config: TerminalPanelConfig): CommandResult {
  const dbCmds: string[] = [];
  if (config.db_collections?.length) {
    const colName = config.db_collections[0].name;
    const listCmd = `db list ${colName}`;
    const deleteCmd = `db delete ${colName}/<id>`;
    const pad = (s: string) => s.padEnd(29);
    const singular = colName.replace(/s$/, '');
    dbCmds.push(
      `${pad(listCmd)} - List all stored ${colName}`,
      `${pad(deleteCmd)} - Delete a specific stored ${singular}`,
    );
  }
  const base = [
    'NIGHTCITY FORENSIC CLI HELP PANEL:',
    '==================================',
    'ls                           - List available log and virtual files',
    'cat <file>                   - Print a log or virtual file',
    'grep <pattern>               - Filter input lines matching pattern string/regex',
    'wc -l                        - Count total lines in output stream',
    'tail [-n <n>]                - Show last lines of output stream',
    'head [-n <n>]                - Show first lines of output stream',
    'waf block <ip>               - Deploy active WAF rule blocking hacker IP',
    'token revoke <token>         - Invalidate hijacked active user session',
    ...dbCmds,
    'clear                        - Clean terminal buffer',
    '----------------------------------',
    'EXAMPLE POWER CHAIN: cat <file> | grep <pattern> | wc -l',
  ];
  const scenarioCmds = Object.keys(config.commands ?? {});
  if (scenarioCmds.length === 0) return { data: base };
  return {
    data: [
      ...base,
      '',
      'SCENARIO INTEL COMMANDS:',
      '------------------------',
      ...scenarioCmds.map(cmd => `  ${cmd}`),
    ],
  };
}

const GREP_PATTERN_MAX_LENGTH = 100;

function execGrep(pattern: string, data: string[]): CommandResult {
  if (!pattern) return { data: [], error: 'grep: Pattern parameter missing.' };
  const clean = pattern.replace(/^["']|["']$/g, '');
  if (clean.length > GREP_PATTERN_MAX_LENGTH) {
    return { data: [], error: `grep: Pattern too long (max ${GREP_PATTERN_MAX_LENGTH} chars).` };
  }
  try {
    const regex = new RegExp(clean, 'i');
    return { data: data.filter(line => regex.test(line)) };
  } catch {
    return { data: data.filter(line => line.toLowerCase().includes(clean.toLowerCase())) };
  }
}

function execWc(args: string[], data: string[]): CommandResult {
  if (args[0] === '-l') return { data: [String(data.length)] };
  return { data: [], error: 'wc: Only "-l" flag is supported currently.' };
}

function execTail(args: string[], data: string[]): CommandResult {
  const nIdx = args.indexOf('-n');
  const count = nIdx !== -1 ? parseInt(args[nIdx + 1]) : 10;
  return { data: data.slice(-count) };
}

function execHead(args: string[], data: string[]): CommandResult {
  const nIdx = args.indexOf('-n');
  const count = nIdx !== -1 ? parseInt(args[nIdx + 1]) : 10;
  return { data: data.slice(0, count) };
}

export function executeTerminalCommand(
  commandString: string,
  config: TerminalPanelConfig,
  runtime: TerminalRuntime,
  virtualFiles: Record<string, FileState>,
  callbacks: ExecCallbacks = {},
): TerminalLine[] {
  const trimmed = commandString.trim();
  if (!trimmed || trimmed === 'clear') return [];

  const lines: TerminalLine[] = [{ type: 'input', text: `nc-os:~$ ${trimmed}` }];
  const stages = trimmed.split('|').map(s => s.trim().replace(/\s+/g, ' '));
  let currentData: string[] = [];
  let errorMsg: string | undefined;

  for (let idx = 0; idx < stages.length; idx++) {
    if (errorMsg) break;

    const tokens = stages[idx].split(/\s+/);
    const cmd = tokens[0].toLowerCase();
    const args = tokens.slice(1);

    let result: CommandResult;

    if (idx === 0) {
      if (cmd === 'ls') {
        result = execLs(config.log_files ?? {}, runtime.logs, virtualFiles);
      } else if (cmd === 'cat') {
        result = execCat(args[0], config.log_files ?? {}, runtime.logs, virtualFiles);
      } else if (cmd === 'waf') {
        result = execWaf(args[0]?.toLowerCase(), args[1], callbacks.blockIP);
      } else if (cmd === 'token') {
        result = execToken(args[0]?.toLowerCase(), args[1], callbacks.revokeToken);
      } else if (cmd === 'db') {
        result = execDb(
          args,
          config.db_collections,
          runtime.resourceValues,
          runtime.deletedXssEntries,
          callbacks.deleteStoredXss,
        );
      } else if (cmd === 'grep') {
        const catResult = execCat(args[args.length - 1], config.log_files ?? {}, runtime.logs, virtualFiles);
        if (catResult.error) result = catResult;
        else result = execGrep(args[0], catResult.data);
      } else if (cmd === 'help') {
        result = execHelp(config);
      } else if (config.commands?.[stages[idx]]) {
        const entries = config.commands[stages[idx]];
        let best = entries[0];
        for (const entry of entries) {
          if (
            !entry.requires_resource ||
            runtime.resourceValues.get(entry.requires_resource) != null
          ) {
            best = entry;
          }
        }
        result = { data: best.output.split('\n') };
      } else {
        result = { data: [], error: `nc-os: command not found: ${cmd}. Type 'help' for manual.` };
      }
    } else {
      if (cmd === 'grep') result = execGrep(args[0], currentData);
      else if (cmd === 'wc') result = execWc(args, currentData);
      else if (cmd === 'tail') result = execTail(args, currentData);
      else if (cmd === 'head') result = execHead(args, currentData);
      else result = { data: [], error: `nc-os: command inside pipe chain not supported: ${cmd}` };
    }

    if (result.error) errorMsg = result.error;
    else currentData = result.data;
  }

  if (errorMsg) {
    lines.push({ type: 'error', text: errorMsg });
  } else {
    const attackerIp = runtime.resourceValues.get('attacker_ip') ?? '';
    const resolved = attackerIp
      ? currentData.map(line => line.replace(/\$attacker_ip/g, attackerIp))
      : currentData;
    for (const line of resolved) {
      lines.push({ type: line.startsWith('SUCCESS') ? 'success' : 'output', text: line });
    }
  }

  return lines;
}
