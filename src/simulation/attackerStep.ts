import type {
  Scenario,
  LogEntry,
  NetworkFlow,
  AlertEntry,
  AttackerStep,
  RuntimeDbRecord,
} from "@/scenario.types";
import { formatInGameTime } from "@/simulation/time";
import type { SimulationRuntime } from "@/simulation/runtimeState";
import { attackerActionDuration, generateRandomIp, generateRandomJwt, resolvePayload } from "@/utils/attackerSimulation";

export interface AttackerStepContext {
  sec: number;
  prng: () => number;
  collectAlerts: boolean;
  nextLogId: () => string;
  nextAlertId: () => string;
  nextFlowId: () => string;
}

export interface AttackerStepResult {
  logs: LogEntry[];
  networkFlows: NetworkFlow[];
  alerts: AlertEntry[];
  newDbRecords: Array<Omit<RuntimeDbRecord, 'id'>>;
  runtime: Pick<
    SimulationRuntime,
    | "attackerActiveStepId"
    | "stepReachedIds"
    | "stepBlockedUntil"
    | "resourceValues"
    | "usedAttackerIps"
    | "stepFirstTriggerAt"
    | "stepActionsExecuted"
    | "stepPathsEmitted"
    | "stepCompletesAt"
    | "isGameOver"
    | "gameEndedWith"
    | "gameOverReason"
  >;
}

function findActiveStep(
  steps: AttackerStep[],
  resourceValues: Map<string, string | null>,
  patchedRuleIds: Set<string>,
  stepReachedIds: Set<string>,
  stepBlockedUntil: Map<string, number>,
  sec: number,
): AttackerStep | null {
  let candidate: AttackerStep | null = null;
  for (const step of steps) {
    const resourcesOk = (step.requires?.resources ?? []).every(
      id => resourceValues.get(id) != null,
    );
    if (!resourcesOk) continue;

    const notPatchedOk = (step.requires?.not_patched ?? []).every(
      id => !patchedRuleIds.has(id),
    );
    if (!notPatchedOk) continue;

    const hasGenerates = (step.generates?.length ?? 0) > 0;
    const needsRun = hasGenerates
      ? step.generates!.some(id => resourceValues.get(id) == null)
      : !stepReachedIds.has(step.id);
    if (!needsRun) continue;

    const blockedUntil = stepBlockedUntil.get(step.id);
    if (blockedUntil !== undefined && sec < blockedUntil) continue;

    candidate = step;
  }
  return candidate;
}

