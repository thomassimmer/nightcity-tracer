import { create } from "zustand";
import type {
  Scenario,
  LogEntry,
  NetworkFlow,
  FileState,
  AlertEntry,
  RuntimeDbRecord,
} from "@/scenario.types";
import { createPRNG } from "@/hooks/usePRNG";
import {
  saveToLocalStorage,
  clearSave,
  type SavedState,
  type UserAction,
  type TerminalCommand,
} from "@/utils/saveState";
import type { TerminalLine } from "@/utils/terminalExec";
import { formatInGameTime } from "@/simulation/time";
import { advanceSecond } from "@/simulation/advanceSecond";
import { generateRandomIp } from "@/utils/attackerSimulation";
import {
  createInitialRuntime,
  createSimulationIds,
  type SimulationRuntime,
} from "@/simulation/runtimeState";
import {
  buildTimeline,
  preGeneratePostmortemSimulation,
  replayTimeline,
} from "@/simulation/buildTimeline";


export interface SimulationStoreState {
  isActive: boolean;
  isPlaying: boolean;
  isGameOver: boolean;
  gameEndedWith: "victory" | "failure" | null;
  gameOverReason: string;
  scenario: Scenario | null;
  seed: string;
  prng: (() => number) | null;
  elapsedSeconds: number;
  logs: LogEntry[];
  networkFlows: NetworkFlow[];
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
  reportAnswers: Record<string, string>;
  virtualFiles: Record<string, FileState>;
  filePatches: Record<string, string>;
  activeAlerts: AlertEntry[];

  stepFirstTriggerAt: number | null;
  stepActionsExecuted: boolean;
  stepPathsEmitted: number[] | null;
  stepCompletesAt: number | null;
  userActions: UserAction[];
  terminalCommands: TerminalCommand[];
  restoredTerminalLines: TerminalLine[];
}

export interface SimulationStoreActions {
  addAlert: (level: "info" | "warning" | "critical", message: string) => void;
  markAlertRead: (id: string) => void;
  markAllAlertsRead: () => void;
  updateReportDraft: (
    updater:
      | Record<string, string>
      | ((prev: Record<string, string>) => Record<string, string>),
  ) => void;
  startSimulation: (scenario: Scenario, seed?: string) => void;
  restoreSimulation: (save: SavedState, scenario: Scenario) => void;
  pauseSimulation: () => void;
  resumeSimulation: () => void;
  stopSimulation: () => void;
  submitReport: (answers: Record<string, string>) => void;
  blockIP: (ip: string) => void;
  revokeToken: (token: string) => void;
  deleteStoredXss: (key: string) => void;
  deleteDbRecord: (collection: string, id: string, invalidates_resource?: string) => void;
  applyCodePatch: (filePath: string, ruleId: string, optionId: string) => void;
  recordTerminalCommand: (command: string) => void;
  tick: () => void;
}

export type SimulationStore = SimulationStoreState & SimulationStoreActions;

function runtimeFromStore(state: SimulationStoreState): SimulationRuntime {
  return {
    elapsedSeconds: state.elapsedSeconds,
    logs: state.logs,
    networkFlows: state.networkFlows,
    activeAlerts: state.activeAlerts,
    blockedIPs: state.blockedIPs,
    revokedTokens: state.revokedTokens,
    resourceValues: state.resourceValues,
    usedAttackerIps: state.usedAttackerIps,
    deletedXssEntries: state.deletedXssEntries,
    runtimeDbRecords: state.runtimeDbRecords,
    deletedDbRecords: state.deletedDbRecords,
    nextDbRecordId: state.nextDbRecordId,
    attackerActiveStepId: state.attackerActiveStepId,
    stepReachedIds: state.stepReachedIds,
    patchedRuleIds: state.patchedRuleIds,
    stepBlockedUntil: state.stepBlockedUntil,
    stepFirstTriggerAt: state.stepFirstTriggerAt,
    stepActionsExecuted: state.stepActionsExecuted,
    stepPathsEmitted: state.stepPathsEmitted,
    stepCompletesAt: state.stepCompletesAt,
    isGameOver: state.isGameOver,
    gameEndedWith: state.gameEndedWith,
    gameOverReason: state.gameOverReason,
  };
}

function storeFromRuntime(
  runtime: SimulationRuntime,
): Pick<
  SimulationStoreState,
  | "elapsedSeconds"
  | "logs"
  | "networkFlows"
  | "activeAlerts"
  | "blockedIPs"
  | "revokedTokens"
  | "resourceValues"
  | "usedAttackerIps"
  | "deletedXssEntries"
  | "runtimeDbRecords"
  | "deletedDbRecords"
  | "nextDbRecordId"
  | "attackerActiveStepId"
  | "stepReachedIds"
  | "patchedRuleIds"
  | "stepBlockedUntil"
  | "stepFirstTriggerAt"
  | "stepActionsExecuted"
  | "stepPathsEmitted"
  | "stepCompletesAt"
  | "isGameOver"
  | "gameEndedWith"
  | "gameOverReason"
