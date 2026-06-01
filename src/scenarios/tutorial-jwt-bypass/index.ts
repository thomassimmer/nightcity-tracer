import type { Scenario } from "@/scenario.types";

import dispatchPy from "./assets/dispatch.py?raw";

const ATTACKER_TOKEN =
  "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0" +
  ".eyJzdWIiOiI5OSIsIm5hbWUiOiJnaG9zdF9vcGVyYXRvciIsInJvbGUiOiJhZG1pbiIsImNsZWFyYW5jZSI6MTAsImlhdCI6MzM4OTk3NzgwMH0" +
  ".";

export const tutorialJwtBypass: Scenario = {
  id: "tutorial-jwt-bypass",
  version: "1.0.0",
  schema_version: "1.0",
  title: "Trauma Team Dispatch: Token Forgery",
  author: "NightCity Tracer",
  tags: ["tutorial", "beginner", "python", "fastapi"],

  world: {
    corporation: "Trauma Team International",
    player_role: "Incident Response Analyst",
    location: "TTI Operations Center, Night City",
    ui_theme: "trauma_team",
    urgency_level: "critical",
    briefing: {
      title: "Dispatch System Compromise: Two P1 Rescues Aborted",
      sender: "TTI Security Operations, Code Red",
      timestamp: "2077-05-15T10:15:00Z",
      body: `Analyst,

At 09:47 this morning, two Priority 1 rescues were pulled from the queue. Sara Vance and Eli Park, North Oak. Both in critical condition. Neither was reached in time.

The cancellations were logged as valid admin actions. No operator was on shift.

Find out how it happened and close the hole.

TTI-SOC, Alpha Response`,
    },
  },

  gameplay: {
    mode: "postmortem",
    difficulty: "beginner",
    duration_seconds: 420,
    allow_early_submit: true,
  },

  panels: [
    {
      id: "access-logs",
      type: "log_stream",
      label: "Access Logs",
      description: "Uvicorn HTTP access log. Filter by IP or endpoint.",
      position: "main",
      default_open: false,
      config: {
        source: "access",
        live: true,
        filter_bar: true,
        auto_scroll: true,
      },
    },
    {
      id: "app-logs",
      type: "log_stream",
      label: "App Logs",
      description:
        "Debug middleware output. Logs Authorization headers for every request.",
      position: "main",
      default_open: false,
      config: {
        source: "app",
        live: true,
        filter_bar: true,
        auto_scroll: true,
      },
    },
    {
      id: "forensic-shell",
      type: "terminal",
      label: "Terminal",
      description: "Forensic shell with decode-jwt and standard Unix tools.",
      position: "bottom",
      default_open: true,
      config: {
        initial_history: [],
        log_files: { "access.log": "access", "app.log": "app" },
        commands: {
          'grep "185.220.101.45" app.log': [
            {
              output: [
                "2077-05-15T09:47:12Z DEBUG  [dispatch.middleware] 185.220.101.45 -- Authorization: Bearer " +
                  ATTACKER_TOKEN,
                '2077-05-15T09:47:12Z INFO   [uvicorn.access] 185.220.101.45:62211 - "GET /dispatch/queue HTTP/1.1" 200 OK',
                '2077-05-15T09:47:20Z INFO   [uvicorn.access] 185.220.101.45:62211 - "POST /dispatch/admin/cancel/801 HTTP/1.1" 200 OK',
                '2077-05-15T09:47:21Z INFO   [uvicorn.access] 185.220.101.45:62211 - "POST /dispatch/admin/cancel/802 HTTP/1.1" 200 OK',
              ].join("\n"),
            },
          ],
          [`decode-jwt ${ATTACKER_TOKEN}`]: [
            {
              output: [
                "[HEADER]",
                '  alg: "none"       <-- WARNING: no signature verification',
                '  typ: "JWT"',
                "",
                "[PAYLOAD]",
                '  sub:       "99"',
                '  name:      "ghost_operator"',
                '  role:      "admin"',
                "  clearance: 10",
                "  iat:       3389977800  (2077-05-15 09:30:00 UTC)",
                "",
                "[SIGNATURE]",
                '  <empty>: algorithm "none" skips signature verification entirely',
              ].join("\n"),
            },
          ],
          "pip show python-jose": [
            {
              output:
                "Name: python-jose\nVersion: 3.3.0\nLocation: /usr/local/lib/python3.11/site-packages",
            },
          ],
          "python --version": [{ output: "Python 3.11.9" }],
        },
      },
    },
    {
      id: "dispatch-api",
      type: "code_editor",
      label: "Source Code",
      description:
        "FastAPI dispatch service. Look for the JWT decode call in get_current_user.",
      position: "right",
      default_open: false,
      config: { language: "python", file_path: "dispatch.py", read_only: true },
    },
  ],

  simulation: {
    resources: [
      {
        id: "attacker_ip",
        initial_value: "185.220.101.45",
      },
    ],
    noise_generators: [
      {
        id: "operator-traffic",
        type: "http_traffic",
        requests_per_second: 1,
        emit_app_log: true,
        ips_pool: [
          "172.16.0.11",
          "172.16.0.14",
          "172.16.0.22",
          "172.16.0.33",
          "172.16.0.50",
        ],
        endpoints: [
          { path: "/dispatch/queue", method: "GET", status: 200, weight: 5 },
          { path: "/dispatch/status", method: "GET", status: 200, weight: 3 },
          { path: "/api/v1/health", method: "GET", status: 200, weight: 2 },
          {
            path: "/dispatch/mission/update",
            method: "POST",
            status: 200,
            weight: 3,
            payloads: [
              '{"mission_id":803,"status":"en_route","eta_minutes":7,"operator":"D.Reyes"}',
              '{"mission_id":805,"status":"on_scene","eta_minutes":0,"operator":"K.Nakamura"}',
              '{"mission_id":798,"status":"transport","eta_minutes":14,"operator":"M.Santos"}',
              '{"mission_id":810,"status":"cleared","eta_minutes":0,"operator":"A.Park"}',
              '{"mission_id":812,"status":"en_route","eta_minutes":22,"operator":"T.Okafor"}',
            ],
          },
        ],
      },
    ],

    interactive_defense: {
      code_patching_rules: [
        {
          id: "fix-jwt-algorithm",
          target_file: "dispatch.py",
          vulnerable_block_id: "jwt-no-algorithm",
          description:
            'jwt.decode() accepts any algorithm declared in the token header, including "none". An attacker can forge a token claiming alg:none and bypass signature verification entirely.',
          vulnerable_lines: [24],
          options: [
            {
              id: "whitelist-hs256",
              label: 'Add algorithms=["HS256"]',
              explanation:
                "Explicitly whitelist HS256 as the only accepted algorithm. The library will reject any token whose header declares a different algorithm.",
              patch_diff: `--- a/dispatch.py
+++ b/dispatch.py
@@ -22,7 +22,7 @@
 def get_current_user(token = Depends(security)):
     try:
-        payload = jwt.decode(token.credentials, SECRET_KEY)
+        payload = jwt.decode(token.credentials, SECRET_KEY, algorithms=["HS256"])
         return payload
     except JWTError:
         raise HTTPException(status_code=401, detail="Invalid token")`,
              is_correct: true,
              feedback:
                'Correct. algorithms=["HS256"] forces the library to reject any token whose header declares a different algorithm. The alg:none token is now a JWTError at decode time.',
            },
            {
              id: "rotate-secret",
              label: "Move SECRET_KEY to environment variable",
              explanation:
                "Avoid hardcoding secrets. Read the JWT signing key from an environment variable at startup.",
              patch_diff: `--- a/dispatch.py
+++ b/dispatch.py
@@ -1,5 +1,6 @@
 from fastapi import FastAPI, Depends, HTTPException
 from fastapi.security import HTTPBearer
 from jose import jwt, JWTError
 import logging
+import os

@@ -9,1 +10,1 @@
-SECRET_KEY = "tt-int-dispatch-jwt-2077"
+SECRET_KEY = os.environ["JWT_SECRET"]`,
              is_correct: false,
              feedback:
                'Wrong. The alg:none attack never uses the secret key: the library skips signature verification entirely when the algorithm is "none". Rotating the key has zero effect. The attacker can still forge tokens without knowing the secret.',
            },
            {
              id: "verify-exp",
              label: "Enable explicit expiry verification",
              explanation:
                'Pass options={"verify_exp": True} to ensure tokens are always checked for expiry.',
              patch_diff: `--- a/dispatch.py
+++ b/dispatch.py
@@ -23,7 +23,7 @@
     try:
-        payload = jwt.decode(token.credentials, SECRET_KEY)
+        payload = jwt.decode(token.credentials, SECRET_KEY, options={"verify_exp": True})
         return payload
     except JWTError:
         raise HTTPException(status_code=401, detail="Invalid token")`,
              is_correct: false,
              feedback:
                "Wrong. verify_exp checks the exp claim; it is already the default and does not address algorithm confusion. The attacker's token includes a valid future exp. Signature verification is still skipped entirely.",
            },
          ],
          on_success: {
            effect: "auth_enforced",
            feedback:
              "jwt.decode now rejects any token with alg != HS256. The forged token raises JWTError.",
          },
        },
      ],
    },

    attacker_agent: {
      steps: [
        {
          id: "probe",
          delay: 50,
          generates: ["probe_done"],
          actions: [
            {
              type: "send_http_requests",
              requests_per_second: 1,
              duration: 3,
              paths: ["/dispatch/queue", "/dispatch/status", "/openapi.json"],
              method: "GET",
              status_sequence: [401, 401, 200],
            },
            {
              type: "notify_ui",
              level: "warning",
              message:
                "Anomalous probe activity on dispatch API: multiple unauthenticated requests from an external source.",
            },
          ],
        },
        {
          id: "token_forge",
          requires: { resources: ["probe_done"] },
          delay: 12,
          generates: ["token_forge_done"],
          actions: [
            {
              type: "send_http_requests",
              requests_per_second: 1,
              duration: 2,
              paths: ["/dispatch/queue", "/dispatch/status"],
              method: "GET",
              status_sequence: [200, 200],
            },
            {
              type: "log_entry",
              source: "app",
              message: `DEBUG [dispatch.middleware] 185.220.101.45 -- Authorization: Bearer ${ATTACKER_TOKEN}`,
            },
          ],
        },
        {
          id: "mission_cancel",
          requires: { resources: ["token_forge_done"] },
          delay: 8,
          actions: [
            {
              type: "send_http_requests",
              requests_per_second: 1,
              duration: 2,
              paths: [
                "/dispatch/admin/cancel/801",
                "/dispatch/admin/cancel/802",
              ],
              method: "POST",
              status_sequence: [200, 200],
            },
            {
              type: "notify_ui",
              level: "critical",
              message:
                "CRITICAL: Two P1 missions cancelled: Sara Vance and Eli Park (North Oak district). Clients unreachable.",
            },
          ],
        },
      ],
    },
  },

  assets: {
    files: [{ id: "dispatch.py", content: dispatchPy }],
  },

  report: {
    fields: [
      {
        id: "attacker_ip",
        label: "Attacker IP Address",
        type: "text",
        required: true,
        hint: 'Run: grep "185" app.log in the terminal.',
        correct_answer: "185.220.101.45",
        match_mode: "exact",
        explanation:
          "185.220.101.45 is an external IP that accessed the dispatch API using a forged JWT.",
      },
      {
        id: "jwt_algorithm",
        label: "Algorithm in the Forged Token",
        type: "text",
        required: true,
        hint: "Run decode-jwt on the Bearer token visible in the grep output.",
        correct_answer: "none",
        match_mode: "contains",
        explanation:
          'The attacker set alg:"none" in the JWT header. python-jose accepted it and skipped signature verification.',
      },
      {
        id: "vulnerability_type",
        label: "Vulnerability Class",
        type: "choice",
        required: true,
        hint: "Look at the jwt.decode() call in get_current_user: what parameter is missing?",
        options: [
          "JWT algorithm confusion (alg: none)",
          "Hardcoded secret key",
          "Missing authentication",
          "SQL Injection",
        ],
        correct_answer: "JWT algorithm confusion (alg: none)",
        match_mode: "exact",
        explanation:
          'The jwt.decode() call does not whitelist the expected algorithm. python-jose accepts any algorithm declared in the token header, including "none" which has no signature.',
      },
    ],
  },

  scoring: {
    dimensions: {
      speed: {
        type: "time_pressure",
        weight: 0.15,
        config: { full_score_before: 180, zero_score_after: 420 },
      },
      precision: {
        type: "field_match",
        weight: 0.6,
        config: { partial_credit: true },
      },
      defense_efficiency: {
        type: "interactive_mitigation",
        weight: 0.25,
        config: {
          mitigations: [{ action: "code_patched", points: 100 }],
        },
      },
    },
  },

  defense_takeaways: [
    'Whitelist accepted algorithms server-side: never let the token\'s alg header drive validation. Pass algorithms=["RS256"] explicitly to PyJWT; an empty or missing list opens the door to alg:none.',
    "Prefer asymmetric signing (RS256, ES256): verifying services hold only the public key, so a leaked verification key cannot be used to forge tokens.",
    "Log every JWT validation failure with the raw header and source IP. Anomalous algorithms or unexpected claims are an early-warning signal.",
    "Set short token expiry (15 min or less) and use refresh tokens to limit blast radius. A stolen long-lived token becomes a skeleton key.",
    "Never log Authorization headers in production. The debug middleware that captured the Bearer token in this scenario is itself a credential leak.",
  ],
  replay: {
    type: "state_machine_playback",
    narration: [
      {
        at_state: "probe",
        text: "Attacker probes the API. Unauthenticated requests return 401, but the OpenAPI schema is public.",
      },
      {
        at_state: "token_forge",
        text: "Attacker forges a JWT with alg:none and clearance:10. python-jose accepts it without signature verification.",
      },
      {
        at_state: "mission_cancel",
        text: "Using the forged admin token, the attacker cancels two P1 rescues. Both clients are now unreachable.",
      },
    ],
  },

  tutorial: {
    enabled: true,
    allow_skip: true,
    steps: [
      {
        id: "welcome",
        message:
          "Welcome to NightCity Tracer. Trauma Team International deploys armored medical units across Night City. Access is subscription-only: no verified credential, no rescue. Two P1 missions were cancelled this morning without authorization. Reconstruct what happened, patch the vulnerability, and file the report.",
        completed_by: { type: "auto", delay_ms: 5000 },
      },
      {
        id: "intro-notif",
        message:
          "The bell icon contains the security alerts generated by the attacker during the incident. Review them to reconstruct the attack timeline.",
        highlight: "notif-btn",
        position: "right",
        completed_by: { type: "auto", delay_ms: 4000 },
      },
      {
        id: "intro-handbook",
        message:
          "The ? icon opens the Handbook: your investigation tools, and keyboard shortcuts.",
        highlight: "handbook-btn",
        position: "right",
        completed_by: { type: "auto", delay_ms: 4000 },
      },
      {
        id: "intro-briefing",
        message:
          "The BRIEFING button lets you re-read the mission brief at any time.",
        highlight: "briefing-btn",
        position: "right",
        completed_by: { type: "auto", delay_ms: 3000 },
      },
      {
        id: "open-logs",
        message:
          'The tool bar below lists your investigation panels. Open "Access Logs" to see the HTTP traffic log.',
        highlight: "panel-bar",
        completed_by: { type: "panel_open", panel_id: "access-logs" },
      },
      {
        id: "read-logs",
        message:
          "Scan for requests from an IP outside the internal range (172.16.x.x). Look for unusual endpoints like /dispatch/admin/cancel or repeated probing of unauthenticated routes.",
        highlight: "panel:access-logs",
        position: "right",
        completed_by: { type: "auto", delay_ms: 7000 },
      },
      {
        id: "use-terminal-grep",
        message:
          "The debug middleware logged Authorization headers to app.log. Use grep to filter by the suspicious IP you spotted and look for any Bearer token. Type help to see all available commands, including scenario-specific tools like decode-jwt.",
        highlight: "panel:forensic-shell",
        completed_by: { type: "terminal_used" },
      },
      {
        id: "use-terminal-decode",
        message:
          "The grep output contains a Bearer token. Copy it and run decode-jwt on it. Check what the header says about how this token was signed.",
        highlight: "panel:forensic-shell",
        completed_by: { type: "terminal_command", command: "decode-jwt" },
      },
      {
        id: "open-source",
        message:
          'What does the token header tell you about how it was accepted? Open "Source Code" and look at how the application validates tokens.',
        highlight: "panel-bar",
        completed_by: { type: "panel_open", panel_id: "dispatch-api" },
      },
      {
        id: "patch-code",
        message:
          "Find the token validation function in the source. The vulnerable line is clickable and will offer three repair options. Think about what the decode call is not enforcing.",
        highlight: "panel:dispatch-api",
        completed_by: { type: "code_patched" },
      },
      {
        id: "file-report",
        message:
          "You have all the evidence. Click FILE REPORT to submit your incident report.",
        highlight: "report-btn",
        position: "right",
        completed_by: { type: "report_submitted" },
      },
    ],
  },
};
