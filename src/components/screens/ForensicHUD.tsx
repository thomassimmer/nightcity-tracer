import { useState, useEffect, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import { FileText, ChevronRight, HelpCircle, Radio, House } from "lucide-react";
import { useSimulationStore } from '@/store/useSimulationStore';
import { HudTimer } from "@/components/screens/HudTimer";

import { ResizeHandle } from "@/components/ui/ResizeHandle";
import { PanelBar } from "@/components/PanelBar";
import { TutorialOverlay } from "@/components/modals/TutorialOverlay";
import { NotificationCenter } from "@/components/modals/NotificationCenter";
import { HelpModal, HELP_STORAGE_KEY } from "@/components/modals/HelpModal";
import { BriefingModal } from "@/components/modals/BriefingModal";
import { IncidentReportDrawer } from "@/components/modals/IncidentReportDrawer";
import { SortablePanelCell } from "@/components/SortablePanelCell";
import { usePanelManager } from "@/hooks/usePanelManager";
import { useTutorial } from "@/hooks/useTutorial";
import { useResizableGrid } from "@/hooks/useResizableGrid";
import { computeMosaic, getPanelPos } from "@/utils/gridLayout";

// ─── ForensicHUD ──────────────────────────────────────────────────────────────

interface HUDProps {
  onReturn: () => void;
  onRetry: () => void;
}

export function ForensicHUD({ onReturn, onRetry }: HUDProps) {
  const {
    scenario,
    elapsedSeconds,
    isGameOver,
    gameEndedWith,
    gameOverReason,
    reportAnswers,
    updateReportDraft,
  } = useSimulationStore();

  const [reportOpen, setReportOpen] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const [briefingOpen, setBriefingOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(
    () => !localStorage.getItem(HELP_STORAGE_KEY),
  );

  const { colRatio, rowRatio, isDragging, containerRef, startDrag } = useResizableGrid(scenario?.id);

  const closeHelp = useCallback(() => {
    localStorage.setItem(HELP_STORAGE_KEY, "1");
    setShowHelp(false);
  }, []);

  const toggleHelp = useCallback(() => {
    setShowHelp((v) => {
      if (v) localStorage.setItem(HELP_STORAGE_KEY, "1");
      return !v;
    });
  }, []);

  const pm = usePanelManager(scenario?.panels ?? [], toggleHelp);

  const {
    currentTutorialStep,
    tutorialStepIdx,
    tutorialSteps,
    isRevisiting,
    advanceTutorial,
    goBackTutorial,
    skipTutorial,
    onTerminalCommand,
  } = useTutorial(pm.openIds);

  // Flash overlay then auto-open debrief drawer on game over
  useEffect(() => {
    if (!isGameOver) return;
    setShowFlash(true);
    const t = setTimeout(() => {
      setShowFlash(false);
      setReportOpen(true);
    }, 2500);
    return () => clearTimeout(t);
  }, [isGameOver]);

  // Keyboard shortcuts: B=briefing, N=notifications, F=report, Esc=close help, arrows=tutorial nav
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "b" || e.key === "B") setBriefingOpen((v) => !v);
      if (e.key === "n" || e.key === "N") setNotifOpen((v) => !v);
      if (e.key === "f" || e.key === "F") setReportOpen((v) => !v);
      if (e.key === "Escape") closeHelp();
      if (currentTutorialStep && e.key === "ArrowLeft") goBackTutorial();
      if (
        currentTutorialStep &&
        e.key === "ArrowRight" &&
        (isRevisiting || currentTutorialStep.completed_by.type === "auto")
      )
        advanceTutorial();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    closeHelp,
    currentTutorialStep,
    goBackTutorial,
    advanceTutorial,
    isRevisiting,
  ]);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id)
      pm.reorder(String(active.id), String(over.id));
  };

  if (!scenario) return null;

  const total = scenario.gameplay.duration_seconds;
  const remaining = Math.max(0, total - elapsedSeconds);
  const isAlarm = !isGameOver && remaining / total <= 0.15;

  const { cols, hasVHandle, hasHHandle, colTracks, rowTracks } = computeMosaic(
    pm.openIds.length,
    colRatio,
    rowRatio,
  );

  const panelsById = Object.fromEntries(scenario.panels.map((p) => [p.id, p]));

  return (
    <div
      className={`flex flex-col h-screen overflow-hidden ${isAlarm ? "alarm-active" : ""} ${
        isDragging === "col"
          ? "cursor-col-resize"
          : isDragging === "row"
            ? "cursor-row-resize"
            : ""
      }`}
    >
      <header className="flex items-center px-4 py-2 border-b border-theme-border bg-black/50 shrink-0">
        <button
          onClick={onReturn}
          title="Return to menu"
          className="flex items-center justify-center mr-3 text-gray-500 border border-gray-700 p-1 rounded hover:border-theme-primary hover:text-theme-primary transition-all shrink-0"
        >
          <House size={14} />
        </button>
        <div className="flex-1 min-w-0 truncate font-mono text-xs text-gray-500">
          <span className="text-neon font-bold">
            {scenario.world.corporation}
          </span>
          <span className="mx-2 text-gray-700">|</span>
          <span>{scenario.title}</span>
          <span className="mx-2 text-gray-700">|</span>
          <span className="text-gray-600">{scenario.world.player_role}</span>
        </div>

        {scenario.gameplay.mode !== "postmortem" && <HudTimer />}
        <div className="flex-1 flex items-center justify-end gap-2">
          <NotificationCenter
            open={notifOpen}
            onOpen={() => setNotifOpen(true)}
            onClose={() => setNotifOpen(false)}
          />
          <button
            data-tutorial-id="handbook-btn"
            onClick={toggleHelp}
            title="Handbook [?]"
            className="flex items-center gap-1.5 text-xs font-mono text-gray-400 border border-gray-700 px-2 py-1 rounded hover:border-theme-primary hover:text-theme-primary transition-all"
          >
            <HelpCircle size={12} />
          </button>
          <button
            data-tutorial-id="briefing-btn"
            onClick={() => setBriefingOpen(true)}
            title="Briefing [B]"
            className="flex items-center gap-1.5 text-xs font-mono text-gray-400 border border-gray-700 px-3 py-1 rounded hover:border-theme-primary hover:text-theme-primary transition-all"
          >
            <Radio size={12} />
            <span>BRIEFING</span>
          </button>
          <button
            data-tutorial-id="report-btn"
            onClick={() => setReportOpen(true)}
            title="File Report [F]"
            className="flex items-center gap-1.5 text-xs font-mono font-bold text-theme-primary text-shadow-[0_0_5px_var(--color-theme-glow)] border border-theme-primary px-3 py-1 rounded hover:bg-theme-primary hover:text-black hover:[text-shadow:none] transition-all"
          >
            <FileText size={12} />
            <span>{isGameOver ? "VIEW RESULTS" : "FILE REPORT"}</span>
            <ChevronRight size={12} />
          </button>
        </div>
      </header>

      <div data-tutorial-id="panel-bar">
        <PanelBar panels={scenario.panels} manager={pm} />
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div
          ref={containerRef}
          className={`relative flex-1 overflow-hidden ${isDragging ? "select-none" : ""}`}
          style={{
            display: "grid",
            gridTemplateColumns: colTracks,
            gridTemplateRows: rowTracks,
            gap: hasVHandle || hasHHandle ? 0 : "6px",
          }}
        >
          <SortableContext items={pm.openIds} strategy={rectSortingStrategy}>
            {pm.openIds.map((id, index) => {
              const panel = panelsById[id];
              if (!panel) return null;
              const { gridColumn, gridRow } = getPanelPos(
                index,
                cols,
                hasVHandle,
                hasHHandle,
              );
              const isZoomed = pm.zoomedId === id;
              const isHidden = pm.zoomedId !== null && !isZoomed;
              return (
                <SortablePanelCell
                  key={id}
                  id={id}
                  panel={panel}
                  gridColumn={gridColumn}
                  gridRow={gridRow}
                  isActive={pm.activeId === id}
                  isZoomed={isZoomed}
                  isHidden={isHidden}
                  onZoom={() => pm.zoomPanel(id)}
                  onClose={() => pm.toggleOpen(id)}
                  onActivate={() => pm.setActive(id)}
                  onTerminalCommand={onTerminalCommand}
                />
              );
            })}
          </SortableContext>

          {hasVHandle && !pm.zoomedId && (
            <ResizeHandle
              axis="col"
              gridColumn="2"
              gridRow="1 / -1"
              onMouseDown={(e) => startDrag("col", e.clientX, colRatio)}
            />
          )}
          {hasHHandle && !pm.zoomedId && (
            <ResizeHandle
              axis="row"
              gridColumn="1 / -1"
              gridRow="2"
              onMouseDown={(e) => startDrag("row", e.clientY, rowRatio)}
            />
          )}
        </div>
      </DndContext>

      {currentTutorialStep && (
        <TutorialOverlay
          step={currentTutorialStep}
          stepIndex={tutorialStepIdx}
          totalSteps={tutorialSteps.length}
          onAdvance={advanceTutorial}
          onGoBack={goBackTutorial}
          onSkip={skipTutorial}
          isRevisiting={isRevisiting}
        />
      )}

      {showHelp && <HelpModal onClose={closeHelp} />}
      {briefingOpen && <BriefingModal onClose={() => setBriefingOpen(false)} />}
      {reportOpen && (
        <IncidentReportDrawer
          onClose={() => setReportOpen(false)}
          onReturn={onReturn}
          onRetry={onRetry}
          answers={reportAnswers}
          setAnswers={updateReportDraft}
          autoFill={currentTutorialStep?.id === "file-report"}
        />
      )}

      {showFlash && (
        <div className="fixed inset-0 z-100 flex flex-col items-center justify-center bg-black">
          <div className="cyber-grid-bg" />
          <div className="relative z-10 text-center">
            <div
              data-text={
                gameEndedWith === "victory"
                  ? "MISSION COMPLETE"
                  : "SYSTEM COMPROMISED"
              }
              className={`glitch-title text-6xl font-bold font-header tracking-widest ${gameEndedWith === "victory" ? "text-green-400" : "text-red-500"}`}
            >
              {gameEndedWith === "victory"
                ? "MISSION COMPLETE"
                : "SYSTEM COMPROMISED"}
            </div>
            <p className="font-mono text-sm text-gray-400 mt-3">
              {gameOverReason}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
