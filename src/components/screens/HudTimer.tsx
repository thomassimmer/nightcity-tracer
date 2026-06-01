import { useSimulationStore } from '@/store/useSimulationStore';

export function HudTimer() {
  const { elapsedSeconds, scenario } = useSimulationStore();
  const total = scenario?.gameplay.duration_seconds ?? 900;
  const remaining = Math.max(0, total - elapsedSeconds);
  const pct = remaining / total;

  const mm = Math.floor(remaining / 60);
  const ss = remaining % 60;
  const label = `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  const color =
    pct > 0.15
      ? "text-gray-600"
      : "text-red-500";

  return (
    <div
      className={`font-mono text-xs tabular-nums ${color} ${pct <= 0.15 ? "animate-pulse" : ""}`}
    >
      {label}
    </div>
  );
}
