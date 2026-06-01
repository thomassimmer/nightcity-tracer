import { BookOpen, ChevronRight } from "lucide-react";
import type { Scenario } from "@/scenario.types";

interface Props {
  scenario: Scenario;
  onSelect: (scenario: Scenario) => void;
}

export function TutorialBanner({ scenario, onSelect }: Props) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(scenario)}
      onKeyDown={(e) =>
        (e.key === "Enter" || e.key === " ") && onSelect(scenario)
      }
      className="tutorial-banner relative overflow-hidden rounded cursor-pointer group mb-8 mt-2 focus-visible:[outline:2px_solid_rgba(245,158,11,0.7)] focus-visible:[outline-offset:2px]"
      style={{
        background: "rgba(10, 8, 2, 0.85)",
        border: "1px solid rgba(245, 158, 11, 0.35)",
      }}
    >
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background: "linear-gradient(90deg, #f59e0b, transparent 60%)",
        }}
      />

      <div className="relative flex items-center justify-between px-6 py-5 gap-6">
        <div className="flex items-center gap-5 min-w-0">
          <div
            className="shrink-0 w-10 h-10 rounded flex items-center justify-center"
            style={{
              background: "rgba(245, 158, 11, 0.1)",
              border: "1px solid rgba(245, 158, 11, 0.3)",
            }}
          >
            <BookOpen size={18} style={{ color: "#f59e0b" }} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-[9px] font-mono font-bold tracking-widest px-1.5 py-0.5 rounded"
                style={{
                  color: "#f59e0b",
                  background: "rgba(245, 158, 11, 0.12)",
                  border: "1px solid rgba(245, 158, 11, 0.25)",
                }}
              >
                TUTORIAL
              </span>
              <span className="text-[9px] font-mono text-gray-600 tracking-widest">
                {scenario.tutorial!.steps.length} STEPS · BEGINNER
              </span>
            </div>
            <h3 className="text-sm font-bold font-header tracking-wide text-white truncate">
              {scenario.title}
            </h3>
            <p className="text-[11px] text-gray-500 font-mono mt-0.5 truncate">
              Learn the platform: panels, terminal, code patching, incident
              report.
            </p>
          </div>
        </div>

        <div
          className="shrink-0 flex items-center gap-2 font-mono text-xs font-bold transition-colors"
          style={{ color: "#f59e0b" }}
        >
          <span className="hidden sm:inline tracking-widest">
            START TUTORIAL
          </span>
          <ChevronRight
            size={16}
            className="group-hover:translate-x-0.5 transition-transform"
          />
        </div>
      </div>
    </div>
  );
}
