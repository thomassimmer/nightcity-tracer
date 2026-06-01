// ─────────────────────────────────────────────────────────────────────────────
// NightCity Tracer: Scenario type definitions
// Every scenario JSON must satisfy this contract.
// ─────────────────────────────────────────────────────────────────────────────

export interface Scenario {
  id: string;
  version: string;
  schema_version: string;
  title: string;
  author: string;
  tags: string[];
  world: WorldConfig;
  gameplay: GameplayConfig;
  panels: PanelDefinition[];
  simulation: SimulationConfig;
  assets: AssetConfig;
  report: ReportConfig;
  scoring: ScoringConfig;
  replay: ReplayConfig;
  defense_takeaways?: string[];
  tutorial?: TutorialConfig;
}

// ─────────────────────────────────────────────────────────────────────────────
// TUTORIAL
// ─────────────────────────────────────────────────────────────────────────────

export type TutorialHighlight =
  | "panel-bar"
  | "report-btn"
  | "notif-btn"
  | "handbook-btn"
  | "briefing-btn"
  | `panel:${string}`;

export type TutorialTrigger =
  | { type: "auto"; delay_ms: number }
  | { type: "panel_open"; panel_id: string }
  | { type: "terminal_used" }
  | { type: "terminal_command"; command: string }
  | { type: "code_patched" }
  | { type: "report_submitted" };

export interface TutorialStep {
  id: string;
  message: string;
  highlight?: TutorialHighlight;
  position?: "left" | "right";
  completed_by: TutorialTrigger;
}

export interface TutorialConfig {
  enabled: true;
  allow_skip: boolean;
  steps: TutorialStep[];
}

// ─────────────────────────────────────────────────────────────────────────────
// WORLD
// ─────────────────────────────────────────────────────────────────────────────

