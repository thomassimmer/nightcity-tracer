import { Radio, Shield, RotateCcw, CheckCircle } from "lucide-react";
import type { Scenario } from "@/scenario.types";
import type { SavedState, CompletedState } from "@/utils/saveState";
import { formatElapsed } from "@/utils/saveState";

function difficultyColor(diff: string): string {
  if (diff === "beginner") return "text-cyan-400 border-cyan-500/35 bg-cyan-950/20";
  if (diff === "intermediate") return "text-orange-400 border-orange-500/35 bg-orange-950/20";
  return "text-red-500 border-red-500/35 bg-red-950/20";
}

function corpHoverColor(theme: string): string {
  if (theme === "arasaka") return "hover:border-red-500/50";
  if (theme === "militech") return "hover:border-blue-500/50";
  if (theme === "trauma_team") return "hover:border-green-500/50";
  if (theme === "fixer") return "hover:border-lime-400/50";
  return "hover:border-cyan-500/50";
}

interface Props {
  sc: Scenario;
  save: SavedState | undefined;
  completion: CompletedState | undefined;
  onSelectScenario: (scenario: Scenario) => void;
  onResume: (scenarioId: string) => void;
}

export function ScenarioCard({ sc, save, completion, onSelectScenario, onResume }: Props) {
  const isLive = sc.gameplay.mode === "live";
  const cardBaseClass = `cyber-panel p-5 flex flex-col justify-between transition-transform ${corpHoverColor(sc.world.ui_theme)}`;

  const header = (
    <>
      <div className="flex justify-between items-center mb-3">
        <span className="text-[10px] uppercase font-mono tracking-widest text-gray-500">
          {sc.world.corporation}
        </span>
        <div className="flex items-center gap-1.5">
          {completion && (
            <div className="flex items-center gap-1 px-2 py-0.5 border text-[9px] font-mono rounded border-green-500/50 text-green-400 bg-green-950/20">
              <CheckCircle size={9} />
              <span>{completion.total}/100</span>
            </div>
          )}
          <div
            className={`flex items-center gap-1 px-2 py-0.5 border text-[9px] font-mono rounded ${
              isLive
                ? "border-red-500/50 text-red-500 animate-pulse bg-red-950/20"
                : "border-purple-500/50 text-purple-400 bg-purple-950/20"
            }`}
          >
            {isLive ? <Radio size={10} /> : <Shield size={10} />}
            <span>{isLive ? "LIVE" : "POST-MORTEM"}</span>
          </div>
        </div>
      </div>

      <h3 className="text-base font-bold font-header tracking-wide mb-2 text-white">
        {sc.title}
      </h3>

      <div className="flex items-center gap-2 mb-3">
        <span
          className={`text-[8.5px] uppercase font-mono px-2 py-0.5 border rounded ${difficultyColor(sc.gameplay.difficulty)}`}
        >
          {sc.gameplay.difficulty}
        </span>
        <span className="text-[9.5px] text-gray-500 font-mono">
          {Math.floor(sc.gameplay.duration_seconds / 60)}m
        </span>
      </div>

      <p className="text-[11.5px] text-gray-400 line-clamp-3 mb-4 leading-relaxed">
        {sc.world.briefing.body}
      </p>
    </>
  );

  const tags = (
    <div className="flex flex-wrap gap-1.5">
      {sc.tags.map((tag) => (
        <span
          key={tag}
          className="text-[9px] font-mono bg-black/40 text-cyan-400/80 px-2 py-0.5 rounded"
        >
          #{tag}
        </span>
      ))}
    </div>
  );

  if (save) {
    return (
      <div className={cardBaseClass}>
        <div>{header}</div>
        <div className="mt-auto">
          <div className="pb-3">{tags}</div>
          <div className="flex items-center gap-2 pt-3 border-t border-theme-border">
            <button
              onClick={() => onResume(sc.id)}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-mono font-bold tracking-wider cursor-pointer border transition-colors"
              style={{
                color: "#22c55e",
                borderColor: "rgba(34,197,94,0.40)",
                background: "rgba(34,197,94,0.08)",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(34,197,94,0.15)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "rgba(34,197,94,0.08)")
              }
            >
              <RotateCcw size={11} />
              RESUME · T+{formatElapsed(save.elapsedSeconds)}
            </button>
            <button
              onClick={() => onSelectScenario(sc)}
              className="flex items-center justify-center px-3 py-1.5 rounded text-[10px] font-mono cursor-pointer border border-white/10 text-gray-500 hover:text-gray-300 hover:border-white/20 transition-colors"
            >
              New game
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelectScenario(sc)}
      onKeyDown={(e) =>
        (e.key === "Enter" || e.key === " ") && onSelectScenario(sc)
      }
      className={`${cardBaseClass} cursor-pointer hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-theme-primary focus-visible:ring-offset-2 focus-visible:ring-offset-dark-main`}
    >
      <div>{header}</div>
      <div className="mt-auto pt-4 border-t border-theme-border">
        {tags}
      </div>
    </div>
  );
}
