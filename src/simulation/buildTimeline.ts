import type { Scenario, LogEntry, AlertEntry, FileState, TerminalPanel } from "@/scenario.types";
import { createPRNG, createSequentialId } from "@/hooks/usePRNG";
import { advanceSecond } from "@/simulation/advanceSecond";
import {
  createInitialRuntime,
  cloneRuntime,
  type SimulationRuntime,
} from "@/simulation/runtimeState";
import { generateRandomIp } from "@/utils/attackerSimulation";
import type { UserAction, TerminalCommand } from "@/utils/saveState";
import { executeTerminalCommand, type TerminalLine } from "@/utils/terminalExec";

export interface BuildTimelineResult {
  logs: LogEntry[];
  alerts: AlertEntry[];
  runtime: SimulationRuntime;
  terminalLines: TerminalLine[];
}

function findXssInvalidatesResource(scenario: Scenario, key: string): string | null {
  for (const panel of scenario.panels) {
    if (panel.type !== "terminal") continue;
    for (const col of panel.config.db_collections ?? []) {
      for (const rec of col.records) {
        if (rec.xss_key === key && rec.invalidates_resource) {
          return rec.invalidates_resource;
        }
      }
    }
  }
  return null;
}

function applyUserActions(
  scenario: Scenario,
  runtime: SimulationRuntime,
  actions: UserAction[],
  sec: number,
  prng: () => number,
): SimulationRuntime {
  const relevant = actions.filter((a) => a.sec === sec);
  if (relevant.length === 0) return runtime;
  const next = cloneRuntime(runtime);
  for (const action of relevant) {
    if (action.type === "block_ip") {
      next.blockedIPs.add(action.ip);
      const ipResource = scenario.simulation.resources.find(
        (r) => next.resourceValues.get(r.id) === action.ip,
      );
      if (ipResource) {
        const pool = ipResource.rotation_pool;
        if (pool === "random") {
          const newIp = generateRandomIp(prng);
          next.resourceValues.set(ipResource.id, newIp);
          next.usedAttackerIps = [...next.usedAttackerIps, newIp];
        } else if (Array.isArray(pool)) {
          const nextIp = pool.find((ip) => !next.blockedIPs.has(ip));
          next.resourceValues.set(ipResource.id, nextIp ?? null);
          if (nextIp) next.usedAttackerIps = [...next.usedAttackerIps, nextIp];
        } else {
          next.resourceValues.set(ipResource.id, null);
        }
      }
    } else if (action.type === "revoke_token") {
      const resource = scenario.simulation.resources.find(
        (r) => r.revocable && next.resourceValues.get(r.id) === action.token,
      );
      if (resource) {
        next.revokedTokens.add(action.token);
        next.resourceValues.set(resource.id, null);
      }
    } else if (action.type === "patch_rule") {
      next.patchedRuleIds.add(action.ruleId);
      for (const resId of action.invalidates_resources ?? []) {
        next.resourceValues.set(resId, null);
      }
    } else if (action.type === "delete_xss") {
      next.deletedXssEntries.add(action.key);
      const resourceId = findXssInvalidatesResource(scenario, action.key);
      if (resourceId) next.resourceValues.set(resourceId, null);
    } else if (action.type === "delete_db_record") {
      const existing = next.deletedDbRecords.get(action.collection) ?? new Set<string>();
      next.deletedDbRecords.set(action.collection, new Set([...existing, action.id]));
      if (action.invalidates_resource) {
        next.resourceValues.set(action.invalidates_resource, null);
      }
    }
  }
  return next;
}

export function buildTimeline(
  scenario: Scenario,
  prng: () => number,
  durationSeconds: number,
  collectAlerts = false,
  userActions: UserAction[] = [],
  terminalCommands?: TerminalCommand[],
  virtualFiles?: Record<string, FileState>,
): BuildTimelineResult {
  let runtime = createInitialRuntime(scenario);
  const ids = {
    nextLogId: createSequentialId("log"),
    nextAlertId: createSequentialId("alert"),
    nextFlowId: createSequentialId("flow"),
  };
  const terminalLines: TerminalLine[] = [];

  const terminalPanel = terminalCommands?.length
    ? (scenario.panels.find((p): p is TerminalPanel => p.type === 'terminal'))
    : undefined;

  for (let sec = 1; sec <= durationSeconds; sec++) {
    runtime = applyUserActions(scenario, runtime, userActions, sec, prng);
    runtime = advanceSecond(scenario, runtime, sec, prng, ids, { collectAlerts });

    if (terminalPanel && virtualFiles) {
      for (const { command } of terminalCommands!.filter(c => c.sec === sec)) {
        terminalLines.push(...executeTerminalCommand(command, terminalPanel.config, runtime, virtualFiles));
      }
    }
  }

  return {
    logs: runtime.logs,
    alerts: runtime.activeAlerts,
    runtime,
    terminalLines,
  };
}

export function replayTimeline(
  scenario: Scenario,
  prng: () => number,
  upToSeconds: number,
  userActions: UserAction[] = [],
  terminalCommands?: TerminalCommand[],
  virtualFiles?: Record<string, FileState>,
): BuildTimelineResult {
  return buildTimeline(scenario, prng, upToSeconds, false, userActions, terminalCommands, virtualFiles);
}

export function preGeneratePostmortemSimulation(
  scenario: Scenario,
  seed: string,
): BuildTimelineResult {
  return buildTimeline(
    scenario,
    createPRNG(seed),
    scenario.gameplay.duration_seconds,
    true,
  );
}