export interface WorldConfig {
  corporation: string;
  player_role: string;
  location: string;
  ui_theme:
    | "arasaka"
    | "militech"
    | "netwatch"
    | "biotechnica"
    | "kang_tao"
    | "trauma_team"
    | "fixer";
  urgency_level: "low" | "medium" | "high" | "critical";
  briefing: {
    title: string;
    body: string;
    sender: string;
    timestamp: string;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// GAMEPLAY
// ─────────────────────────────────────────────────────────────────────────────

export interface GameplayConfig {
  mode: "live" | "postmortem";
  difficulty: "beginner" | "intermediate" | "advanced";
  duration_seconds: number;
  allow_early_submit: boolean;
  failure_condition?: {
    trigger: "attacker_state" | "time_elapsed" | "incorrect_attempts";
    state_id?: string;
    limit_value?: number;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PANELS (discriminated union on `type`)
// ─────────────────────────────────────────────────────────────────────────────

export type PanelDefinition =
  | LogStream
  | TerminalPanel
  | CodeEditor
  | FileExplorerPanel
  | NetworkMapPanel
  | AdminConsolePanel
  | DiffViewer
  | GitHistoryPanel
  | EmailChainPanel
  | MemoryDumpPanel
  | DbSchemaPanel
  | DbViewerPanel
  | ConversationLogPanel
  | CloudConfigPanel
  | ConfigFilePanel
  | ServerlessExecutionLogsPanel
  | K8sAuditLogsPanel
  | BadgeLogPanel
  | TimelineBuilderPanel
  | ThermalMapPanel
  | HexViewerPanel
  | JwtDecoderPanel;

export type PanelSlot = "main" | "left" | "right" | "bottom";

export interface BasePanel {
  id: string;
  label: string;
  description?: string;
  position: PanelSlot;
  default_open?: boolean;
}

export interface LogStream extends BasePanel {
  type: "log_stream";
  config: {
    source: string;
    live: boolean;
    filter_bar: boolean;
    auto_scroll: boolean;
  };
}
export interface TerminalCommandEntry {
  output: string;
  requires_resource?: string;
}

export interface DbRecord {
  id: string;
  display_lines: string[];
  requires_resource?: string;
  xss_key?: string;
  invalidates_resource?: string;
  delete_denied?: boolean;
}

export interface DbCollection {
  name: string;
  records: DbRecord[];
}

export interface TerminalPanelConfig {
  commands?: Record<string, TerminalCommandEntry[]>;
  initial_history?: string[];
  log_files?: Record<string, string>;
  db_collections?: DbCollection[];
}

export interface TerminalPanel extends BasePanel {
  type: "terminal";
  config: TerminalPanelConfig;
}
export interface CodeEditor extends BasePanel {
  type: "code_editor";
  config: { language: string; file_path: string; read_only: boolean };
}
export interface FileExplorerPanel extends BasePanel {
  type: "file_explorer";
  config: {
    root: string;
    default_file: string;
    read_only: boolean;
    files: string[];
  };
}
export interface NetworkMapPanel extends BasePanel {
  type: "network_map";
  config: { live: boolean };
}
export interface AdminConsolePanel extends BasePanel {
  type: "admin_console";
  config: { endpoints: string[] };
}
export interface DiffViewer extends BasePanel {
  type: "diff_viewer";
  config: { original_file_path: string; modified_file_path: string };
}
export interface GitHistoryPanel extends BasePanel {
  type: "git_history";
  config: { repo_name: string; branch?: string };
}
export interface EmailChainPanel extends BasePanel {
  type: "email_chain";
  config: { inbox_owner: string };
}
export interface MemoryDumpPanel extends BasePanel {
  type: "memory_dump";
  config: {
    format: "process_tree" | "hexdump" | "strings_list";
    source_target: string;
  };
}
export interface DbSchemaPanel extends BasePanel {
  type: "db_schema";
  config: { dialect: "postgresql" | "sqlite" | "mysql" | "nosql" };
}
export interface DbViewerCollectionSchema {
  name: string;
  columns: string[];
  allow_delete: boolean;
}
export interface DbViewerPanel extends BasePanel {
  type: "db_viewer";
  config: {
    collections: DbViewerCollectionSchema[];
    db_collections?: DbCollection[];
  };
}
export interface ConversationLogPanel extends BasePanel {
  type: "conversation_log";
  config: { participants: string[]; session_file: string };
}
export interface CloudConfigPanel extends BasePanel {
  type: "cloud_config";
  config: { provider: "aws" | "gcp" | "azure" | "kubernetes" };
}
export interface ConfigFilePanel extends BasePanel {
  type: "config_file";
  config: { file_path: string; language: string };
}
export interface ServerlessExecutionLogsPanel extends BasePanel {
  type: "serverless_logs";
  config: { function_name: string };
}
export interface K8sAuditLogsPanel extends BasePanel {
  type: "k8s_logs";
  config: { cluster_name: string };
}
export interface BadgeLogPanel extends BasePanel {
  type: "badge_log";
  config: { facility: string };
}
export interface TimelineBuilderPanel extends BasePanel {
  type: "timeline_builder";
  config: { target_events: string[] };
}
export interface ThermalMapPanel extends BasePanel {
  type: "thermal_map";
  config: { grid_size: number };
}
export interface HexViewerPanel extends BasePanel {
  type: "hex_viewer";
  config: { file_path: string };
}
export interface JwtDecoderPanel extends BasePanel {
  type: "jwt_decoder";
  config: { token_source: string };
}

// ─────────────────────────────────────────────────────────────────────────────
// SIMULATION
// ─────────────────────────────────────────────────────────────────────────────

export interface ScenarioResource {
  id: string;
  initial_value: string | null;
  rotation_pool?: string[] | "random" | "random_jwt";
  revocable?: boolean;
}

export interface SimulationConfig {
  resources: ScenarioResource[];
  noise_generators: NoiseGenerator[];
  attacker_agent?: AttackerAgent;
  interactive_defense?: InteractiveDefense;
}

export type NoiseGenerator =
  | HttpNoiseGenerator
  | TcpFlowGenerator
  | SyslogNoiseGenerator;

interface BaseNoiseGenerator {
  id: string;
  weight?: number;
}

export type Payload =
  | string
  | { type: "http"; headers?: Record<string, string>; body?: string }
  | { type: "lines"; lines: string[] }
  | { type: "file"; filename: string; preview: string; size?: number };

export interface HttpNoiseGenerator extends BaseNoiseGenerator {
  type: "http_traffic";
  requests_per_second: number;
  ips_pool: string[];
  endpoints: Array<{
    path: string;
    method: "GET" | "POST" | "PUT" | "DELETE";
    status: number;
    weight: number;
    payloads?: Payload[];
    emit_app_log?: boolean;
    app_log_message?: string;
    emit_db_record?: { collection: string; fields_from_payload: string[] };
    use_db_connection?: string;
  }>;
  emit_app_log?: boolean;
}
export interface TcpFlowGenerator extends BaseNoiseGenerator {
  type: "tcp_flow";
  packets_per_minute: number;
  flows: Array<{ src: string; dst: string; port: number; weight: number }>;
}
export interface SyslogNoiseGenerator extends BaseNoiseGenerator {
  type: "syslog";
  messages_per_minute: number;
  daemons: string[];
}

export interface AttackerAgent {
  steps: AttackerStep[];
  game_over_action?: GameOverFailureAction;
}

export interface AttackerStepRequires {
  resources?: string[];
  not_patched?: string[];
}

export interface AttackerStep {
  id: string;
  requires?: AttackerStepRequires;
  generates?: string[];
  delay?: number;
  actions: AttackerAction[];
  retry_interval?: number;
}

export type AttackerAction =
  | SendHttpRequestsAction
  | SendProtocolMessageAction
  | WaitAction
  | NotifyUiAction
  | SpawnNetworkFlowAction
  | ModifyFileIntegrityAction
  | GameOverFailureAction
  | LogEntryAction
  | EmitDbRecordAction;

export interface SendHttpRequestsAction {
  type: "send_http_requests";
  requests_per_second: number;
  duration: number;
  pattern?:
    | "directory_fuzzing"
    | "xss_injection_attempts"
    | "sqli_fuzzing"
    | "brute_force";
  path?: string;
  paths?: string[];
  method?: "GET" | "POST";
  payloads?: Payload[];
  status?: number;
  status_sequence?: number[];
  use_stolen_cookie?: string;
  emit_app_log?: boolean;
  use_db_connection?: string;
  payload_cycle?: "sequential" | "random";
  seq_pad?: number;
}
export interface SendProtocolMessageAction {
  type: "send_protocol_message";
  protocol: "modbus" | "dnp3" | "opcua" | "can_bus" | "bacnet";
  target_ip: string;
  unit_id?: number;
  duration: number;
  requests_per_second?: number;
  messages: Array<{
    function_code: number;
    address: number;
    value: number | string;
  }>;
}
export interface WaitAction {
  type: "wait";
  duration: number;
}
export interface NotifyUiAction {
  type: "notify_ui";
  level: "info" | "warning" | "critical";
  message: string;
}
export interface SpawnNetworkFlowAction {
  type: "spawn_network_flow";
  src: string;
  dst: string;
  dst_port: number;
  protocol: "TCP" | "UDP" | "HTTPS";
  bytes_per_second: number;
}
export interface ModifyFileIntegrityAction {
  type: "modify_file_integrity";
  file_path: string;
  modification_type: "created" | "modified" | "deleted";
}
export interface GameOverFailureAction {
  type: "game_over_failure";
  reason: string;
}
export interface LogEntryAction {
  type: "log_entry";
  source: string;
  message: string;
}
export interface EmitDbRecordAction {
  type: "emit_db_record";
  collection: string;
  fields: Record<string, string>;
  invalidates_resource?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERACTIVE DEFENSE
// ─────────────────────────────────────────────────────────────────────────────

export interface InteractiveDefense {
  network_rules?: {
    allow_ip_blocking: boolean;
    action_hook: string;
  };
  session_rules?: {
    allow_revocation: boolean;
    action_hook: string;
  };
  code_patching_rules?: CodePatchingRule[];
  config_patching_rules?: ConfigPatchingRule[];
  prompt_patching_rules?: PromptPatchingRule[];
}

export interface CodePatchingRule {
  id: string;
  target_file: string;
  vulnerable_block_id: string;
  description: string;
  vulnerable_lines?: number[];
  options: Array<{
    id: string;
    label: string;
    explanation: string;
    patch_diff: string;
    is_correct: boolean;
    feedback: string;
  }>;
  on_success: {
    effect: string;
    invalidates_resources?: string[];
    feedback: string;
  };
}

export interface ConfigPatchingRule {
  id: string;
  target_file: string;
  vulnerable_block_id: string;
  description: string;
  vulnerable_lines?: number[];
  options: Array<{
    id: string;
    label: string;
    explanation: string;
    patch_diff: string;
    is_correct: boolean;
    feedback: string;
  }>;
  on_success: {
    effect: string;
    invalidates_resources?: string[];
    feedback: string;
  };
}

export interface PromptPatchingRule {
  id: string;
  target_file: string;
  vulnerable_clause_id: string;
  description: string;
  options: Array<{
    id: string;
    label: string;
    explanation: string;
    patch_diff: string;
    is_correct: boolean;
    feedback: string;
  }>;
  on_success: {
    effect: string;
    feedback: string;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ASSETS
// ─────────────────────────────────────────────────────────────────────────────

export interface AssetFile {
  id: string;
  content: string;
}

export interface AssetConfig {
  files: AssetFile[];
}

// ─────────────────────────────────────────────────────────────────────────────
// INCIDENT REPORT
// ─────────────────────────────────────────────────────────────────────────────

export interface ReportConfig {
  fields: ReportField[];
}

export interface ReportField {
  id: string;
  label: string;
  type: "text" | "textarea" | "choice" | "multiselect";
  required: boolean;
  hint?: string;
  correct_answer: string | string[];
  match_mode: "exact" | "contains" | "contains_all" | "regex";
  options?: string[];
  explanation?: string;
  /**
   * If provided, this field is skipped from scoring (and shown as N/A in the
   * debrief) when ALL the listed attacker-state IDs were NOT reached during
   * the session.  Useful for questions about consequences that only exist when
   * the attack was NOT stopped early (e.g. "which DB was dumped?" when the
   * player patched before the attacker even had a JWT).
   */
  skip_if_states_not_reached?: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// SCORING
// ─────────────────────────────────────────────────────────────────────────────

export interface ScoringConfig {
  dimensions: Record<string, ScoringDimension>;
  penalties?: {
    false_positive_per_item?: number;
    incorrect_report_fields?: number;
  };
}

export type ScoringDimension =
  | TimePressureDimension
  | FieldMatchDimension
  | InteractiveMitigationDimension;

interface BaseDimension {
  weight: number;
}

export interface TimePressureDimension extends BaseDimension {
  type: "time_pressure";
  config: { full_score_before: number; zero_score_after: number };
}
export interface FieldMatchDimension extends BaseDimension {
  type: "field_match";
  config: { partial_credit: boolean; fields?: string[] };
}
export interface InteractiveMitigationDimension extends BaseDimension {
  type: "interactive_mitigation";
  config: {
    mitigations: Array<{
      action: "code_patched" | "ip_blocked" | "session_revoked" | "stored_xss_deleted";
      points: number;
      skip_if_states_not_reached?: string[];
    }>;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SIMULATION RUNTIME DATA TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface RuntimeDbRecord {
  id: string;
  collection: string;
  fields: Record<string, string>;
  isAttacker: boolean;
  invalidates_resource?: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  ip: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "DNS" | "SYS";
  path: string;
  status: number;
  message: string;
  payload?: Payload;
  isAttacker?: boolean;
  source?: string;
  db_connection?: string;
}

export interface NetworkFlow {
  id: string;
  src: string;
  dst: string;
  dst_port: number;
  protocol: "TCP" | "UDP" | "HTTPS";
  bytes_per_second: number;
}

export interface FileState {
  file_path: string;
  content: string;
  patchedRuleIds: string[];
  activeDiffOptionId?: string;
}

export type AlertEntry = {
  id: string;
  level: "info" | "warning" | "critical";
  message: string;
  read: boolean;
  timestamp: number;
};

// ─────────────────────────────────────────────────────────────────────────────
// REPLAY
// ─────────────────────────────────────────────────────────────────────────────

export interface ReplayConfig {
  type: "state_machine_playback";
  narration: Array<{ at_state: string; text: string }>;
}
