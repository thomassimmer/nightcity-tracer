const SAVE_KEY_PREFIX = 'nightcity-save-';
const COMPLETED_KEY_PREFIX = 'nightcity-completed-';

export interface CompletedState {
  v: 1;
  scenarioId: string;
  grade: string;
  total: number;
  completedAt: number;
}

export interface TerminalCommand {
  sec: number;
  command: string;
}

export type UserAction =
  | { sec: number; type: 'block_ip'; ip: string }
  | { sec: number; type: 'revoke_token'; token: string }
  | { sec: number; type: 'patch_rule'; ruleId: string; invalidates_resources?: string[] }
  | { sec: number; type: 'delete_xss'; key: string }
  | { sec: number; type: 'delete_db_record'; collection: string; id: string; invalidates_resource?: string };

export interface SavedState {
  v: 1;
  scenarioId: string;
  seed: string;
  elapsedSeconds: number;
  blockedIPs: string[];
  deletedXssEntries: string[];
  filePatches: Record<string, string>;
  networkFlows: Array<{
    id: string;
    src: string;
    dst: string;
    dst_port: number;
    protocol: 'TCP' | 'UDP' | 'HTTPS';
    bytes_per_second: number;
  }>;
  activeAlerts: Array<{
    id: string;
    level: 'info' | 'warning' | 'critical';
    message: string;
    read: boolean;
    timestamp: number;
  }>;
  reportAnswers: Record<string, string>;
  virtualFilePatches: Record<string, { patchedRuleIds: string[]; activeDiffOptionId?: string }>;
  userActions?: UserAction[];
  terminalCommands?: TerminalCommand[];
  deletedDbRecords?: Record<string, string[]>;
}

export function saveToLocalStorage(state: SavedState): void {
  try {
    localStorage.setItem(`${SAVE_KEY_PREFIX}${state.scenarioId}`, JSON.stringify(state));
  } catch (err) {
    console.warn('saveToLocalStorage: could not write save state:', err);
  }
}

export function listAllSaves(): SavedState[] {
  const saves: SavedState[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(SAVE_KEY_PREFIX)) continue;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (parsed?.v !== 1) continue;
      saves.push(parsed as SavedState);
    } catch {
      // skip malformed entries
    }
  }
  return saves;
}

export function clearSave(scenarioId: string): void {
  localStorage.removeItem(`${SAVE_KEY_PREFIX}${scenarioId}`);
}

export function saveCompletion(state: CompletedState): void {
  const key = `${COMPLETED_KEY_PREFIX}${state.scenarioId}`;
  try {
    const existing = loadCompletion(state.scenarioId);
    if (existing && existing.total >= state.total) return;
    localStorage.setItem(key, JSON.stringify(state));
  } catch (err) {
    console.warn('saveCompletion: could not write completion:', err);
  }
}

export function loadCompletion(scenarioId: string): CompletedState | null {
  try {
    const raw = localStorage.getItem(`${COMPLETED_KEY_PREFIX}${scenarioId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.v !== 1) return null;
    return parsed as CompletedState;
  } catch {
    return null;
  }
}

export function listAllCompletions(): CompletedState[] {
  const completions: CompletedState[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(COMPLETED_KEY_PREFIX)) continue;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (parsed?.v !== 1) continue;
      completions.push(parsed as CompletedState);
    } catch {
      // skip malformed entries
    }
  }
  return completions;
}

export function clearTutorialStep(scenarioId: string): void {
  localStorage.removeItem(`nightcity-tutorial-step-${scenarioId}`);
}

export function formatElapsed(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m${String(s).padStart(2, "0")}s` : `${s}s`;
}
