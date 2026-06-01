import type {
  Scenario,
  LogEntry,
  NetworkFlow,
  AlertEntry,
  RuntimeDbRecord,
} from "@/scenario.types";

export interface SimulationIds {
  nextLogId: () => string;
  nextAlertId: () => string;
  nextFlowId: () => string;
}

export interface SimulationRuntime {
  elapsedSeconds: number;
  logs: LogEntry[];
  networkFlows: NetworkFlow[];
  activeAlerts: AlertEntry[];
  blockedIPs: Set<string>;
  revokedTokens: Set<string>;
  resourceValues: Map<string, string | null>;
  usedAttackerIps: string[];
  deletedXssEntries: Set<string>;
  runtimeDbRecords: Map<string, RuntimeDbRecord[]>;
  deletedDbRecords: Map<string, Set<string>>;
  nextDbRecordId: number;

  attackerActiveStepId: string;
  stepReachedIds: Set<string>;
  patchedRuleIds: Set<string>;
  stepBlockedUntil: Map<string, number>;
  stepFirstTriggerAt: number | null;
  stepActionsExecuted: boolean;
  stepPathsEmitted: number[] | null;
  stepCompletesAt: number | null;

  isGameOver: boolean;
  gameEndedWith: "victory" | "failure" | null;
  gameOverReason: string;
}

export function createInitialRuntime(scenario: Scenario): SimulationRuntime {
  return {
    elapsedSeconds: 0,
    logs: [],
    networkFlows: [],
    activeAlerts: [],
    blockedIPs: new Set(),
    revokedTokens: new Set(),
    resourceValues: new Map(
      scenario.simulation.resources.map((r) => [r.id, r.initial_value]),
    ),
    usedAttackerIps: scenario.simulation.resources
      .filter((r) => r.rotation_pool !== undefined)
      .map((r) => r.initial_value)
      .filter((v): v is string => v !== null),
    deletedXssEntries: new Set(),
    runtimeDbRecords: new Map(),
    deletedDbRecords: new Map(),
    nextDbRecordId: 1,
    attackerActiveStepId: "",
    stepReachedIds: new Set(),
    patchedRuleIds: new Set(),
    stepBlockedUntil: new Map(),
    stepFirstTriggerAt: null,
    stepActionsExecuted: false,
    stepPathsEmitted: null,
    stepCompletesAt: null,
    isGameOver: false,
    gameEndedWith: null,
    gameOverReason: "",
  };
}

export function createSimulationIds(
  runtime: SimulationRuntime,
): SimulationIds {
  let logN = runtime.logs.length;
  let alertN = runtime.activeAlerts.length;
  let flowN = runtime.networkFlows.length;
  return {
    nextLogId: () => `log-${++logN}`,
    nextAlertId: () => `alert-${++alertN}`,
    nextFlowId: () => `flow-${++flowN}`,
  };
}

export function cloneRuntime(runtime: SimulationRuntime): SimulationRuntime {
  return {
    ...runtime,
    logs: [...runtime.logs],
    networkFlows: [...runtime.networkFlows],
    activeAlerts: [...runtime.activeAlerts],
    blockedIPs: new Set(runtime.blockedIPs),
    revokedTokens: new Set(runtime.revokedTokens),
    resourceValues: new Map(runtime.resourceValues),
    usedAttackerIps: [...runtime.usedAttackerIps],
    deletedXssEntries: new Set(runtime.deletedXssEntries),
    runtimeDbRecords: new Map([...runtime.runtimeDbRecords].map(([k, v]) => [k, [...v]])),
    deletedDbRecords: new Map([...runtime.deletedDbRecords].map(([k, v]) => [k, new Set(v)])),
    nextDbRecordId: runtime.nextDbRecordId,
    stepReachedIds: new Set(runtime.stepReachedIds),
    patchedRuleIds: new Set(runtime.patchedRuleIds),
    stepBlockedUntil: new Map(runtime.stepBlockedUntil),
  };
}
