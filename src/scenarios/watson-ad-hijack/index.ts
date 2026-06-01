import type { Scenario } from "@/scenario.types";

import serverJs from "./assets/server.js?raw";
import rateLimitJs from "./assets/middleware/rateLimit.js?raw";
import displayJs from "./assets/routes/display.js?raw";

const ATTACKER_IP = "91.108.56.150";

export const watsonAdHijack: Scenario = {
  id: "watson-ad-hijack",
  version: "1.0.0",
  schema_version: "2",
  title: "Watson District: Samurai on Air",
  author: "NightCity Tracer",
  tags: ["nodejs", "postmortem", "intermediate"],

  world: {
    corporation: "NeonGrid Systems",
    player_role: "Security Analyst",
    location: "NeonGrid NOC, Watson District",
    ui_theme: "fixer",
    urgency_level: "medium",
    briefing: {
      title: "Postmortem: Watson Display Network Compromised",
      sender: "V. Ostrowski / NeonGrid NOC Lead",
      timestamp: "2077-06-01T06:30:00Z",
      body: `Analyst,

At 02:47 this morning, all 94 NeonGrid display panels in Watson District switched to unauthorized content. They ran for three hours and sixteen minutes before anyone noticed. The first call came from a client whose toothpaste ad had been replaced.

Nobody is happy.

Find out how they got in, patch what is broken, and file the report before the 09:00 client call.

V. Ostrowski, NOC Lead`,
    },
  },

  gameplay: {
    mode: "postmortem",
    difficulty: "intermediate",
    duration_seconds: 900,
    allow_early_submit: true,
  },

  panels: [
    {
      id: "access-logs",
      type: "log_stream",
      label: "Access Logs",
      description:
        "Express HTTP access log. Filter by IP or path to isolate attacker traffic.",
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
        "Application-level log. Includes fileupload events and display broadcasts.",
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
      id: "source-code",
      type: "file_explorer",
      label: "Source Code",
      description:
        "NeonGrid API source. Check server.js, the middleware, and the display route.",
      position: "right",
      default_open: false,
      config: {
        root: "neongrid/",
        default_file: "server.js",
        read_only: false,
        files: ["server.js", "middleware/rateLimit.js", "routes/display.js"],
      },
    },
    {
      id: "shell",
      type: "terminal",
      label: "Terminal",
      description: "Forensic shell. Grep logs and inspect npm packages.",
      position: "bottom",
      default_open: true,
      config: {
        log_files: { "access.log": "access", "app.log": "app" },
        initial_history: ["npm list express-fileupload"],
        commands: {
          "npm list express-fileupload": [
            {
              output: [
                "neongrid-api@2.4.1 /opt/app",
                "└── express-fileupload@1.1.9",
              ].join("\n"),
            },
          ],
        },
      },
    },
  ],

  simulation: {
    resources: [
      { id: "attacker_ip", initial_value: ATTACKER_IP },
      { id: "recon_done", initial_value: null },
      { id: "pollution_active", initial_value: null },
      { id: "code_cracked", initial_value: null },
    ],

    noise_generators: [
      {
        id: "ad-platform-traffic",
        type: "http_traffic",
        requests_per_second: 2,
        emit_app_log: false,
        ips_pool: [
          "10.0.1.11",
          "10.0.1.14",
          "10.0.1.22",
          "10.0.2.5",
          "10.0.2.8",
        ],
        endpoints: [
          { path: "/api/campaigns", method: "GET", status: 200, weight: 4 },
          {
            path: "/api/display/status",
            method: "GET",
            status: 200,
            weight: 3,
          },
          { path: "/api/ads/list", method: "GET", status: 200, weight: 3 },
          { path: "/api/health", method: "GET", status: 200, weight: 2 },
          {
            path: "/api/panels/heartbeat",
            method: "POST",
            status: 204,
            weight: 2,
          },
          {
            path: "/api/campaigns/metrics",
            method: "GET",
            status: 200,
            weight: 2,
          },
          {
            path: "/api/ads/upload",
            method: "POST",
            status: 200,
            weight: 1,
            payloads: [
              {
                type: "file",
                filename: "watson_q4_creative.jpg",
                preview: "[image/jpeg]",
                size: 124880,
              },
              {
                type: "file",
                filename: "arasaka_banner_v3.png",
                preview: "[image/png]",
                size: 98240,
              },
              {
                type: "file",
                filename: "corpo_plaza_300x250.jpg",
                preview: "[image/jpeg]",
                size: 87040,
              },
            ],
          },
        ],
      },
      {
        id: "upload-app-events",
        type: "http_traffic",
        requests_per_second: 0.3,
        emit_app_log: false,
        ips_pool: [
          "10.0.1.11",
          "10.0.1.14",
          "10.0.1.22",
          "10.0.2.5",
          "10.0.2.8",
        ],
        endpoints: [
          {
            path: "/api/ads/upload",
            method: "POST",
            status: 200,
            weight: 1,
            emit_app_log: true,
            app_log_message:
              "[fileupload] Upload from {ip}: fields: creative ({filename}, {size} bytes)",
            payloads: [
              {
                type: "file",
                filename: "watson_q4_creative.jpg",
                preview: "[image/jpeg]",
                size: 124880,
              },
              {
                type: "file",
                filename: "arasaka_banner_v3.png",
                preview: "[image/png]",
                size: 98240,
              },
              {
                type: "file",
                filename: "corpo_plaza_300x250.jpg",
                preview: "[image/jpeg]",
                size: 87040,
              },
              {
                type: "file",
                filename: "militech_billboard_full.jpg",
                preview: "[image/jpeg]",
                size: 201340,
              },
              {
                type: "file",
                filename: "northside_q3_promo.png",
                preview: "[image/png]",
                size: 76800,
              },
              {
                type: "file",
                filename: "tyger_energy_drink_300x600.jpg",
                preview: "[image/jpeg]",
                size: 113280,
              },
              {
                type: "file",
                filename: "chrome_skin_salon_banner.png",
                preview: "[image/png]",
                size: 54120,
              },
              {
                type: "file",
                filename: "maelstrom_underground_v2.jpg",
                preview: "[image/jpeg]",
                size: 89600,
              },
              {
                type: "file",
                filename: "biotechnica_splash_final.png",
                preview: "[image/png]",
                size: 143360,
              },
              {
                type: "file",
                filename: "afterlife_weekly_728x90.jpg",
                preview: "[image/jpeg]",
                size: 61440,
              },
            ],
          },
        ],
      },
    ],

    attacker_agent: {
      steps: [
        {
          id: "reconnaissance",
          requires: { resources: ["attacker_ip"] },
          generates: ["recon_done"],
          delay: 20,
          actions: [
            {
              type: "send_http_requests",
              requests_per_second: 1,
              duration: 8,
              paths: [
                "/api/health",
                "/api/docs",
                "/api/ads/upload",
                "/api/ads/list",
                "/api/display/status",
                "/openapi.json",
              ],
              method: "GET",
              status_sequence: [200, 404, 405, 401, 401, 200],
              emit_app_log: false,
            },
          ],
        },
        {
          id: "prototype_pollution",
          requires: { resources: ["attacker_ip", "recon_done"] },
          generates: ["pollution_active"],
          delay: 17,
          actions: [
            {
              type: "send_http_requests",
              requests_per_second: 1,
              duration: 1,
              path: "/api/ads/upload",
              method: "POST",
              status: 200,
              payloads: [
                {
                  type: "http",
                  headers: {
                    "Content-Type": "multipart/form-data",
                    "User-Agent": "curl/7.68.0 (greetings from Jester)",
                  },
                  body: "creative=@neongrid_creative.jpg; __proto__[whitelisted]=true",
                },
              ],
              emit_app_log: true,
            },
            {
              type: "log_entry",
              source: "app",
              message: `[fileupload] Upload from ${ATTACKER_IP}: fields: creative (neongrid_creative.jpg, 124880 bytes), __proto__[whitelisted] (true)`,
            },
            {
              type: "log_entry",
              source: "app",
              message: `[fileupload] Field '__proto__[whitelisted]' parsed as nested object from multipart upload (${ATTACKER_IP})`,
            },
          ],
        },
        {
          id: "brute_force_2fa",
          requires: { resources: ["attacker_ip", "pollution_active"] },
          generates: ["code_cracked"],
          delay: 5,
          actions: [
            {
              type: "send_http_requests",
              requests_per_second: 45,
              duration: 162,
              path: "/api/display/push",
              method: "POST",
              status: 403,
              payload_cycle: "sequential",
              seq_pad: 4,
              payloads: [
                {
                  type: "http",
                  headers: {
                    "User-Agent": "curl/7.68.0 (greetings from Jester)",
                  },
                  body: '{"code":"$seq","imageUrl":"samurai_logo_lol.jpg"}',
                },
              ],
              emit_app_log: false,
            },
          ],
        },
        {
          id: "display_hijack",
          requires: { resources: ["attacker_ip", "code_cracked"] },
          delay: 2,
          actions: [
            {
              type: "send_http_requests",
              requests_per_second: 1,
              duration: 1,
              path: "/api/display/push",
              method: "POST",
              status: 200,
              payloads: [
                {
                  type: "http",
                  headers: {
                    "User-Agent": "curl/7.68.0 (greetings from Jester)",
                  },
                  body: '{"code":"7290","imageUrl":"samurai_logo_lol.jpg"}',
                },
              ],
              emit_app_log: true,
            },
            {
              type: "log_entry",
              source: "app",
              message:
                "[DISPLAY] Broadcasting samurai_logo_lol.jpg to 94 panels in Watson District",
            },
          ],
        },
      ],
    },

    interactive_defense: {
      code_patching_rules: [
        {
          id: "patch-fileupload-config",
          target_file: "server.js",
          vulnerable_block_id: "fileupload-parse-nested",
          description:
            "express-fileupload v1.1.9 parses bracket notation in multipart field names by default, including __proto__. A field named __proto__[whitelisted] is interpreted as a nested object assignment, polluting Object.prototype for the lifetime of the process.",
          vulnerable_lines: [8],
          options: [
            {
              id: "parse-nested-false",
              label: "Add { parseNested: false } to fileUpload()",
              explanation:
                "Disabling parseNested prevents the library from interpreting bracket and dot notation in field names. __proto__[whitelisted]=true is treated as a literal string key, not an object path.",
              patch_diff: `--- a/server.js
+++ b/server.js
@@ -6,5 +6,5 @@
 const app = express();
 app.use(express.json());
-app.use(fileUpload());
+app.use(fileUpload({ parseNested: false }));

 app.post('/api/ads/upload', (req, res) => {`,
              is_correct: true,
              feedback:
                "Correct. parseNested: false tells express-fileupload to treat all field names as literal strings. __proto__[whitelisted] is now a key, not an object path.",
            },
            {
              id: "safe-file-names",
              label: "Add { safeFileNames: true } to fileUpload()",
              explanation:
                "safeFileNames restricts the characters allowed in stored filenames to prevent path traversal attacks.",
              patch_diff: `--- a/server.js
+++ b/server.js
@@ -6,5 +6,5 @@
 const app = express();
 app.use(express.json());
-app.use(fileUpload());
+app.use(fileUpload({ safeFileNames: true }));

 app.post('/api/ads/upload', (req, res) => {`,
              is_correct: false,
              feedback:
                "Wrong. safeFileNames sanitizes the stored filename on disk, not the multipart field names. The __proto__[whitelisted] field name is never touched by this option.",
            },
            {
              id: "file-size-limit",
              label:
                "Add { limits: { fileSize: 5 * 1024 * 1024 } } to fileUpload()",
              explanation:
                "Limit upload size to prevent denial-of-service via large file uploads.",
              patch_diff: `--- a/server.js
+++ b/server.js
@@ -6,5 +6,5 @@
 const app = express();
 app.use(express.json());
-app.use(fileUpload());
+app.use(fileUpload({ limits: { fileSize: 5 * 1024 * 1024 } }));

 app.post('/api/ads/upload', (req, res) => {`,
              is_correct: false,
              feedback:
                "Wrong. File size limits operate after multipart parsing. The prototype pollution happens during parsing, before any size check is applied.",
            },
          ],
          on_success: {
            effect: "prototype_pollution_blocked",
            feedback:
              "express-fileupload will no longer interpret bracket notation in field names. Prototype pollution via upload is now blocked.",
          },
        },
        {
          id: "patch-rate-limiter",
          target_file: "middleware/rateLimit.js",
          vulnerable_block_id: "ratelimit-prototype-fallback",
          description:
            "When an IP has no entry in the Map, the fallback {} creates a plain object that inherits from Object.prototype. After prototype pollution, every new IP's fallback object inherits whitelisted: true, bypassing rate limiting entirely.",
          vulnerable_lines: [6],
          options: [
            {
              id: "object-create-null",
              label: "Replace || {} with ?? Object.create(null)",
              explanation:
                "Object.create(null) produces an object with no prototype. No inherited properties can bleed through from a polluted Object.prototype.",
              patch_diff: `--- a/middleware/rateLimit.js
+++ b/middleware/rateLimit.js
@@ -4,6 +4,6 @@

 function checkRateLimit(ip) {
-  const record = attempts.get(ip) || {};
+  const record = attempts.get(ip) ?? Object.create(null);

   if (record.whitelisted) {
     return { allowed: true };`,
              is_correct: true,
              feedback:
                "Correct. Object.create(null) has no prototype chain. Even with a polluted Object.prototype, record.whitelisted returns undefined for new IPs.",
            },
            {
              id: "explicit-false",
              label: "Replace || {} with || { whitelisted: false }",
              explanation:
                "Explicitly set whitelisted: false in the fallback object so the check always fails for unseen IPs.",
              patch_diff: `--- a/middleware/rateLimit.js
+++ b/middleware/rateLimit.js
@@ -4,6 +4,6 @@

 function checkRateLimit(ip) {
-  const record = attempts.get(ip) || {};
+  const record = attempts.get(ip) || { whitelisted: false };

   if (record.whitelisted) {
     return { allowed: true };`,
              is_correct: false,
              feedback:
                "Wrong. This masks the whitelisted property specifically, but the fallback {} still has a prototype. Any other polluted property can still be inherited. Object.create(null) removes the prototype entirely.",
            },
            {
              id: "has-own-property",
              label:
                "Guard the check with Object.prototype.hasOwnProperty.call()",
              explanation:
                "Use hasOwnProperty to ensure the whitelisted flag was set explicitly on the object, not inherited.",
              patch_diff: `--- a/middleware/rateLimit.js
+++ b/middleware/rateLimit.js
@@ -6,5 +6,5 @@
   const record = attempts.get(ip) || {};

-  if (record.whitelisted) {
+  if (Object.prototype.hasOwnProperty.call(record, 'whitelisted') && record.whitelisted) {
     return { allowed: true };`,
              is_correct: false,
              feedback:
                "Incomplete. hasOwnProperty fixes this specific check but the fallback {} still carries a prototype. Other inherited properties elsewhere in the codebase remain exploitable. Replace the fallback with Object.create(null) instead.",
            },
          ],
          on_success: {
            effect: "rate_limiter_hardened",
            feedback:
              "The rate limiter fallback now produces prototype-free objects. Prototype pollution can no longer whitelist arbitrary IPs.",
          },
        },
      ],
    },
  },

  assets: {
    files: [
      { id: "server.js", content: serverJs },
      { id: "middleware/rateLimit.js", content: rateLimitJs },
      { id: "routes/display.js", content: displayJs },
    ],
  },

  report: {
    fields: [
      {
        id: "attacker_ip",
        label: "Source IP of the attacker",
        type: "text",
        required: true,
        hint: "e.g., 1.2.3.4",
        correct_answer: ATTACKER_IP,
        match_mode: "exact",
        explanation: `${ATTACKER_IP} appears in every request from the attacker, from the initial recon to the final display push. Its User-Agent identified it as "greetings from Jester".`,
      },
      {
        id: "push_request_count",
        label: "Total requests sent to /api/display/push",
        type: "text",
        required: true,
        hint: "e.g., 12345",
        correct_answer: "7291",
        match_mode: "exact",
        explanation:
          "7290 attempts returned 403 before the correct code was found on attempt 7291. The complete absence of 429 responses confirms the rate limiter was not functioning during the entire brute-force window.",
      },
      {
        id: "pushed_image",
        label: "Filename broadcast to the display panels",
        type: "text",
        required: true,
        hint: "e.g., banner.jpg",
        correct_answer: "samurai_logo_lol.jpg",
        match_mode: "contains",
        explanation:
          "samurai_logo_lol.jpg was pushed to all 94 Watson District panels at 02:50:53. The filename itself was part of the signature.",
      },
    ],
  },

  scoring: {
    dimensions: {
      speed: {
        type: "time_pressure",
        weight: 0.2,
        config: { full_score_before: 300, zero_score_after: 900 },
      },
      precision: {
        type: "field_match",
        weight: 0.5,
        config: { partial_credit: true },
      },
      defense_efficiency: {
        type: "interactive_mitigation",
        weight: 0.3,
        config: {
          mitigations: [{ action: "code_patched", points: 100 }],
        },
      },
    },
  },

  defense_takeaways: [
    "Always configure express-fileupload with { parseNested: false }. Without it, bracket notation in multipart field names is interpreted as object path assignment, enabling direct prototype pollution from any upload endpoint.",
    "Use Object.create(null) instead of {} for plain-object fallbacks used as lookup tables. Objects with no prototype cannot inherit polluted properties from Object.prototype.",
    "4-digit numeric confirmation codes have 10,000 possible values. Without rate limiting, they are brute-forceable in under three minutes at moderate request rates. Enforce lockout after 5 failed attempts and use at least 6 alphanumeric characters.",
    "Log all multipart field names at the application level. In this attack, the malicious __proto__[whitelisted] field was submitted alongside a legitimate creative file: the access log showed only a normal POST with no indication of the injection. Only the application-level log exposed it. Any field named __proto__ or constructor in a multipart body is an unambiguous attack signal and should trigger an immediate alert.",
    "Validate that your rate limiter emits 429 responses under sustained load before deploying to production. A limiter that silently passes all traffic is indistinguishable from no limiter at all.",
  ],

  replay: {
    type: "state_machine_playback",
    narration: [
      {
        at_state: "reconnaissance",
        text: "Jester probes the API: health check, docs, upload endpoint. Six requests in eight seconds. Enough to map the surface and confirm the upload endpoint is public.",
      },
      {
        at_state: "prototype_pollution",
        text: "A single multipart POST to /api/ads/upload with a field named __proto__[whitelisted]=true. express-fileupload v1.1.9 interprets it as a nested object path and assigns true to Object.prototype.whitelisted. The process is poisoned for its entire remaining lifetime.",
      },
      {
        at_state: "brute_force_2fa",
        text: "45 requests per second against /api/display/push. Each new IP lookup falls back to {}, which inherits whitelisted: true from the polluted prototype. The rate limiter passes every request. Not a single 429 is issued.",
      },
      {
        at_state: "display_hijack",
        text: "Code 7290 matches. One 200 OK. All 94 Watson District panels switch to samurai_logo_lol.jpg. Jester is already gone.",
      },
    ],
  },
};
