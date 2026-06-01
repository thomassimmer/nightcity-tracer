import type { Scenario } from "@/scenario.types";
import { emitNoiseForSecond } from "@/simulation/noise";
import { runAttackerStep } from "@/simulation/attackerStep";
import {
  cloneRuntime,
  type SimulationRuntime,
  type SimulationIds,
} from "@/simulation/runtimeState";

export interface AdvanceSecondOptions {
  collectAlerts?: boolean;
}

export function advanceSecond(
  scenario: Scenario,
  runtime: SimulationRuntime,
  sec: number,
  prng: () => number,
  ids: SimulationIds,
  options: AdvanceSecondOptions = {},
): SimulationRuntime {
  const collectAlerts = options.collectAlerts ?? false;
  const next = cloneRuntime(runtime);

  if (
    sec >= scenario.gameplay.duration_seconds &&
    scenario.gameplay.mode !== "postmortem" &&
    !next.isGameOver
  ) {
    const gameOverAction = scenario.simulation.attacker_agent?.game_over_action;
    return {
      ...next,
      elapsedSeconds: sec,
      isGameOver: true,
      gameEndedWith: "failure",
      gameOverReason:
        gameOverAction?.reason ??
        "Time limits exceeded. The target megacorp network was completely compromised.",
    };
  }

  const noise = emitNoiseForSecond(
    scenario.simulation.noise_generators,
    sec,
    prng,
    next.blockedIPs,
    ids.nextLogId,
  );
  next.logs.push(...noise.logs);

  const attacker = runAttackerStep(scenario, next, {
    sec,
    prng,
    collectAlerts,
    nextLogId: ids.nextLogId,
    nextAlertId: ids.nextAlertId,
    nextFlowId: ids.nextFlowId,
  });

  next.logs.push(...attacker.logs);
  next.networkFlows = attacker.networkFlows;
  if (collectAlerts) {
    next.activeAlerts.push(...attacker.alerts);
  }

  for (const pending of [...noise.newDbRecords, ...attacker.newDbRecords]) {
    const id = `dyn-${next.nextDbRecordId++}`;
    const record = { ...pending, id };
    const existing = next.runtimeDbRecords.get(pending.collection) ?? [];
    next.runtimeDbRecords.set(pending.collection, [...existing, record]);
  }

  Object.assign(next, attacker.runtime);
  next.elapsedSeconds = sec;

  return next;
}
