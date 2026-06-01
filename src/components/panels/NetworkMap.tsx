import { useState, useEffect, useRef, useMemo } from 'react';
import { useSimulationStore } from '@/store/useSimulationStore';
import { nodeColor, fmtBps, linkColor } from '@/utils/networkMapUtils';
import type { NodeRole } from '@/utils/networkMapUtils';

interface MapNode {
  id: string;
  label: string;
  role: NodeRole;
  x: number;
  y: number;
}

interface TransientLink {
  id: string;
  x1: number; y1: number;
  x2: number; y2: number;
  color: string;
}

const W = 560;
const H = 340;
const HUB: MapNode = { id: 'web-server', label: 'web-server', role: 'hub', x: 265, y: 165 };

const LEGEND: { color: string; label: string; type: 'node' | 'flow' | 'blocked' }[] = [
  { color: 'var(--theme-primary)', label: 'Hub',      type: 'node' },
  { color: '#06b6d4',              label: 'Internal',  type: 'node' },
  { color: '#a78bfa',              label: 'Service',   type: 'node' },
  { color: '#4b5563',              label: 'External',  type: 'node' },
  { color: '#374151',              label: 'Blocked',   type: 'blocked' },
  { color: '#06b6d4',              label: 'Inbound',   type: 'flow' },
  { color: '#ef4444',              label: 'Outbound',  type: 'flow' },
];