> {
  return {
    elapsedSeconds: runtime.elapsedSeconds,
    logs: runtime.logs,
    networkFlows: runtime.networkFlows,
    activeAlerts: runtime.activeAlerts,
    blockedIPs: runtime.blockedIPs,
    revokedTokens: runtime.revokedTokens,
    resourceValues: runtime.resourceValues,
    usedAttackerIps: runtime.usedAttackerIps,
    deletedXssEntries: runtime.deletedXssEntries,
    runtimeDbRecords: runtime.runtimeDbRecords,
    deletedDbRecords: runtime.deletedDbRecords,
    nextDbRecordId: runtime.nextDbRecordId,
    attackerActiveStepId: runtime.attackerActiveStepId,
    stepReachedIds: runtime.stepReachedIds,
    patchedRuleIds: runtime.patchedRuleIds,
    stepBlockedUntil: runtime.stepBlockedUntil,
    stepFirstTriggerAt: runtime.stepFirstTriggerAt,
    stepActionsExecuted: runtime.stepActionsExecuted,
    stepPathsEmitted: runtime.stepPathsEmitted,
    stepCompletesAt: runtime.stepCompletesAt,
    isGameOver: runtime.isGameOver,
    gameEndedWith: runtime.gameEndedWith,
    gameOverReason: runtime.gameOverReason,
  };
}

