import type { LogEntry, NoiseGenerator, RuntimeDbRecord } from "@/scenario.types";
import { formatInGameTime } from "@/simulation/time";

function pickWeighted<T extends { weight: number }>(
  items: T[],
  prng: () => number,
): T {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let roll = prng() * total;
  for (const item of items) {
    roll -= item.weight;
    if (roll <= 0) return item;
  }
  return items[items.length - 1]!;
}

function pickSyslogMessage(daemon: string, prng: () => number): string {
  const d = daemon.toLowerCase();
  let pool: string[];
  if (d.includes("ai") || d.includes("assist") || d.includes("bot")) {
    pool = [
      "INFO: session initialized",
      "INFO: request received -- processing",
      "INFO: credential verification requested",
      "INFO: authorization decision pending",
      "INFO: response generated",
      "WARN: credential lookup returned no match",
      "INFO: fallback path activated",
      "INFO: session closed",
    ];
  } else if (d.includes("dispatch") || d.includes("router")) {
    pool = [
      "INFO: inbound session routed",
      "INFO: dispatch case created",
      "INFO: unit assignment requested",
      "INFO: session transfer complete",
      "WARN: priority escalation received",
      "INFO: dispatch acknowledgment sent",
    ];
  } else if (d.includes("billing") || d.includes("payment")) {
    pool = [
      "INFO: billing record initialized",
      "INFO: account lookup complete",
      "WARN: account not found -- using fallback",
      "INFO: charge allocated",
      "INFO: invoice generated",
    ];
  } else if (
    d.includes("db") ||
    d.includes("database") ||
    d.includes("subscriber")
  ) {
    pool = [
      "INFO: query received",
      "INFO: record found",
      "WARN: record not found",
      "INFO: index scan complete -- 0 rows",
      "INFO: connection pool: 3/10 active",
      "INFO: query completed in 2ms",
    ];
  } else if (
    d.includes("gateway") ||
    d.includes("comm") ||
    d.includes("relay")
  ) {
    pool = [
      "INFO: connection established",
      "INFO: relay link active -- latency 8ms",
      "INFO: packet forwarded",
      "WARN: upstream timeout -- retry 1/3",
      "INFO: connection closed cleanly",
      "INFO: session authenticated: NO",
    ];
  } else if (d.includes("fleet") || d.includes("unit") || d.includes("vehicle")) {
    pool = [
      "INFO: unit status: STANDBY",
      "INFO: unit status: AVAILABLE",
      "INFO: dispatch request received",
      "INFO: en route -- ETA calculated",
      "INFO: unit check-in: OK",
    ];
  } else {
    pool = [
      "INFO: heartbeat ok",
      "INFO: request processed",
      "INFO: connection accepted",
      "INFO: session initialized",
      "INFO: query completed",
      "WARN: slow response from upstream",
      "INFO: health check passed",
      "INFO: config reloaded",
    ];
  }
  return pool[Math.floor(prng() * pool.length)]!;
}

