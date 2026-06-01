import { useState, useEffect, useRef, useCallback } from 'react';
import { useSimulationStore } from '@/store/useSimulationStore';
import type { LogEntry, Payload } from '@/scenario.types';

function renderPayload(p: Payload) {
  const line = (content: string, key?: string | number, title?: string, extraClass = '') => (
    <div key={key} className={`pl-40.5 opacity-80 truncate ${extraClass}`} title={title ?? content}>
      ↳ {content}
    </div>
  );

  if (typeof p === 'string') return line(p);

  switch (p.type) {
    case 'http':
      return <>
        {Object.entries(p.headers ?? {}).map(([k, v]) => line(`${k}: ${v}`, k, `${k}: ${v}`, 'opacity-70'))}
        {p.body != null && line(p.body)}
      </>;
    case 'lines':
      return <>{p.lines.map((l, i) => line(l, i))}</>;
    case 'file': {
      const sizeLabel = p.size != null
        ? ` (${p.size >= 1024 ? `${(p.size / 1024).toFixed(1)} KB` : `${p.size} B`})`
        : '';
      return <>
        {line(`${p.filename}${sizeLabel}`, 'name')}
        {p.preview.split('\n').map((l, i) => (
          <div key={i} className="pl-44.5 opacity-50 truncate" title={l}>{l}</div>
        ))}
      </>;
    }
  }
}

export function LogStream({ label, source }: { label: string; source?: string }) {
  const { logs } = useSimulationStore();
  const [filter, setFilter] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const atBottomRef = useRef(true);

  const sourceLogs = source ? logs.filter(l => l.source === source) : logs;

  const filtered = filter
    ? sourceLogs.filter(l =>
        l.ip.includes(filter) ||
        l.path.toLowerCase().includes(filter.toLowerCase()) ||
        l.message.toLowerCase().includes(filter.toLowerCase()) ||
        (typeof l.payload === 'string' ? l.payload : '').toLowerCase().includes(filter.toLowerCase())
      )
    : sourceLogs;

  // Auto-scroll only when user is at the bottom
  useEffect(() => {
    if (atBottomRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    atBottomRef.current = distFromBottom < 40;
  }, []);

  const rowColor = (entry: LogEntry) => {
    if (entry.source === 'app' || entry.source === 'syslog') return 'text-gray-400';
    if (entry.status >= 500) return 'text-orange-400';
    if (entry.status >= 400) return 'text-yellow-400';
    if (entry.method === 'SYS') return 'text-cyan-400';
    return 'text-gray-400';
  };

  return (
    <div className="cyber-panel flex flex-col h-full">
      <div className="cyber-panel-header">
        <span>{label.toUpperCase()}</span>
        <span className="text-[10px] text-gray-500">{sourceLogs.length} entries</span>
      </div>

      <div className="px-3 py-1 border-b border-theme-border">
        <input
          type="text"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Filter by IP, path, payload…"
          aria-label="Filter logs"
          className="w-full bg-transparent text-xs text-white placeholder-gray-600 outline-none font-mono py-1"
        />
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-2 font-mono text-[10px] space-y-0.5"
      >
        {filtered.map(entry => (
          <div key={entry.id} className={`flex flex-col gap-0 leading-relaxed ${rowColor(entry)}`}>
            {entry.source === 'app' || entry.source === 'syslog' ? (
              <div className="flex gap-2">
                <span className="shrink-0 text-gray-600">{entry.timestamp}</span>
                <span className="break-all">{entry.message}</span>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <span className="shrink-0 text-gray-600">{entry.timestamp}</span>
                  <span className="shrink-0 w-27.5 truncate">{entry.ip}</span>
                  <span className="shrink-0 w-8">{entry.method}</span>
                  <span className="shrink-0 text-gray-500 w-4">{entry.status || ''}</span>
                  <span className="truncate">{entry.path}</span>
                </div>
                {entry.payload != null && renderPayload(entry.payload)}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
