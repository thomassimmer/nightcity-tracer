# Contributing to NightCity Tracer

## Tech stack

React 19, TypeScript 6, Vite 8, Tailwind v4, Lucide icons. 100% static/client-side.

## Project structure

```
src/
  components/
    panels/        # One file per panel type
    ui/            # Reusable UI primitives
  context/         # SimulationContext -- single source of truth for game state
  hooks/           # Custom hooks (usePanelManager, useTutorial, ...)
  scenarios/       # One directory per scenario + index.ts barrel export
  utils/           # Pure functions (gridLayout, saveState, ...)
  scenario.types.ts   # All TypeScript interfaces
  App.tsx             # Phase-based navigation (menu > briefing > hud > debrief)
  index.css           # Tailwind v4
  styles/             # tokens.css, primitives.css, effects.css, animations.css, features/
  index.css           # Tailwind @theme + style imports
```

---

## Adding a new scenario

### 1. Create the scenario directory

```
src/scenarios/my-scenario/
  index.ts
  assets/       # Source files, configs, logs (imported as raw strings)
```

### 2. Write `index.ts`

Export a single `Scenario` object. Use `src/scenarios/tutorial-jwt-bypass/index.ts` as the reference template -- it is the simplest complete example.

Required top-level fields:

| Field | Type | Notes |
|---|---|---|
| `id` | string | Kebab-case, unique |
| `version` | string | Semver e.g. `"1.0.0"` |
| `schema_version` | string | Currently `"2"` |
| `title` | string | Shown in the menu |
| `author` | string | Your name or team |
| `tags` | string[] | Used for filtering |
| `world` | WorldConfig | Corporation, role, theme, briefing |
| `gameplay` | GameplayConfig | Mode, difficulty, duration |
| `panels` | PanelDefinition[] | Investigation tools |
| `simulation` | SimulationConfig | Noise, attacker agent, defenses |
| `assets` | AssetConfig | Source files to display |
| `report` | ReportConfig | Fields the player must fill |
| `scoring` | ScoringConfig | Dimensions and weights |
| `replay` | ReplayConfig | Post-game narration |
| `tutorial` | TutorialConfig | Optional guided walkthrough |

---

### World config

```typescript
world: {
  corporation: 'Arasaka',           // arasaka | militech | netwatch | biotechnica | kang_tao | trauma_team
  player_role: 'Junior Forensic Analyst',
  location: 'Arasaka HQ -- Tokyo Data Center',
  ui_theme: 'arasaka',
  urgency_level: 'medium',          // low | medium | high | critical
  briefing: {
    title: 'Unauthorized Access Detected',
    body: 'Full briefing text...',
    sender: 'SOC Arasaka -- Tier 1',
    timestamp: '2077-05-15T09:30:00Z',
  },
},
```

---

### Gameplay config

```typescript
gameplay: {
  mode: 'postmortem',   // postmortem (review aftermath) | live (active attack)
  difficulty: 'beginner',  // beginner | intermediate | advanced
  duration_seconds: 300,
  allow_early_submit: true,
},
```

Start with `postmortem` -- no live state machine to wire up, much simpler to build.

---

### Panels

Each panel is an investigation tool. Common types:

| `type` | Purpose |
|---|---|
| `log_stream` | HTTP/system logs with filter bar |
| `terminal` | Predefined command outputs |
| `code_editor` | Display (or patch) source files |
| `file_explorer` | Browse a directory tree |
| `diff_viewer` | Before/after code comparison |
| `git_history` | Git log |
| `conversation_log` | Chat or LLM prompt logs |
| `thermal_map` | Grid heatmap for ICS scenarios |
| `email_chain` | Email inbox |
| `network_map` | Network topology |
| `jwt_decoder` | JWT token inspection |
| `admin_console` | Simulated admin panel endpoints |
| `memory_dump` | Process tree, hexdump, or strings list |
| `db_schema` | Database schema viewer |
| `cloud_config` | AWS / GCP / Azure / Kubernetes config |
| `config_file` | Generic config file viewer |
| `serverless_logs` | Serverless function execution logs |
| `k8s_logs` | Kubernetes audit logs |
| `badge_log` | Physical access badge log |
| `timeline_builder` | Interactive event timeline |
| `hex_viewer` | Raw binary file viewer |

`position` controls layout: `'main' | 'left' | 'right' | 'bottom'`.