export function NetworkMap({ label }: { label: string }) {
  const { logs, networkFlows, blockedIPs } = useSimulationStore();

  const nodes = useMemo<MapNode[]>(() => {
    const seen = new Set<string>();
    const external: string[] = [];
    const internal: string[] = [];
    const services: string[] = [];

    for (const log of logs) {
      const { ip } = log;
      if (ip === '127.0.0.1' || seen.has(ip)) continue;
      seen.add(ip);
      if (ip.startsWith('10.') || ip.startsWith('192.168.')) {
        internal.push(ip);
      } else {
        external.push(ip);
      }
    }

    for (const flow of networkFlows) {
      for (const id of [flow.src, flow.dst]) {
        if (!seen.has(id) && !/^\d/.test(id)) {
          seen.add(id);
          services.push(id);
        }
      }
    }

    for (const log of logs) {
      if (log.db_connection && !seen.has(log.db_connection)) {
        seen.add(log.db_connection);
        services.push(log.db_connection);
      }
    }

    const result: MapNode[] = [HUB];

    const extCount = external.length;
    external.forEach((ip, i) => {
      const t = extCount <= 1 ? 0.5 : i / (extCount - 1);
      result.push({ id: ip, label: ip, role: 'external', x: 55, y: 65 + t * 210 });
    });

    internal.forEach((ip, i) => {
      result.push({ id: ip, label: ip, role: 'internal', x: 145, y: 255 + i * 30 });
    });

    services.forEach((id, i) => {
      result.push({ id, label: id, role: 'service', x: 445, y: 200 + i * 70 });
    });

    return result;
  }, [logs, networkFlows]);

  const nodeMap = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);

  const seenIPsRef = useRef<Set<string> | null>(null);
  const prevLogsLenRef = useRef(-1);
  if (seenIPsRef.current === null) {
    seenIPsRef.current = new Set(logs.filter(l => l.ip !== '127.0.0.1').map(l => l.ip));
    prevLogsLenRef.current = logs.length;
  }

  const [pulsingNodes, setPulsingNodes] = useState<Set<string>>(new Set());
  const [transientLinks, setTransientLinks] = useState<TransientLink[]>([]);

  useEffect(() => {
    const seenIPs = seenIPsRef.current!;

    if (logs.length < prevLogsLenRef.current) {
      prevLogsLenRef.current = 0;
      seenIPs.clear();
    }

    const newLogs = logs.slice(prevLogsLenRef.current);
    prevLogsLenRef.current = logs.length;
    if (newLogs.length === 0) return;

    const newPulseIPs: string[] = [];
    const newLinks: TransientLink[] = [];

    for (const log of newLogs) {
      const { ip, status, method, db_connection } = log;
      if (ip === '127.0.0.1' || method === 'SYS') continue;

      const node = nodeMap.get(ip);
      if (!node) continue;

      if (!seenIPs.has(ip)) {
        seenIPs.add(ip);
        newPulseIPs.push(ip);
      }

      newLinks.push({
        id: `tl-${ip}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        x1: node.x, y1: node.y,
        x2: HUB.x, y2: HUB.y,
        color: linkColor(status),
      });

      if (db_connection) {
        const dbNode = nodeMap.get(db_connection);
        if (dbNode) {
          newLinks.push({
            id: `tl-db-${db_connection}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            x1: HUB.x, y1: HUB.y,
            x2: dbNode.x, y2: dbNode.y,
            color: '#a78bfa',
          });
        }
      }
    }

    if (newPulseIPs.length > 0) {
      setPulsingNodes(prev => {
        const next = new Set(prev);
        newPulseIPs.forEach(ip => next.add(ip));
        return next;
      });
      newPulseIPs.forEach(ip => {
        setTimeout(() => setPulsingNodes(prev => {
          const next = new Set(prev);
          next.delete(ip);
          return next;
        }), 1000);
      });
    }

    if (newLinks.length > 0) {
      setTransientLinks(prev => [...prev, ...newLinks]);
      newLinks.forEach(({ id }) => {
        setTimeout(() => setTransientLinks(prev => prev.filter(l => l.id !== id)), 1000);
      });
    }
  }, [logs, nodeMap]);

  return (
    <div className="cyber-panel flex flex-col h-full">
      <div className="cyber-panel-header">
        <span>{label.toUpperCase()}</span>
        <span className="text-[10px] text-gray-500">{nodes.length - 1} nodes</span>
      </div>
      <div className="flex-1 overflow-hidden min-h-0">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" style={{ fontFamily: 'monospace' }}>

          {nodes
            .filter(n => n.role !== 'hub' && n.role !== 'service')
            .map(n => {
              const blocked = blockedIPs.has(n.id);
              return (
                <line
                  key={`edge-${n.id}`}
                  x1={n.x} y1={n.y} x2={HUB.x} y2={HUB.y}
                  stroke="#4b5563"
                  strokeWidth={0.5}
                  strokeOpacity={blocked ? 0.05 : 0.3}
                  strokeDasharray="2 6"
                  style={{ animation: 'netflow 2s linear infinite' }}
                />
              );
            })}

          {transientLinks.map(link => (
            <line
              key={link.id}
              x1={link.x1} y1={link.y1}
              x2={link.x2} y2={link.y2}
              stroke={link.color}
              strokeWidth={1.5}
              strokeDasharray="4 3"
              style={{ animation: 'link-flash 1s ease-out forwards' }}
            />
          ))}

          {networkFlows.map(flow => {
            const src = nodeMap.get(flow.src);
            const dst = nodeMap.get(flow.dst);
            if (!src || !dst) return null;
            const isOutbound = dst.role === 'external';
            const sw = Math.max(2, Math.log10(flow.bytes_per_second / 100 + 1) * 1.5);
            return (
              <g key={`flow-${flow.id}`}>
                <line
                  x1={src.x} y1={src.y} x2={dst.x} y2={dst.y}
                  stroke={isOutbound ? '#ef4444' : '#06b6d4'}
                  strokeWidth={sw}
                  strokeDasharray="8 4"
                  style={{ animation: 'netflow 0.7s linear infinite' }}
                />
                <text
                  x={(src.x + dst.x) / 2}
                  y={(src.y + dst.y) / 2 - 7}
                  textAnchor="middle"
                  fontSize="8"
                  fill={isOutbound ? '#ef4444' : '#06b6d4'}
                >
                  {fmtBps(flow.bytes_per_second)}
                </text>
              </g>
            );
          })}

          {nodes.map(n => {
            const blocked = blockedIPs.has(n.id);
            const color = nodeColor(n.role, blocked);
            const r = n.role === 'hub' ? 12 : 7;
            return (
              <g key={`node-${n.id}`}>
                {pulsingNodes.has(n.id) && (
                  <circle
                    cx={n.x} cy={n.y} r={r}
                    fill="none"
                    stroke="rgba(255,255,255,0.85)"
                    strokeWidth={1.5}
                    style={{
                      animation: 'node-appear 1s ease-out forwards',
                      transformBox: 'fill-box',
                      transformOrigin: 'center',
                    }}
                  />
                )}
                <circle
                  cx={n.x} cy={n.y} r={r}
                  style={{
                    fill: color,
                    fillOpacity: 0.1,
                    stroke: color,
                    strokeWidth: n.role === 'hub' ? 1.5 : 1,
                    opacity: blocked ? 0.3 : 1,
                  }}
                />
                <text
                  x={n.x} y={n.y + r + 12}
                  textAnchor="middle" fontSize="8"
                  style={{ fill: color, opacity: blocked ? 0.35 : 0.85 }}
                >
                  {n.label.length > 15 ? n.label.slice(-14) : n.label}
                </text>
                {blocked && (
                  <line
                    x1={n.x - r - 2} y1={n.y} x2={n.x + r + 2} y2={n.y}
                    stroke="#ef4444" strokeWidth={1.5} strokeOpacity={0.6}
                  />
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <div className="px-2 pb-1.5 pt-1 flex flex-wrap gap-x-3 gap-y-0.5 border-t border-gray-700/30">
        {LEGEND.map(({ color, label, type }) => (
          <span key={label} className="flex items-center gap-1">
            {type === 'node' && <svg width="8" height="8"><circle cx="4" cy="4" r="3.5" fill={color} fillOpacity={0.2} stroke={color} strokeWidth="1" /></svg>}
            {type === 'blocked' && (
              <svg width="8" height="8">
                <circle cx="4" cy="4" r="3.5" fill={color} fillOpacity={0.1} stroke={color} strokeWidth="1" opacity={0.3} />
                <line x1="0" y1="4" x2="8" y2="4" stroke="#ef4444" strokeWidth="1.5" strokeOpacity={0.6} />
              </svg>
            )}
            {type === 'flow' && <svg width="16" height="5"><line x1="0" y1="2.5" x2="16" y2="2.5" stroke={color} strokeWidth="1.5" strokeDasharray="4 3" /></svg>}
            <span className="text-[9px] text-gray-400">{label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
