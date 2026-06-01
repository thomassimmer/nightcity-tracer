export interface MosaicLayout {
  cols: number;
  rows: number;
  hasVHandle: boolean;
  hasHHandle: boolean;
  colTracks: string;
  rowTracks: string;
}

export function computeMosaic(n: number, colRatio: number, rowRatio: number): MosaicLayout {
  const cols = n <= 1 ? 1 : n <= 4 ? 2 : 3;
  const rows = n === 0 ? 0 : Math.ceil(n / cols);
  const hasVHandle = cols === 2;
  const hasHHandle = rows === 2;

  const colTracks = cols === 1
    ? '1fr'
    : hasVHandle
    ? `${colRatio * 100}fr 8px ${(1 - colRatio) * 100}fr`
    : '1fr 1fr 1fr';

  const rowTracks = rows <= 1
    ? '1fr'
    : hasHHandle
    ? `${rowRatio * 100}fr 8px ${(1 - rowRatio) * 100}fr`
    : Array(rows).fill('1fr').join(' ');

  return { cols, rows, hasVHandle, hasHHandle, colTracks, rowTracks };
}

export function getPanelPos(
  index: number,
  cols: number,
  hasVHandle: boolean,
  hasHHandle: boolean,
): { gridColumn: string; gridRow: string } {
  const col = index % cols;
  const row = Math.floor(index / cols);
  const gridCol = hasVHandle ? (col === 0 ? 1 : 3) : col + 1;
  const gridRow = hasHHandle ? (row === 0 ? 1 : 3) : row + 1;
  return { gridColumn: String(gridCol), gridRow: String(gridRow) };
}