```typescript
panels: [
  {
    id: 'server-logs',
    type: 'log_stream',
    label: 'Server Logs',
    position: 'main',
    default_open: false,
    config: { source: 'http', live: false, filter_bar: true, auto_scroll: false },
  },
  {
    id: 'forensic-shell',
    type: 'terminal',
    label: 'Terminal',
    position: 'bottom',
    default_open: true,
    config: {
      initial_history: [],
      commands: {
        'ps aux | grep uvicorn': [{ output: '...command output...' }],
      },
    },
  },
],
```

---

### Simulation

#### Noise generators

Background traffic that makes real attacker activity harder to spot.

```typescript
noise_generators: [
  {
    id: 'internal-traffic',
    type: 'http_traffic',
    requests_per_second: 1,
    ips_pool: ['10.0.0.12', '10.0.0.15'],
    endpoints: [
      { path: '/api/v1/health', method: 'GET', status: 200, weight: 5 },
    ],
  },
],
```

#### Attacker agent (live scenarios)

A state machine that drives the attack progression.

```typescript
attacker_agent: {
  ip: '198.51.100.7',
  states: [
    {
      id: 'recon',
      triggers: [{ type: 'time_elapsed', value: 60 }],
      delay: 0,
      actions: [
        {
          type: 'send_http_requests',
          requests_per_second: 1,
          duration: 3,
          paths: ['/docs', '/api/v1/health'],
          method: 'GET',
          status_sequence: [200, 200],
        },
        {
          type: 'notify_ui',
          level: 'warning',
          message: 'Unusual traffic from 198.51.100.7',
        },
      ],
      next_state: 'exploit',
    },
  ],
},
```

Trigger types: `time_elapsed`, `after_state_completed`, `incident_report_action`.

Action types: `send_http_requests`, `send_protocol_message`, `spawn_network_flow`, `wait`, `notify_ui`, `modify_file_integrity`, `game_over_failure`, `log_entry`.

#### Persistent attacker states (retry)

By default a state fires once and advances. Add a `retry` field to make the attacker repeat a state until a stop condition is met -- useful to simulate a persistent attacker who keeps trying as long as the vulnerability is open.

```typescript
{
  id: 'xss_injection',
  // ...
  retry: {
    interval: 90,                        // seconds to wait before each new attempt
    exit_if_resources: ['stolen_jwt'],   // stop retrying once this resource is acquired
    exit_if_flow_spawned: true,          // stop retrying once spawn_network_flow succeeds (IP not blocked)
  },
}
```

Stop conditions (all optional, any one triggers exit):

| Field | Stops when |
|---|---|
| `exit_if_resources` | Any listed resource is non-null in the runtime (e.g. credentials obtained) |
| `exit_if_flow_spawned` | A `spawn_network_flow` action in the same state established a flow (IP not blocked) |
| _(implicit)_ | The patch that `disable_states` this state is applied -- the state is skipped, not blocked |

A state that never stops retrying (no exit conditions) runs until the game timer ends. Useful for exfiltration states that apply pressure until game-over.

Resources are a natural way to model "attacker obtained X": declare them in `simulation.resources` with `initial_value: null`, then list them in `produces` on the state that acquires them. Use the same id in `exit_if_resources` on states that should stop once X exists.

#### Interactive defense

Defines the code patches the player can apply.

```typescript
interactive_defense: {
  code_patching_rules: [
    {
      id: 'fix-admin-auth',
      target_file: 'main.py',
      vulnerable_block_id: 'admin-no-auth',
      description: 'The /admin routes have no authentication.',
      vulnerable_lines: [37, 38, 39, 40],
      options: [
        {
          id: 'add-bearer',
          label: 'Add HTTPBearer dependency',
          explanation: 'Use FastAPI dependency injection to enforce token auth.',
          patch_diff: '--- a/main.py\n+++ b/main.py\n...',
          is_correct: true,
          feedback: 'Correct! HTTPBearer enforces token authentication.',
        },
      ],
      on_success: {
        effect: 'auth_enforced',
        disable_states: [],
        feedback: 'Authentication added to /admin/users.',
      },
    },
  ],
},
```

---

### Assets

Import source files as raw strings and reference them by `id`.

```typescript
import mainPy from './assets/main.py?raw';

assets: {
  files: [
    { id: 'main.py', content: mainPy },
  ],
},
```

---

### Incident report

Fields the player fills out and submits. Answers are checked against `correct_answer`.

**Design rules**

