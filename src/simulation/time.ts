export function formatInGameTime(sec: number): string {
  const mm = Math.floor(sec / 60);
  const ss = sec % 60;
  return `00:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}