export const useSimulationStore = create<SimulationStore>((set, get) => ({
  isActive: false,
  isPlaying: false,
  isGameOver: false,
  gameEndedWith: null,
  gameOverReason: "",
  scenario: null,
  seed: "nightcity-42",
  prng: null,
  elapsedSeconds: 0,
  logs: [],
  networkFlows: [],
  blockedIPs: new Set<string>(),
  revokedTokens: new Set<string>(),
  resourceValues: new Map<string, string | null>(),
  deletedXssEntries: new Set<string>(),
  runtimeDbRecords: new Map<string, RuntimeDbRecord[]>(),
  deletedDbRecords: new Map<string, Set<string>>(),
  nextDbRecordId: 1,
  usedAttackerIps: [],
  attackerActiveStepId: "",
  stepReachedIds: new Set<string>(),
  patchedRuleIds: new Set<string>(),
  stepBlockedUntil: new Map<string, number>(),
  reportAnswers: {},
  virtualFiles: {},
  filePatches: {},
  activeAlerts: [],

  stepFirstTriggerAt: null,
  stepActionsExecuted: false,
  stepPathsEmitted: null,
  stepCompletesAt: null,
  userActions: [],
  terminalCommands: [],
  restoredTerminalLines: [],

  addAlert: (level, message) => {
    set((state) => {
      const id = `alert-${state.activeAlerts.length + 1}`;
      return {
        activeAlerts: [
          ...state.activeAlerts,
          { id, level, message, read: false, timestamp: Date.now() },
        ],
      };
    });
  },

  markAlertRead: (id) => {
    set((state) => ({
      activeAlerts: state.activeAlerts.map((a) =>
        a.id === id ? { ...a, read: true } : a,
      ),
    }));
  },

  markAllAlertsRead: () => {
    set((state) => ({
      activeAlerts: state.activeAlerts.map((a) => ({ ...a, read: true })),
    }));
  },

  updateReportDraft: (updater) => {
    set((state) => {
      const nextAnswers =
        typeof updater === "function" ? updater(state.reportAnswers) : updater;
      return { reportAnswers: nextAnswers };
    });
  },

  startSimulation: (selectedScenario, customSeed = "nightcity-42") => {
    const files: Record<string, FileState> = {};
    selectedScenario.assets?.files.forEach((f) => {
      files[f.id] = {
        file_path: f.id,
        content: f.content,
        patchedRuleIds: [],
      };
    });

    const initialRuntime = createInitialRuntime(selectedScenario);

    let initialLogs: LogEntry[] = [];
    let initialAlerts: AlertEntry[] = [];
    let isPlaying = false;
    let prng: (() => number) | null = createPRNG(customSeed);

    if (selectedScenario.gameplay.mode === "postmortem") {
      const { logs: preGenLogs, alerts: preGenAlerts } =
        preGeneratePostmortemSimulation(selectedScenario, customSeed);
      initialLogs = preGenLogs;
      initialAlerts = preGenAlerts;
      prng = null;
    }

    set({
      scenario: selectedScenario,
      seed: customSeed,
      prng,
      elapsedSeconds: 0,
      logs: initialLogs,
      networkFlows: [],
      blockedIPs: new Set(),
      revokedTokens: new Set(),
      resourceValues: initialRuntime.resourceValues,
      usedAttackerIps: initialRuntime.usedAttackerIps,
      deletedXssEntries: new Set(),
      runtimeDbRecords: new Map(),
      deletedDbRecords: new Map(),
      nextDbRecordId: 1,
      attackerActiveStepId: "",
      stepReachedIds: new Set(),
      patchedRuleIds: new Set(),
      stepBlockedUntil: new Map(),
      filePatches: {},
      activeAlerts: initialAlerts,
      isGameOver: false,
      gameEndedWith: null,
      gameOverReason: "",
      reportAnswers: {},
      virtualFiles: files,
      isActive: true,
      isPlaying,
      userActions: [],
      terminalCommands: [],
      restoredTerminalLines: [],

      stepFirstTriggerAt: null,
      stepActionsExecuted: false,
      stepPathsEmitted: null,
      stepCompletesAt: null,
    });
  },

  restoreSimulation: (save, restoredScenario) => {
    const files: Record<string, FileState> = {};
    restoredScenario.assets?.files.forEach((f) => {
      const savedPatch = save.virtualFilePatches[f.id];
      files[f.id] = {
        file_path: f.id,
        content: f.content,
        patchedRuleIds: savedPatch?.patchedRuleIds ?? [],
        activeDiffOptionId: savedPatch?.activeDiffOptionId,
      };
    });

    const savedUserActions: UserAction[] = save.userActions ?? [];
    const savedTerminalCommands: TerminalCommand[] = save.terminalCommands ?? [];

    let prng: (() => number) | null = null;
    let replayed = createInitialRuntime(restoredScenario);
    let restoredTerminalLines: TerminalLine[] = [];

    if (restoredScenario.gameplay.mode === "postmortem") {
      const result = buildTimeline(
        restoredScenario,
        createPRNG(save.seed),
        restoredScenario.gameplay.duration_seconds,
        true,
        [],
        savedTerminalCommands,
        files,
      );
      replayed = result.runtime;
      restoredTerminalLines = result.terminalLines;
    } else if (save.elapsedSeconds > 0) {
      prng = createPRNG(save.seed);
      const result = replayTimeline(
        restoredScenario,
        prng,
        save.elapsedSeconds,
        savedUserActions,
        savedTerminalCommands,
        files,
      );
      replayed = result.runtime;
      restoredTerminalLines = result.terminalLines;
    } else {
      prng = createPRNG(save.seed);
    }

    set({
      scenario: restoredScenario,
      seed: save.seed,
      prng,
      ...storeFromRuntime(replayed),
      elapsedSeconds: save.elapsedSeconds,
      blockedIPs: new Set(save.blockedIPs),
      revokedTokens: new Set<string>(),
      deletedXssEntries: new Set(save.deletedXssEntries ?? []),
      deletedDbRecords: new Map(
        Object.entries(save.deletedDbRecords ?? {}).map(([k, v]) => [k, new Set(v)])
      ),
      filePatches: save.filePatches,
      activeAlerts: save.activeAlerts,
      networkFlows: replayed.networkFlows,
      reportAnswers: save.reportAnswers,
      isGameOver: false,
      gameEndedWith: null,
      gameOverReason: "",
      virtualFiles: files,
      isActive: true,
      isPlaying: restoredScenario.gameplay.mode !== "postmortem",
      userActions: savedUserActions,
      terminalCommands: savedTerminalCommands,
      restoredTerminalLines,
    });
  },

  pauseSimulation: () => set({ isPlaying: false }),
  resumeSimulation: () => set({ isPlaying: true }),

  stopSimulation: () => {
    const scenario = get().scenario;
    if (scenario) clearSave(scenario.id);
    set({
      isActive: false,
      isPlaying: false,
      scenario: null,
      prng: null,
      userActions: [],
      terminalCommands: [],
      restoredTerminalLines: [],
    });
  },

  submitReport: (answers) => {
    const scenario = get().scenario;
    if (!scenario) return;
    set({
      reportAnswers: answers,
      isPlaying: false,
      isGameOver: true,
      gameEndedWith: "victory",
      gameOverReason: "Forensic Incident Report Submitted for evaluation.",
    });
  },

  blockIP: (ip) => {
    if (get().isGameOver) return;
    const state = get();
    const resources = state.scenario?.simulation.resources ?? [];
    const ipResource = resources.find((r) => state.resourceValues.get(r.id) === ip);
    let rotatedIp: string | null = null;
    if (ipResource) {
      const pool = ipResource.rotation_pool;
      if (pool === "random" && state.prng) {
        rotatedIp = generateRandomIp(state.prng);
      } else if (Array.isArray(pool)) {
        rotatedIp = pool.find((poolIp) => !state.blockedIPs.has(poolIp)) ?? null;
      }
    }
    set((prev) => {
      const nextBlocked = new Set(prev.blockedIPs);
      nextBlocked.add(ip);
      const nextResourceValues = new Map(prev.resourceValues);
      if (ipResource) {
        nextResourceValues.set(ipResource.id, rotatedIp);
      }
      return {
        blockedIPs: nextBlocked,
        resourceValues: nextResourceValues,
        usedAttackerIps: rotatedIp
          ? [...prev.usedAttackerIps, rotatedIp]
          : prev.usedAttackerIps,
        userActions: [
          ...prev.userActions,
          { sec: prev.elapsedSeconds, type: "block_ip" as const, ip },
        ],
        logs: [
          ...prev.logs,
          {
            id: `log-${prev.logs.length + 1}`,
            timestamp: formatInGameTime(prev.elapsedSeconds),
            ip: "127.0.0.1",
            method: "SYS" as const,
            path: "FIREWALL",
            status: 200,
            message: `SYSTEM CONSOLE: Applied drop rule on target IP address [${ip}] in Netchoke-WAF.`,
          },
        ],
      };
    });
  },

  revokeToken: (token) => {
    const state = get();
    if (state.isGameOver) return;
    const resources = state.scenario?.simulation.resources ?? [];
    const resource = resources.find(
      (r) => r.revocable && state.resourceValues.get(r.id) === token,
    );
    set((prev) => {
      const nextResourceValues = new Map(prev.resourceValues);
      const nextRevokedTokens = new Set(prev.revokedTokens);
      if (resource) {
        nextResourceValues.set(resource.id, null);
        nextRevokedTokens.add(token);
      }
      return {
        resourceValues: nextResourceValues,
        revokedTokens: nextRevokedTokens,
        userActions: [
          ...prev.userActions,
          { sec: prev.elapsedSeconds, type: "revoke_token" as const, token },
        ],
        logs: [
          ...prev.logs,
          {
            id: `log-${prev.logs.length + 1}`,
            timestamp: formatInGameTime(prev.elapsedSeconds),
            ip: "127.0.0.1",
            method: "SYS" as const,
            path: "IAM_ADMIN",
            status: 200,
            message: `SYSTEM CONSOLE: Revoked authorization token [${token}] in master credential layer.`,
          },
        ],
      };
    });
    get().addAlert("warning", "Attacker session credentials invalidated.");
  },

  deleteDbRecord: (collection, id, invalidates_resource) => {
    if (get().isGameOver) return;
    set((prev) => {
      const nextDeletedDbRecords = new Map(prev.deletedDbRecords);
      const existing = nextDeletedDbRecords.get(collection) ?? new Set<string>();
      nextDeletedDbRecords.set(collection, new Set([...existing, id]));
      const nextResourceValues = invalidates_resource
        ? new Map([...prev.resourceValues, [invalidates_resource, null] as [string, null]])
        : prev.resourceValues;
      return {
        deletedDbRecords: nextDeletedDbRecords,
        resourceValues: nextResourceValues,
        userActions: [
          ...prev.userActions,
          { sec: prev.elapsedSeconds, type: 'delete_db_record' as const, collection, id, invalidates_resource },
        ],
      };
    });
  },

  deleteStoredXss: (key) => {
    if (get().isGameOver) return;
    const scenario = get().scenario;
    let resourceToInvalidate: string | null = null;
    for (const panel of scenario?.panels ?? []) {
      if (panel.type !== "terminal") continue;
      for (const col of panel.config.db_collections ?? []) {
        for (const rec of col.records) {
          if (rec.xss_key === key && rec.invalidates_resource) {
            resourceToInvalidate = rec.invalidates_resource;
          }
        }
      }
    }
    set((prev) => {
      const nextResourceValues = resourceToInvalidate
        ? new Map([...prev.resourceValues, [resourceToInvalidate, null] as [string, null]])
        : prev.resourceValues;
      return {
        deletedXssEntries: new Set([...prev.deletedXssEntries, key]),
        resourceValues: nextResourceValues,
        userActions: [
          ...prev.userActions,
          { sec: prev.elapsedSeconds, type: 'delete_xss' as const, key },
        ],
      };
    });
  },

  applyCodePatch: (filePath, ruleId, optionId) => {
    const state = get();
    if (state.isGameOver) return;

    set((prev) => {
      const nextFilePatches = {
        ...prev.filePatches,
        [`${filePath}:${ruleId}`]: optionId,
      };

      const scenario = prev.scenario;
      const patchingRules =
        scenario?.simulation.interactive_defense?.code_patching_rules;
      const rule = patchingRules?.find((r) => r.id === ruleId);
      const option = rule?.options.find((o) => o.id === optionId);

      if (!option) return {};

      const existingFile = prev.virtualFiles[filePath];
      const nextVirtualFiles = { ...prev.virtualFiles };
      if (existingFile) {
        nextVirtualFiles[filePath] = {
          ...existingFile,
          patchedRuleIds: option.is_correct
            ? [
                ...existingFile.patchedRuleIds.filter((id) => id !== ruleId),
                ruleId,
              ]
            : existingFile.patchedRuleIds,
          activeDiffOptionId: optionId,
        };
      }

      const nextLogs = [
        ...prev.logs,
        {
          id: `log-${prev.logs.length + 1}`,
          timestamp: formatInGameTime(prev.elapsedSeconds),
          ip: "127.0.0.1",
          method: "SYS" as const,
          path: "IDE_COMPILER",
          status: 200,
          message: `IDE INTEGRATION: Diff patch [${option.label}] compiled and deployed. Compiler output: ${option.feedback}`,
        },
      ];

      const nextPatchedRuleIds = new Set(prev.patchedRuleIds);
      const nextResourceValues = new Map(prev.resourceValues);
      if (option.is_correct && rule?.on_success) {
        nextPatchedRuleIds.add(ruleId);
        for (const resId of rule.on_success.invalidates_resources ?? []) {
          nextResourceValues.set(resId, null);
        }
      }

      const patchUserAction: UserAction = {
        sec: prev.elapsedSeconds,
        type: "patch_rule" as const,
        ruleId,
        invalidates_resources: option.is_correct ? (rule?.on_success.invalidates_resources ?? []) : [],
      };

      return {
        filePatches: nextFilePatches,
        virtualFiles: nextVirtualFiles,
        logs: nextLogs,
        patchedRuleIds: nextPatchedRuleIds,
        resourceValues: nextResourceValues,
        userActions: [...prev.userActions, patchUserAction],
      };
    });

    const scenario = get().scenario;
    const patchingRules =
      scenario?.simulation.interactive_defense?.code_patching_rules;
    const rule = patchingRules?.find((r) => r.id === ruleId);
    const option = rule?.options.find((o) => o.id === optionId);
    if (option?.is_correct && rule?.on_success) {
      get().addAlert("info", rule.on_success.feedback);
    }
  },

  recordTerminalCommand: (command) => {
    set(prev => ({
      terminalCommands: [...prev.terminalCommands, { sec: prev.elapsedSeconds, command }],
    }));
  },

  tick: () => {
    const state = get();
    if (!state.isActive || !state.isPlaying || !state.scenario || !state.prng)
      return;

    const nextSeconds = state.elapsedSeconds + 1;
    const runtime = runtimeFromStore(state);
    const next = advanceSecond(
      state.scenario,
      runtime,
      nextSeconds,
      state.prng,
      createSimulationIds(runtime),
      { collectAlerts: true },
    );

    set(storeFromRuntime(next));
  },
}));

useSimulationStore.subscribe((state) => {
  if (!state.isActive || !state.scenario) return;

  saveToLocalStorage({
    v: 1,
    scenarioId: state.scenario.id,
    seed: state.seed,
    elapsedSeconds: state.elapsedSeconds,
    blockedIPs: [...state.blockedIPs],
    deletedXssEntries: [...state.deletedXssEntries],
    filePatches: state.filePatches,
    networkFlows: state.networkFlows,
    activeAlerts: state.activeAlerts,
    reportAnswers: state.reportAnswers,
    virtualFilePatches: Object.fromEntries(
      Object.entries(state.virtualFiles).map(([k, v]) => [
        k,
        {
          patchedRuleIds: v.patchedRuleIds,
          activeDiffOptionId: v.activeDiffOptionId,
        },
      ]),
    ),
    userActions: state.userActions,
    terminalCommands: state.terminalCommands,
    deletedDbRecords: Object.fromEntries(
      [...state.deletedDbRecords].map(([k, v]) => [k, [...v]])
    ),
  });
});

useSimulationStore.subscribe((state) => {
  if (state.isGameOver && state.scenario) {
    clearSave(state.scenario.id);
  }
});
