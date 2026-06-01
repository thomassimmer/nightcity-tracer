export type NodeRole = 'hub' | 'internal' | 'external' | 'service';

export function nodeColor(role: NodeRole, blocked: boolean): string {
  if (blocked) return '#374151';
  switch (role) {
    case 'hub':      return 'var(--theme-primary)';
    case 'internal': return '#06b6d4';
    case 'service':  return '#a78bfa';
    default:         return '#4b5563';
  }
}

export function fmtBps(bps: number): string {
  if (bps >= 1_000_000) return `${(bps / 1_000_000).toFixed(1)} MB/s`;
  if (bps >= 1_000)     return `${(bps / 1_000).toFixed(0)} KB/s`;
  return `${bps} B/s`;
}

export function linkColor(status: number): string {
  if (status >= 500) return '#ef4444';
  if (status >= 400) return '#f59e0b';
  return '#06b6d4';
}
