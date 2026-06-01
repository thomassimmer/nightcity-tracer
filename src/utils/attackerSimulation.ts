import type { AttackerAction, Payload } from "@/scenario.types";

export function resolvePayload(
  pl: Payload | undefined,
  ip: string,
  index = 0,
  seqPad = 0,
): Payload | undefined {
  if (!pl || !ip) return pl;
  const seq = seqPad > 0 ? String(index).padStart(seqPad, "0") : String(index);
  const subst = (s: string) =>
    s.replace(/\$attacker_ip/g, ip).replace(/\$seq/g, seq);
  if (typeof pl === "string") return subst(pl);
  if (pl.type === "http") return { ...pl, body: pl.body ? subst(pl.body) : undefined };
  if (pl.type === "lines") return { ...pl, lines: pl.lines.map(l => subst(l)) };
  return pl;
}

export function generateRandomJwt(prng: () => number): string {
  const header = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9";
  const iat = 3389977800 + Math.floor(prng() * 100000);
  const raw = `{"sub":"operator","role":"user","iat":${iat}}`;
  const payload = btoa(raw).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-";
  const sig = Array.from({ length: 12 }, () => chars[Math.floor(prng() * chars.length)]).join("");
  return `${header}.${payload}.${sig}`;
}

export function generateRandomIp(prng: () => number): string {
  return [
    Math.floor(prng() * 223) + 1,
    Math.floor(prng() * 255),
    Math.floor(prng() * 255),
    Math.floor(prng() * 255),
  ].join(".");
}

export function attackerActionDuration(action: AttackerAction): number {
  switch (action.type) {
    case "send_http_requests":
    case "send_protocol_message":
    case "wait":
      return action.duration;
    default:
      return 0;
  }
}