export function runAttackerStep(
  scenario: Scenario,
  runtime: SimulationRuntime,
  ctx: AttackerStepContext,
): AttackerStepResult {
  const logs: LogEntry[] = [];
  const networkFlows = [...runtime.networkFlows];
  const alerts: AlertEntry[] = [];
  const newDbRecords: Array<Omit<RuntimeDbRecord, 'id'>> = [];

  let attackerActiveStepId = runtime.attackerActiveStepId;
  let stepReachedIds = new Set(runtime.stepReachedIds);
  let stepBlockedUntil = new Map(runtime.stepBlockedUntil);
  let resourceValues = new Map(runtime.resourceValues);
  let usedAttackerIps = runtime.usedAttackerIps;
  let stepFirstTriggerAt = runtime.stepFirstTriggerAt;
  let stepActionsExecuted = runtime.stepActionsExecuted;
  let stepPathsEmitted = runtime.stepPathsEmitted;
  let stepCompletesAt = runtime.stepCompletesAt;
  let isGameOver = runtime.isGameOver;
  let gameEndedWith = runtime.gameEndedWith;
  let gameOverReason = runtime.gameOverReason;

  const returnResult = () => ({
    logs,
    networkFlows,
    alerts,
    newDbRecords,
    runtime: {
      attackerActiveStepId,
      stepReachedIds,
      stepBlockedUntil,
      resourceValues,
      usedAttackerIps,
      stepFirstTriggerAt,
      stepActionsExecuted,
      stepPathsEmitted,
      stepCompletesAt,
      isGameOver,
      gameEndedWith,
      gameOverReason,
    },
  });

  if (!scenario.simulation.attacker_agent) return returnResult();

  const steps = scenario.simulation.attacker_agent.steps;

  const activeStep = findActiveStep(
    steps,
    resourceValues,
    runtime.patchedRuleIds,
    stepReachedIds,
    stepBlockedUntil,
    ctx.sec,
  );
  const activeStepId = activeStep?.id ?? "";

  if (activeStepId !== attackerActiveStepId) {
    attackerActiveStepId = activeStepId;
    stepFirstTriggerAt = null;
    stepActionsExecuted = false;
    stepPathsEmitted = null;
    stepCompletesAt = null;
  }

  if (!activeStep) return returnResult();

  if (stepFirstTriggerAt === null) {
    stepFirstTriggerAt = ctx.sec;
  }

  const delay = activeStep.delay ?? 0;
  if (ctx.sec < stepFirstTriggerAt + delay) return returnResult();

  const attackerIp = resourceValues.get("attacker_ip") ?? "";

  if (stepPathsEmitted === null) {
    stepPathsEmitted = new Array(activeStep.actions.length).fill(0) as number[];

    for (const action of activeStep.actions) {
      if (action.type === "notify_ui") {
        if (ctx.collectAlerts) {
          alerts.push({
            id: ctx.nextAlertId(),
            level: action.level,
            message: action.message,
            read: false,
            timestamp: Date.now(),
          });
        }
      } else if (action.type === "send_http_requests") {
        if (action.paths && (action.requests_per_second ?? 0) > 0) {
          // incremental emission handled below
        } else {
          const isBlocked = runtime.blockedIPs.has(attackerIp);
          const defaultStatus = isBlocked ? 403 : (action.status ?? 200);
          if (action.paths) {
            action.paths.forEach((p, idx) => {
              const entryStatus = isBlocked
                ? 403
                : (action.status_sequence?.[idx % (action.status_sequence?.length ?? 1)] ?? defaultStatus);
              const pl = resolvePayload(action.payloads?.[idx % (action.payloads?.length ?? 1)], attackerIp);
              logs.push({
                id: ctx.nextLogId(),
                timestamp: formatInGameTime(ctx.sec),
                ip: attackerIp,
                method: action.method || "GET",
                path: p,
                status: entryStatus,
                message: `${action.method || "GET"} ${p} - HTTP ${entryStatus}`,
                payload: pl,
                isAttacker: true,
                source: "access",
                db_connection: (action.use_db_connection && entryStatus < 300) ? action.use_db_connection : undefined,
              });
              if (action.emit_app_log) {
                const payloadStr = typeof pl === "string" ? pl : undefined;
                logs.push({
                  id: ctx.nextLogId(),
                  timestamp: formatInGameTime(ctx.sec),
                  ip: attackerIp,
                  method: "SYS",
                  path: "",
                  status: 0,
                  message: `[APP] ${attackerIp} ${action.method || "GET"} ${p} ${entryStatus}${action.use_stolen_cookie ? ` Authorization: Bearer ${action.use_stolen_cookie.startsWith("$") ? (resourceValues.get(action.use_stolen_cookie.slice(1)) ?? action.use_stolen_cookie) : action.use_stolen_cookie}` : ""}${payloadStr ? ` body=${payloadStr}` : ""}`,
                  isAttacker: true,
                  source: "app",
                });
              }
            });
          } else if (action.path && !((action.requests_per_second ?? 0) > 0 && action.duration)) {
            const count = Math.max(
              action.payloads?.length ?? 1,
              action.status_sequence?.length ?? 1,
            );
            for (let i = 0; i < count; i++) {
              const entryStatus = isBlocked
                ? 403
                : (action.status_sequence?.[i % (action.status_sequence?.length ?? 1)] ?? defaultStatus);
              const pl = resolvePayload(action.payloads?.[i % (action.payloads?.length ?? 1)], attackerIp);
              logs.push({
                id: ctx.nextLogId(),
                timestamp: formatInGameTime(ctx.sec),
                ip: attackerIp,
                method: action.method || "GET",
                path: action.path,
                status: entryStatus,
                message: `${action.method || "GET"} ${action.path} - HTTP ${entryStatus}`,
                payload: pl,
                isAttacker: true,
                source: "access",
                db_connection: (action.use_db_connection && entryStatus < 300) ? action.use_db_connection : undefined,
              });
              if (action.emit_app_log) {
                const payloadStr = typeof pl === "string" ? pl : undefined;
                logs.push({
                  id: ctx.nextLogId(),
                  timestamp: formatInGameTime(ctx.sec),
                  ip: attackerIp,
                  method: "SYS",
                  path: "",
                  status: 0,
                  message: `[APP] ${attackerIp} ${action.method || "GET"} ${action.path} ${entryStatus}${action.use_stolen_cookie ? ` Authorization: Bearer ${action.use_stolen_cookie.startsWith("$") ? (resourceValues.get(action.use_stolen_cookie.slice(1)) ?? action.use_stolen_cookie) : action.use_stolen_cookie}` : ""}${payloadStr ? ` body=${payloadStr}` : ""}`,
                  isAttacker: true,
                  source: "app",
                });
              }
            }
          }
        }
      } else if (action.type === "spawn_network_flow") {
        if (!runtime.blockedIPs.has(attackerIp)) {
          const exists = networkFlows.some(
            f => f.src === action.src && f.dst_port === action.dst_port,
          );
          if (!exists) {
            networkFlows.push({
              id: ctx.nextFlowId(),
              src: action.src,
              dst: action.dst === "$attacker_ip" ? attackerIp : action.dst,
              dst_port: action.dst_port,
              protocol: action.protocol,
              bytes_per_second: action.bytes_per_second,
            });
          }
        }
      } else if (action.type === "modify_file_integrity") {
        logs.push({
          id: ctx.nextLogId(),
          timestamp: formatInGameTime(ctx.sec),
          ip: "127.0.0.1",
          method: "SYS",
          path: "FILE_INTEGRITY",
          status: 200,
          message: `SECURITY MONITOR: File alteration detected [${action.modification_type}] at file path: [${action.file_path}]`,
        });
      } else if (action.type === "log_entry") {
        logs.push({
          id: ctx.nextLogId(),
          timestamp: formatInGameTime(ctx.sec),
          ip: attackerIp,
          method: "SYS",
          path: "",
          status: 0,
          message: action.message,
          isAttacker: true,
          source: action.source,
        });
      } else if (action.type === "game_over_failure") {
        isGameOver = true;
        gameEndedWith = "failure";
        gameOverReason = action.reason;
      }
    }
  }

  // Incremental path emission: emit requests_per_second paths per tick
  for (let ai = 0; ai < activeStep.actions.length; ai++) {
    const action = activeStep.actions[ai];
    if (
      action.type === "send_http_requests" &&
      action.paths &&
      (action.requests_per_second ?? 0) > 0
    ) {
      const isBlocked = runtime.blockedIPs.has(attackerIp);
      const defaultStatus = isBlocked ? 403 : (action.status ?? 200);
      const rps = action.requests_per_second!;
      const emitted = stepPathsEmitted![ai];
      const end = Math.min(emitted + rps, action.paths.length);
      for (let idx = emitted; idx < end; idx++) {
        const p = action.paths[idx];
        const entryStatus = isBlocked
          ? 403
          : (action.status_sequence?.[idx % (action.status_sequence?.length ?? 1)] ?? defaultStatus);
        const pl = resolvePayload(action.payloads?.[idx % (action.payloads?.length ?? 1)], attackerIp);
        logs.push({
          id: ctx.nextLogId(),
          timestamp: formatInGameTime(ctx.sec),
          ip: attackerIp,
          method: action.method || "GET",
          path: p,
          status: entryStatus,
          message: `${action.method || "GET"} ${p} - HTTP ${entryStatus}`,
          payload: pl,
          isAttacker: true,
          source: "access",
          db_connection: (action.use_db_connection && entryStatus < 300) ? action.use_db_connection : undefined,
        });
        if (action.emit_app_log) {
          const payloadStr = typeof pl === "string" ? pl : undefined;
          logs.push({
            id: ctx.nextLogId(),
            timestamp: formatInGameTime(ctx.sec),
            ip: attackerIp,
            method: "SYS",
            path: "",
            status: 0,
            message: `[APP] ${attackerIp} ${action.method || "GET"} ${p} ${entryStatus}${action.use_stolen_cookie ? ` Authorization: Bearer ${action.use_stolen_cookie.startsWith("$") ? (resourceValues.get(action.use_stolen_cookie.slice(1)) ?? action.use_stolen_cookie) : action.use_stolen_cookie}` : ""}${payloadStr ? ` body=${payloadStr}` : ""}`,
            isAttacker: true,
            source: "app",
          });
        }
      }
      stepPathsEmitted![ai] = end;
    }
  }

  // Per-tick emission for single-path high-volume actions (path + rps + duration)
  for (let ai = 0; ai < activeStep.actions.length; ai++) {
    const action = activeStep.actions[ai];
    if (
      action.type === "send_http_requests" &&
      action.path &&
      !action.paths &&
      (action.requests_per_second ?? 0) > 0 &&
      action.duration &&
      stepPathsEmitted !== null
    ) {
      const isBlocked = runtime.blockedIPs.has(attackerIp);
      const defaultStatus = isBlocked ? 403 : (action.status ?? 200);
      const rps = action.requests_per_second;
      const maxRequests = rps * action.duration;
      const startEmitted = stepPathsEmitted[ai];
      const toEmit = Math.min(rps, maxRequests - startEmitted);
      for (let i = 0; i < toEmit; i++) {
        const reqIndex = startEmitted + i;
        const payloadIdx =
          action.payload_cycle === "sequential"
            ? reqIndex % (action.payloads?.length ?? 1)
            : Math.floor(ctx.prng() * (action.payloads?.length ?? 1));
        const pl = resolvePayload(
          action.payloads?.[payloadIdx],
          attackerIp,
          reqIndex,
          action.seq_pad ?? 0,
        );
        logs.push({
          id: ctx.nextLogId(),
          timestamp: formatInGameTime(ctx.sec),
          ip: attackerIp,
          method: action.method ?? "POST",
          path: action.path,
          status: defaultStatus,
          message: `${action.method ?? "POST"} ${action.path} - HTTP ${defaultStatus}`,
          payload: pl,
          isAttacker: true,
          source: "access",
        });
      }
      stepPathsEmitted[ai] = startEmitted + toEmit;
    }
  }

  const allPathsDone = !activeStep.actions.some(
    (a, ai) =>
      a.type === "send_http_requests" &&
      a.paths &&
      (a.requests_per_second ?? 0) > 0 &&
      stepPathsEmitted![ai] < a.paths.length,
  );
  if (allPathsDone && !stepActionsExecuted) {
    stepActionsExecuted = true;
    const maxDuration = activeStep.actions.reduce(
      (max, a) => Math.max(max, attackerActionDuration(a)),
      0,
    );
    stepCompletesAt = ctx.sec + maxDuration;
  }

  if (stepActionsExecuted && ctx.sec >= (stepCompletesAt ?? ctx.sec)) {
    for (const action of activeStep.actions) {
      if (action.type === "emit_db_record") {
        newDbRecords.push({
          collection: action.collection,
          fields: action.fields,
          isAttacker: true,
          invalidates_resource: action.invalidates_resource,
        });
      }
    }
    for (const genId of activeStep.generates ?? []) {
      const genResource = scenario.simulation.resources.find(r => r.id === genId);
      if (genResource?.rotation_pool === "random") {
        const newIp = generateRandomIp(ctx.prng);
        resourceValues.set(genId, newIp);
        usedAttackerIps = [...usedAttackerIps, newIp];
      } else if (genResource?.rotation_pool === "random_jwt") {
        resourceValues.set(genId, generateRandomJwt(ctx.prng));
      } else if (Array.isArray(genResource?.rotation_pool)) {
        const pool = genResource!.rotation_pool as string[];
        const nextIp = pool.find(ip => !runtime.blockedIPs.has(ip) && !runtime.revokedTokens.has(ip));
        resourceValues.set(genId, nextIp ?? null);
        if (nextIp) usedAttackerIps = [...usedAttackerIps, nextIp];
      } else {
        resourceValues.set(genId, "available");
      }
    }

    stepReachedIds.add(activeStepId);

    if (activeStep.retry_interval !== undefined) {
      stepBlockedUntil.set(activeStepId, ctx.sec + activeStep.retry_interval);
    }

    attackerActiveStepId = "";
    stepFirstTriggerAt = null;
    stepActionsExecuted = false;
    stepPathsEmitted = null;
    stepCompletesAt = null;
  }

  return returnResult();
}
