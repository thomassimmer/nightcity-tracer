import { useState, useEffect, useCallback, useRef } from "react";
import { useSimulationStore } from "@/store/useSimulationStore";
import { Welcome } from "@/components/screens/Welcome";
import { Briefing } from "@/components/screens/Briefing";
import { ForensicHUD } from "@/components/screens/ForensicHUD";
import type { Scenario } from "@/scenario.types";
import {
  listAllSaves,
  listAllCompletions,
  clearSave,
  clearTutorialStep,
  type SavedState,
  type CompletedState,
} from "@/utils/saveState";

import { SCENARIOS } from "@/scenarios";

type Phase = "menu" | "briefing" | "hud";
type OverlayState = "hidden" | "in" | "out";

function loadValidSaves(): Record<string, SavedState> {
  const scenarioIds = new Set(SCENARIOS.map((s) => s.id));
  const result: Record<string, SavedState> = {};
  listAllSaves().forEach((save) => {
    if (scenarioIds.has(save.scenarioId)) {
      result[save.scenarioId] = save;
    } else {
      clearSave(save.scenarioId);
    }
  });
  return result;
}

function loadValidCompletions(): Record<string, CompletedState> {
  const scenarioIds = new Set(SCENARIOS.map((s) => s.id));
  const result: Record<string, CompletedState> = {};
  listAllCompletions().forEach((c) => {
    if (scenarioIds.has(c.scenarioId)) {
      result[c.scenarioId] = c;
    }
  });
  return result;
}

export default function App() {
  const isActive = useSimulationStore((state) => state.isActive);
  const isPlaying = useSimulationStore((state) => state.isPlaying);
  const scenario = useSimulationStore((state) => state.scenario);
  const startSimulation = useSimulationStore((state) => state.startSimulation);
  const stopSimulation = useSimulationStore((state) => state.stopSimulation);
  const restoreSimulation = useSimulationStore((state) => state.restoreSimulation);
  const tick = useSimulationStore((state) => state.tick);
  const resumeSimulation = useSimulationStore((state) => state.resumeSimulation);

  const [phase, setPhase] = useState<Phase>("menu");
  const [overlayState, setOverlayState] = useState<OverlayState>("hidden");
  const [savedStates, setSavedStates] = useState<Record<string, SavedState>>(
    () => loadValidSaves(),
  );
  const [completions, setCompletions] = useState<Record<string, CompletedState>>(
    () => loadValidCompletions(),
  );
  const transitionTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Main 1-second simulation clock loop
  useEffect(() => {
    if (!isActive || !isPlaying || !scenario) return;
    const interval = setInterval(() => {
      tick();
    }, 1000);
    return () => clearInterval(interval);
  }, [isActive, isPlaying, scenario, tick]);

  // Timers live in a ref (not state), so React won't clean them up on unmount
  useEffect(() => {
    return () => {
      transitionTimers.current.forEach(clearTimeout);
    };
  }, []);

  const transitionTo = useCallback(
    (newPhase: Phase, onSwitch?: () => void) => {
      transitionTimers.current.forEach(clearTimeout);
      setOverlayState("in");
      const t1 = setTimeout(() => {
        onSwitch?.();
        setPhase(newPhase);
        setOverlayState("out");
      }, 220);
      const t2 = setTimeout(() => {
        setOverlayState("hidden");
      }, 500);
      transitionTimers.current = [t1, t2];
    },
    [],
  );

  // Refresh the menu's save/completion lists each time a game session ends
  useEffect(() => {
    if (!isActive) {
      setSavedStates(loadValidSaves());
      setCompletions(loadValidCompletions());
    }
  }, [isActive]);

  const handleSelectScenario = (sc: Scenario) => {
    clearSave(sc.id);
    clearTutorialStep(sc.id);
    setSavedStates((prev) => {
      const { [sc.id]: _, ...rest } = prev;
      return rest;
    });
    const urlSeed = new URLSearchParams(window.location.search).get("seed") ?? undefined;
    transitionTo("briefing", () => startSimulation(sc, urlSeed));
  };

  const handleInitialize = () => {
    resumeSimulation();
    transitionTo("hud");
  };

  const handleReturn = () => {
    transitionTo("menu", () => {
      if (scenario?.tutorial?.enabled) {
        localStorage.setItem("nc_tutorial_done", "1");
      }
      if (scenario?.id) clearTutorialStep(scenario.id);
      stopSimulation();
    });
  };

  const handleRetry = () => {
    if (!scenario) return;
    const sc = scenario;
    transitionTo("briefing", () => startSimulation(sc));
  };

  const handleResume = (scenarioId: string) => {
    const save = savedStates[scenarioId];
    const sc = SCENARIOS.find((s) => s.id === scenarioId);
    if (!save || !sc) return;
    transitionTo("hud", () => {
      restoreSimulation(save, sc);
      setSavedStates((prev) => {
        const { [scenarioId]: _, ...rest } = prev;
        return rest;
      });
    });
  };

  const themeClass = scenario ? `theme-${scenario.world.ui_theme}` : "";

  return (
    <div className={themeClass}>
      {phase === "menu" && (
        <Welcome
          scenarios={SCENARIOS}
          savedStates={savedStates}
          completions={completions}
          onSelectScenario={handleSelectScenario}
          onResume={handleResume}
        />
      )}
      {phase === "briefing" && <Briefing onInitialize={handleInitialize} />}
      {phase === "hud" && (
        <ForensicHUD onReturn={handleReturn} onRetry={handleRetry} />
      )}
      {overlayState !== "hidden" && (
        <div className={`phase-overlay phase-overlay--${overlayState}`} />
      )}
    </div>
  );
}
