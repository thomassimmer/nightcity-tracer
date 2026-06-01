# Attacker Engine: Step-Based Model

The live-mode attacker is driven by a dependency graph of **steps** rather than a linear state machine. Each step declares what it needs (`requires`) and what it produces (`generates`). The engine figures out what to run and what to re-run automatically.

---

## Core concepts

### Resources

Resources are named values that can be `null` (unavailable) or a non-null string (available). They represent attacker capabilities: a valid IP, a stored XSS payload, a stolen token, database credentials.

```ts
resources: [
  { id: "attacker_ip",   initial_value: "1.2.3.4", rotation_pool: "random" },
  { id: "stored_xss",    initial_value: null },
  { id: "stolen_jwt",    initial_value: null, revocation_key: "operator_jwt" },
  { id: "db_credentials", initial_value: null },
]
```

**`rotation_pool`**: when the IP is blocked, the engine immediately picks the next available IP from the pool. `"random"` generates a fresh random IP. An array cycles through the list, stopping when all are blocked.

**`revocation_key`**: identifies the resource that `token revoke <key>` in the terminal will set to null. Only relevant on token-type resources.

### Steps

Each step is one phase of the attack. A step fires when it is **eligible** (all its prerequisites are satisfied) and **needs to run** (its outputs are missing or it has never run).

```ts
{
  id: "xss_injection",
  requires: {
    resources: ["attacker_ip"],
    not_patched: ["patch-xss-services"],
  },
  generates: ["stored_xss"],
  delay: 12,
  retry_interval: 90,
  actions: [ ... ],
}
```

| Field | Description |
|---|---|
| `requires.resources` | Resource IDs that must be non-null before this step can run |
| `requires.not_patched` | Code patch rule IDs: if any of these have been applied, the step is blocked |
| `generates` | Resource IDs set to `"available"` (or a new IP if `rotation_pool`) when the step completes |
| `delay` | Seconds to wait after the step first becomes eligible before starting actions |
| `retry_interval` | After the step completes, seconds before it can run again (useful for re-plant or re-exfil) |
| `actions` | The HTTP requests, notifications, network flows, etc. to execute |

Steps without `generates` run exactly once.

### game_over_action

The game-over failure message, triggered when the scenario timer expires:

```ts
attacker_agent: {
  game_over_action: {
    type: "game_over_failure",
    reason: "Database dump complete. ...",
  },
  steps: [ ... ],
}
```

---

## Execution algorithm

Every tick the engine evaluates all steps and picks the **most advanced eligible step that still needs to run**:

1. For each step (in declaration order):
   - All `requires.resources` must be non-null.
   - No rule in `requires.not_patched` must be in the patched-rules set.
   - If the step has `generates`: at least one generated resource is null. If no `generates`: the step has never completed.
   - The step must not be in its `retry_interval` cooldown.
2. Among all steps passing those checks, pick the **last one** (highest index). This means the attacker always pushes to the furthest reachable point in the chain.
3. Execute that step's actions (with `delay` applied on first eligibility).
4. On completion: set generated resources to non-null, add the step to `stepReachedIds`, start the `retry_interval` cooldown if set.

---

## Defensive actions

Each defensive action targets exactly one resource. No cascades.

| Action | Effect |
|---|---|
| `waf block <ip>` | Sets the `attacker_ip` resource to a new IP via `rotation_pool` (or null if pool exhausted). Steps requiring `attacker_ip` are blocked until the new IP is available. |
| `token revoke <key>` | Sets the resource with `revocation_key === key` to null. Steps that `generates` it will re-run to re-steal. Steps that `requires` it are blocked until then. |
| Correct code patch | Adds the rule ID to `patchedRuleIds`. Any step with `not_patched: [this_id]` is permanently blocked. Can optionally set `invalidates_resources` to null out specific resources. |
| `db delete <col>/<id>` | For records with `invalidates_resource`: sets that resource to null and records the deletion for scoring. Steps that generated it can re-run. |

The key insight: **deleting the stored XSS does not automatically revoke the stolen JWT**. If the victim already opened the brief, the JWT exists independently. The player must revoke the JWT separately.

---

## Writing a new scenario

### 1. Define resources

List only the resources that have defensive significance (can be blocked, revoked, or deleted by the player) or that act as ordering dependencies between steps.

```ts
resources: [
  { id: "attacker_ip", initial_value: "X.X.X.X", rotation_pool: "random" },
  { id: "foothold",    initial_value: null },
  { id: "session_token", initial_value: null, revocation_key: "admin_session" },
]
```

### 2. Define steps

Order matters: the engine picks the highest-index eligible step. Use `requires.resources` to create explicit ordering dependencies:

```ts
steps: [
  {
    id: "recon",
    requires: { resources: ["attacker_ip"] },
    delay: 10,
    actions: [ ... ],
  },
  {
    id: "exploit",
    requires: { resources: ["attacker_ip"] },
    generates: ["foothold"],
    not_patched: ["patch-vuln"],
    delay: 5,
    retry_interval: 60,
    actions: [ ... ],
  },
  {
    id: "lateral_move",
    requires: { resources: ["foothold", "attacker_ip"] },
    actions: [ ... ],
  },
]
```

**Important:** the engine always picks the highest-index eligible step. If two consecutive steps both only require `attacker_ip`, the second one will always win and the first will never run. The fix is always the same: make the first step generate an intermediate resource that the second requires.

If step B must always run after step A but A produces nothing meaningful, add an intermediate resource: `A generates: ["a_done"]`, `B requires: { resources: ["a_done"] }`.

### 3. Define interactive_defense

```ts
interactive_defense: {
  network_rules: { allow_ip_blocking: true, action_hook: "waf_block" },
  session_rules:  { allow_revocation: true, action_hook: "jwt_revoke" },
  code_patching_rules: [
    {
      id: "patch-vuln",
      on_success: {
        effect: "vuln_patched",
        invalidates_resources: [],  // optionally null out resources
        feedback: "Patch deployed.",
      },
      ...
    },
  ],
}
```

### 4. Update terminal and DB panel config

Use `requires_resource`:

```ts
// Terminal command with conditional output
"ps aux": [
  { output: "...normal output..." },
  { output: "...with attacker process...", requires_resource: "foothold" },
]

// DB record deletable by player
{
  id: "injected_record",
  display_lines: [ "..." ],
  requires_resource: "foothold",
  xss_key: "collection/record_id",
  invalidates_resource: "foothold",
}
```

### 5. Reference step IDs in report and scoring

Use step IDs in `skip_if_states_not_reached`:

```ts
// report field
{ skip_if_states_not_reached: ["exploit"] }

// scoring mitigation
{ action: "session_revoked", points: 25, skip_if_states_not_reached: ["lateral_move"] }
```

---

## How re-acquisition works

When a resource is invalidated, the engine naturally re-runs the step that generates it, as long as the step's `requires` are still satisfied.

Example flow:
1. `victim_loads_brief` generates `stolen_jwt`.
2. Player revokes the JWT: `stolen_jwt = null`.
3. Next tick: the engine finds `victim_loads_brief` is eligible (stored_xss is still non-null) and needs to run (stolen_jwt is null). It re-runs automatically.
4. All downstream steps (`admin_fuzzing`, `sqli_injection`) are blocked while `stolen_jwt` is null, then resume once re-stolen.
