export type DiffOp = { type: 'same' | 'add' | 'remove'; line: string };

export function computeDiff(original: string, modified: string): DiffOp[] {
  const a = original.split('\n');
  const b = modified.split('\n');
  const m = a.length;
  const n = b.length;

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
      else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  const result: DiffOp[] = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      result.unshift({ type: 'same', line: a[i - 1] }); i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: 'add', line: b[j - 1] }); j--;
    } else {
      result.unshift({ type: 'remove', line: a[i - 1] }); i--;
    }
  }
  return result;
}

export function isRawPatch(content: string): boolean {
  const first = content.trimStart().slice(0, 4);
  return first === '--- ' || first === 'diff';
}

export function parseRawPatch(content: string): DiffOp[] {
  return content.split('\n').map((line) => {
    if (line.startsWith('+') && !line.startsWith('+++')) return { type: 'add' as const, line: line.slice(1) };
    if (line.startsWith('-') && !line.startsWith('---')) return { type: 'remove' as const, line: line.slice(1) };
    return { type: 'same' as const, line };
  });
}