- Do not name vulnerability classes in field labels. Writing "XSS payload" or "format string injection" in the question tells the player what to look for before they have looked. Frame questions around observable symptoms or outcomes instead.
- The code patching mechanic already surfaces "where is the flaw" and "how does it work". Report fields must not duplicate what patching reveals.
- Each field should correspond to something the player discovers through active investigation: log entries, terminal output, network events. If the answer only appears in the source code, it belongs in a patch option, not a report field.
- Hints describe the expected format only (`e.g., 1.2.3.4`, `e.g., db_name`). Never use the hint to narrow the answer domain.
- Aim for 3-4 fields. More than that and the report starts feeling like a quiz where the questions hand out the answers.

```typescript
report: {
  fields: [
    {
      id: 'attacker_ip',
      label: 'Attacker IP Address',
      type: 'text',            // text | textarea | choice | multiselect
      required: true,
      hint: 'Filter the logs with: grep "admin"',
      correct_answer: '198.51.100.7',
      match_mode: 'exact',     // exact | contains | regex
      explanation: 'IP 198.51.100.7 originated outside the corporate network.',
    },
    {
      id: 'vulnerability_type',
      label: 'Vulnerability Type',
      type: 'choice',
      required: true,
      options: ['SQL Injection', 'Missing Authentication', 'XSS'],
      correct_answer: 'Missing Authentication',
      match_mode: 'exact',
      explanation: 'The /admin routes had no identity check.',
    },
  ],
},
```

---

### Scoring

Three dimension keys are recognized by `DebriefingScreen`: `speed`, `precision`, `defense_efficiency`. Weights must sum to 1.0.

```typescript
scoring: {
  dimensions: {
    speed: {
      type: 'time_pressure',
      weight: 0.25,
      config: {
        full_score_before: 300,   // full points if done before N seconds
        zero_score_after: 900,    // zero points after N seconds (linear decay)
      },
    },
    precision: {
      type: 'field_match',
      weight: 0.50,
      config: { partial_credit: true },
    },
    defense_efficiency: {
      type: 'interactive_mitigation',
      weight: 0.25,
      config: {
        mitigations: [
          { action: 'code_patched', points: 100 },
          { action: 'ip_blocked', points: 50 },
        ],
      },
    },
  },
  penalties: {
    false_positive_per_item: -10,
    incorrect_report_fields: -5,
  },
},
```

Omit `speed` or `defense_efficiency` if the scenario does not need them -- just adjust the remaining weights to still sum to 1.0.

---

### Replay

Post-game narration tied to attacker states.

```typescript
replay: {
  type: 'state_machine_playback',
  narration: [
    { at_state: 'recon', text: 'The attacker probed the API using the exposed Swagger UI.' },
    { at_state: 'exploit', text: 'Unauthenticated /admin access gave full user enumeration.' },
  ],
},
```

---

### Tutorial (optional)

Guided overlays for first-time players.

```typescript
tutorial: {
  enabled: true,
  allow_skip: true,
  steps: [
    {
      id: 'welcome',
      message: 'Welcome. You are a forensic analyst investigating a breach.',
      completed_by: { type: 'auto', delay_ms: 5000 },
    },
    {
      id: 'open-logs',
      message: 'Open the Server Logs panel.',
      highlight: 'panel-bar',         // panel-bar | report-btn | notif-btn | handbook-btn | briefing-btn | panel:<id>
      position: 'right',              // left | right
      completed_by: { type: 'panel_open', panel_id: 'server-logs' },
    },
    {
      id: 'patch-code',
      message: 'Apply the security fix in the code editor.',
      highlight: 'panel:api-source',
      completed_by: { type: 'code_patched' },
    },
  ],
},
```

Trigger types: `auto`, `panel_open`, `terminal_used`, `code_patched`, `report_submitted`.

---

### 3. Register in `src/scenarios/index.ts`

```typescript
// src/scenarios/index.ts
import { myScenario } from '@/scenarios/my-scenario';

export const SCENARIOS: Scenario[] = [
  // ... existing scenarios ...
  myScenario,
];
```

The menu screen lists all registered scenarios automatically.

---

## Checklist before opening a PR

- [ ] `id` is unique across all scenarios
- [ ] Scoring dimension keys are exactly `speed`, `precision`, `defense_efficiency`
- [ ] Scoring weights sum to 1.0
- [ ] No em dashes (--) in any user-facing strings
- [ ] All `report.fields` have a `correct_answer` and `explanation`
- [ ] Scenario runs start-to-finish without console errors
- [ ] If tutorial is included, all steps advance correctly