function emitHttpTraffic(
  gen: Extract<NoiseGenerator, { type: "http_traffic" }>,
  sec: number,
  prng: () => number,
  blockedIPs: Set<string>,
  nextLogId: () => string,
): { logs: LogEntry[]; newDbRecords: Array<Omit<RuntimeDbRecord, 'id'>> } {
  const entries: LogEntry[] = [];
  const newDbRecords: Array<Omit<RuntimeDbRecord, 'id'>> = [];
  const whole = Math.floor(gen.requests_per_second);
  const fractional = gen.requests_per_second - whole;
  let emissions = whole;
  if (fractional > 0 && prng() < fractional) emissions += 1;

  for (let i = 0; i < emissions; i++) {
    const randIp = gen.ips_pool[Math.floor(prng() * gen.ips_pool.length)]!;
    const endpoint = pickWeighted(gen.endpoints, prng);
    const status = blockedIPs.has(randIp) ? 403 : endpoint.status;
    const payload = endpoint.payloads?.length
      ? endpoint.payloads[Math.floor(prng() * endpoint.payloads.length)]
      : undefined;

    entries.push({
      id: nextLogId(),
      timestamp: formatInGameTime(sec),
      ip: randIp,
      method: endpoint.method,
      path: endpoint.path,
      status,
      message: `${endpoint.method} ${endpoint.path} - HTTP ${status}`,
      payload,
      isAttacker: false,
      source: "access",
      db_connection: (endpoint.use_db_connection && status < 300) ? endpoint.use_db_connection : undefined,
    });

    if (endpoint.emit_db_record && status < 300 && typeof payload === 'string') {
      try {
        const parsed = JSON.parse(payload) as Record<string, unknown>;
        const fields: Record<string, string> = {};
        for (const key of endpoint.emit_db_record.fields_from_payload) {
          const val = parsed[key];
          if (val !== undefined) {
            fields[key] = Array.isArray(val) ? val.join(', ') : String(val);
          }
        }
        newDbRecords.push({
          collection: endpoint.emit_db_record.collection,
          fields,
          isAttacker: false,
        });
      } catch {
        // non-JSON payload, skip
      }
    }

    if (gen.emit_app_log) {
      entries.push({
        id: nextLogId(),
        timestamp: formatInGameTime(sec),
        ip: randIp,
        method: endpoint.method,
        path: endpoint.path,
        status,
        message: `DEBUG [dispatch.middleware] ${randIp} -- Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJvcGVyYXRvciIsInJvbGUiOiJ1c2VyIiwiaWF0IjozMzg5OTc3ODAwfQ.Kx7VqMpR_wZ4`,
        isAttacker: false,
        source: "app",
      });
    } else if (endpoint.emit_app_log) {
      let message: string;
      if (endpoint.app_log_message) {
        const filename =
          payload && typeof payload === "object" && payload.type === "file"
            ? payload.filename
            : "";
        const size =
          payload && typeof payload === "object" && payload.type === "file" && payload.size != null
            ? String(payload.size)
            : "";
        message = endpoint.app_log_message
          .replace("{ip}", randIp)
          .replace("{filename}", filename)
          .replace("{size}", size);
      } else {
        const payloadStr = typeof payload === "string" ? payload : undefined;
        message = `[APP] ${randIp} ${endpoint.method} ${endpoint.path} ${status}${payloadStr ? ` body=${payloadStr}` : ""}`;
      }
      entries.push({
        id: nextLogId(),
        timestamp: formatInGameTime(sec),
        ip: randIp,
        method: "SYS",
        path: "",
        status: 0,
        message,
        isAttacker: false,
        source: "app",
      });
    }
  }

  return { logs: entries, newDbRecords };
}

export function emitNoiseForSecond(
  generators: NoiseGenerator[],
  sec: number,
  prng: () => number,
  blockedIPs: Set<string>,
  nextLogId: () => string,
): { logs: LogEntry[]; newDbRecords: Array<Omit<RuntimeDbRecord, 'id'>> } {
  const logs: LogEntry[] = [];
  const newDbRecords: Array<Omit<RuntimeDbRecord, 'id'>> = [];

  for (const gen of generators) {
    if (gen.type === "syslog") {
      if (prng() < gen.messages_per_minute / 60) {
        const daemon = gen.daemons[Math.floor(prng() * gen.daemons.length)]!;
        logs.push({
          id: nextLogId(),
          timestamp: formatInGameTime(sec),
          ip: "127.0.0.1",
          method: "SYS",
          path: daemon,
          status: 0,
          message: `[${daemon}] ${pickSyslogMessage(daemon, prng)}`,
          isAttacker: false,
          source: "syslog",
        });
      }
    } else if (gen.type === "http_traffic") {
      const result = emitHttpTraffic(gen, sec, prng, blockedIPs, nextLogId);
      logs.push(...result.logs);
      newDbRecords.push(...result.newDbRecords);
    }
  }

  return { logs, newDbRecords };
}
