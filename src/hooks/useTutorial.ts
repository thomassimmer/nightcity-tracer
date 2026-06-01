import { useState, useRef, useEffect, useCallback } from 'react';
import { useSimulationStore } from '@/store/useSimulationStore';
import type { TutorialStep } from '@/scenario.types';

const tutorialStepKey = (scenarioId: string) => `nightcity-tutorial-step-${scenarioId}`;

interface UseTutorialReturn {
  currentTutorialStep: TutorialStep | null;
  tutorialStepIdx: number;
  tutorialSteps: TutorialStep[];
  isRevisiting: boolean;
  advanceTutorial: () => void;
  goBackTutorial: () => void;
  skipTutorial: () => void;
  onTerminalCommand: (cmd: string) => void;
}

export function useTutorial(openIds: string[]): UseTutorialReturn {
  const { scenario, isGameOver, virtualFiles } = useSimulationStore();

  const tutorialConfig = scenario?.tutorial;
  const tutorialSteps = tutorialConfig?.steps ?? [];

  const [tutorialStepIdx, setTutorialStepIdx] = useState(() => {
    if (!scenario?.tutorial || !scenario?.id) return 0;
    const stored = localStorage.getItem(tutorialStepKey(scenario.id));
    return stored ? Math.max(0, parseInt(stored, 10)) : 0;
  });

  const [maxTutorialStepIdx, setMaxTutorialStepIdx] = useState(() => {
    if (!scenario?.tutorial || !scenario?.id) return 0;
    const stored = localStorage.getItem(tutorialStepKey(scenario.id));
    return stored ? Math.max(0, parseInt(stored, 10)) : 0;
  });

  const currentTutorialStep = tutorialConfig ? (tutorialSteps[tutorialStepIdx] ?? null) : null;
  const isRevisiting = tutorialStepIdx < maxTutorialStepIdx;

  const advanceTutorial = useCallback(() => {
    setTutorialStepIdx(prev => {
      const next = prev + 1;
      setMaxTutorialStepIdx(m => Math.max(m, next));
      return next;
    });
  }, []);

  const goBackTutorial = useCallback(() => {
    setTutorialStepIdx(prev => Math.max(0, prev - 1));
  }, []);

  const skipTutorial = useCallback(() => {
    setTutorialStepIdx(tutorialSteps.length);
    setMaxTutorialStepIdx(tutorialSteps.length);
  }, [tutorialSteps.length]);

  const onTerminalCommand = useCallback((cmd: string) => {
    if (isRevisiting) return;
    const trigger = currentTutorialStep?.completed_by;
    if (!trigger) return;
    if (trigger.type === 'terminal_used') advanceTutorial();
    if (trigger.type === 'terminal_command' && cmd.trimStart().startsWith(trigger.command)) advanceTutorial();
  }, [currentTutorialStep, advanceTutorial, isRevisiting]);

  // Persist progress
  useEffect(() => {
    if (!scenario?.tutorial || !scenario?.id) return;
    if (maxTutorialStepIdx > 0 && maxTutorialStepIdx < tutorialSteps.length) {
      localStorage.setItem(tutorialStepKey(scenario.id), String(maxTutorialStepIdx));
    } else {
      localStorage.removeItem(tutorialStepKey(scenario.id));
    }
  }, [maxTutorialStepIdx, scenario?.id, scenario?.tutorial, tutorialSteps.length]);

  // Reset on scenario change (not on initial mount)
  const mountedScenarioId = useRef(scenario?.id);
  useEffect(() => {
    if (scenario?.id === mountedScenarioId.current) return;
    mountedScenarioId.current = scenario?.id;
    setTutorialStepIdx(0);
    setMaxTutorialStepIdx(0);
  }, [scenario?.id]);

  // Trigger: panel_open
  useEffect(() => {
    if (!currentTutorialStep || isRevisiting) return;
    const trigger = currentTutorialStep.completed_by;
    if (trigger.type !== 'panel_open') return;
    if (openIds.includes(trigger.panel_id)) advanceTutorial();
  }, [openIds, currentTutorialStep, advanceTutorial, isRevisiting]);

  // Trigger: report_submitted
  useEffect(() => {
    if (!currentTutorialStep || isRevisiting) return;
    if (currentTutorialStep.completed_by.type !== 'report_submitted') return;
    if (isGameOver) advanceTutorial();
  }, [isGameOver, currentTutorialStep, advanceTutorial, isRevisiting]);

  // Trigger: code_patched
  const totalPatchedCount = Object.values(virtualFiles).reduce(
    (sum, f) => sum + f.patchedRuleIds.length,
    0,
  );
  const prevPatchedRef = useRef(0);
  useEffect(() => {
    if (!currentTutorialStep || currentTutorialStep.completed_by.type !== 'code_patched') {
      prevPatchedRef.current = totalPatchedCount;
      return;
    }
    if (!isRevisiting && totalPatchedCount > prevPatchedRef.current) advanceTutorial();
    prevPatchedRef.current = totalPatchedCount;
  }, [totalPatchedCount, currentTutorialStep, advanceTutorial, isRevisiting]);

  return {
    currentTutorialStep,
    tutorialStepIdx,
    tutorialSteps,
    isRevisiting,
    advanceTutorial,
    goBackTutorial,
    skipTutorial,
    onTerminalCommand,
  };
}
