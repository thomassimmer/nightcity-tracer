import type { FileState } from '@/scenario.types';

export interface TreeGroup { dir: string | null; paths: string[] }

export interface SearchHit {
  filePath: string;
  lineNumber: number;
  lineContent: string;
}

export function buildGroups(paths: string[]): TreeGroup[] {
  const map = new Map<string | null, string[]>();
  for (const p of paths) {
    const slashIdx = p.lastIndexOf('/');
    const dir = slashIdx === -1 ? null : p.slice(0, slashIdx);
    const arr = map.get(dir) ?? [];
    arr.push(p);
    map.set(dir, arr);
  }
  const groups: TreeGroup[] = [];
  const rootFiles = map.get(null);
  if (rootFiles) groups.push({ dir: null, paths: rootFiles });
  for (const [dir, paths] of map) {
    if (dir !== null) groups.push({ dir, paths });
  }
  return groups;
}

export function fileName(path: string): string {
  const idx = path.lastIndexOf('/');
  return idx === -1 ? path : path.slice(idx + 1);
}

export function searchVirtualFiles(files: Record<string, FileState>, query: string): SearchHit[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const hits: SearchHit[] = [];
  for (const [path, state] of Object.entries(files)) {
    const lines = state.content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().includes(q)) {
        hits.push({ filePath: path, lineNumber: i + 1, lineContent: lines[i] });
      }
    }
  }
  return hits;
}
