import { useEffect } from "react";
import { BookOpen, ChevronRight, GripHorizontal } from "lucide-react";
import type { TutorialStep } from "@/scenario.types";
import { useDraggable } from "@/hooks/useDraggable";

interface TutorialOverlayProps {
  step: TutorialStep;
  stepIndex: number;
  totalSteps: number;
  onAdvance: () => void;
  onGoBack: () => void;
  onSkip: () => void;
  isRevisiting: boolean;
}

export function TutorialOverlay({
  step,
  stepIndex,
  totalSteps,
  onAdvance,
  onGoBack,
  onSkip,
  isRevisiting,
}: TutorialOverlayProps) {
  const W = 340;

  const { pos, setPos, handleMouseDown } = useDraggable(W, 16, 80);

  useEffect(() => {
    setPos({
      x: step.position === "right" ? window.innerWidth - W - 16 : 16,
      y: 80,
    });
  }, [step.id, step.position, setPos]);

  useEffect(() => {
    if (!step.highlight) return;
    const el = document.querySelector(`[data-tutorial-id="${step.highlight}"]`);
    if (!el) return;
    el.classList.add("tutorial-highlight");
    return () => el.classList.remove("tutorial-highlight");
  }, [step.highlight]);

  return (
    <div
      className="z-40"
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        width: W,
        pointerEvents: "none",
      }}
    >
      <div
        className="relative overflow-hidden rounded"
        style={{
          background: "rgba(10, 8, 2, 0.92)",
          border: "1px solid rgba(245, 158, 11, 0.45)",
          backdropFilter: "blur(12px)",
          pointerEvents: "auto",
        }}
      >
        {/* Amber top bar */}
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{ background: "linear-gradient(90deg, #f59e0b, transparent)" }}
        />

        {/* Header / drag handle */}
        <div
          className="flex items-center justify-between px-3 py-2 border-b cursor-move select-none"
          style={{ borderColor: "rgba(245, 158, 11, 0.2)" }}
          onMouseDown={handleMouseDown}
        >
          <div
            className="flex items-center gap-2 font-header text-xs font-bold tracking-widest"
            style={{ color: "#f59e0b" }}
          >
            <BookOpen size={11} />
            <span>
              TUTORIAL {stepIndex + 1}/{totalSteps}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <GripHorizontal
              size={11}
              style={{ color: "rgba(245, 158, 11, 0.4)" }}
            />
            <button
              onClick={onSkip}
              onMouseDown={(e) => e.stopPropagation()}
              className="text-[10px] font-mono tracking-widest transition-colors"
              style={{ color: "rgba(156, 163, 175, 0.6)" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = "rgba(156, 163, 175, 1)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "rgba(156, 163, 175, 0.6)")
              }
            >
              SKIP
            </button>
          </div>
        </div>

        {/* Message */}
        <div className="flex items-start gap-3 px-4 py-3">
          <ChevronRight
            size={13}
            className="shrink-0 mt-0.5 animate-pulse"
            style={{ color: "#f59e0b" }}
          />
          <p
            className="text-xs leading-relaxed min-w-0"
            style={{ color: "#e5e7eb", whiteSpace: "pre-wrap", overflowWrap: "break-word" }}
          >
            {step.message}
          </p>
        </div>

        {/* Navigation footer */}
        <div className="px-4 pb-3 flex items-center justify-between">
          <button
            onClick={onGoBack}
            onMouseDown={(e) => e.stopPropagation()}
            disabled={stepIndex === 0}
            className="tutorial-btn tutorial-btn--left font-mono text-xs font-bold tracking-widest px-3 py-1 transition-all"
          >
            ←
          </button>
          {(step.completed_by.type === "auto" || isRevisiting) && (
            <button
              onClick={onAdvance}
              onMouseDown={(e) => e.stopPropagation()}
              className="tutorial-btn font-mono text-xs font-bold tracking-widest px-3 py-1 transition-all"
              style={{
                color: "#0a0800",
                background: "#f59e0b",
                border: "1px solid #f59e0b",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "#fcd34d")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "#f59e0b")
              }
            >
              {isRevisiting ? "GO" : "OK"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
