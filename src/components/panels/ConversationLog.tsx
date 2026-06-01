import { useRef } from 'react';
import { useSimulationStore } from '@/store/useSimulationStore';

interface Turn {
  timestamp: string;
  participant: string;
  message: string;
}

interface ParsedSession {
  headerLines: string[];
  turns: Turn[];
  footerLines: string[];
}

function parseSessionFile(content: string): ParsedSession {
  const lines = content.split('\n');
  const seps = lines.reduce<number[]>((acc, l, i) =>
    l.trim().startsWith('===') ? [...acc, i] : acc, []);

  const headerLines = lines
    .slice((seps[0] ?? -1) + 1, seps[1])
    .map(l => l.trim())
    .filter(Boolean);

  const bodyLines = lines.slice((seps[1] ?? -1) + 1, seps[2] ?? lines.length);

  const footerLines = seps[2] != null
    ? lines.slice(seps[2] + 1, seps[3]).map(l => l.trim()).filter(Boolean)
    : [];

  const turns: Turn[] = [];
  let current: Turn | null = null;

  for (const line of bodyLines) {
    const m = line.match(/^\[(\d{2}:\d{2}:\d{2}Z)\] ([^:]+):$/);
    if (m) {
      if (current) turns.push(current);
      current = { timestamp: m[1], participant: m[2].trim(), message: '' };
    } else if (current && line.trim()) {
      current.message += (current.message ? '\n' : '') + line.trim();
    }
  }
  if (current) turns.push(current);

  return { headerLines, turns, footerLines };
}

export function ConversationLog({
  sessionFile,
  participants,
}: {
  sessionFile: string;
  participants: string[];
}) {
  const { virtualFiles } = useSimulationStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  const file = virtualFiles[sessionFile];
  if (!file) {
    console.warn(`ConversationLog: session file not found: ${sessionFile}`);
    return (
      <div className="cyber-panel flex flex-col h-full">
        <div className="cyber-panel-header"><span>SESSION LOG</span></div>
        <div className="flex-1 flex items-center justify-center text-gray-600 font-mono text-xs">
          FILE NOT FOUND: {sessionFile}
        </div>
      </div>
    );
  }

  const { headerLines, turns, footerLines } = parseSessionFile(file.content);
  const aiParticipant = participants[0];

  return (
    <div className="cyber-panel flex flex-col h-full">
      <div className="cyber-panel-header">
        <span>SESSION LOG</span>
        <span className="text-[10px] text-gray-500">{turns.length} turns</span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {headerLines.length > 0 && (
          <div className="font-mono text-[10px] text-gray-600 space-y-0.5 pb-2 border-b border-theme-border">
            {headerLines.map((l, i) => <div key={i}>{l}</div>)}
          </div>
        )}

        {turns.map((turn, i) => {
          const isAI = turn.participant === aiParticipant;
          return (
            <div key={i} className={`flex flex-col gap-1 ${isAI ? 'items-start' : 'items-end'}`}>
              <div className="flex items-center gap-2">
                {isAI && (
                  <span className="font-mono text-[9px] text-cyan-600">{turn.participant}</span>
                )}
                <span className="font-mono text-[9px] text-gray-600">{turn.timestamp}</span>
                {!isAI && (
                  <span className="font-mono text-[9px] text-yellow-700">{turn.participant}</span>
                )}
              </div>
              <div className={`max-w-[85%] px-3 py-2 rounded font-mono text-[11px] leading-relaxed whitespace-pre-wrap ${
                isAI
                  ? 'bg-cyan-950/20 border border-cyan-900/40 text-cyan-100'
                  : 'bg-yellow-950/20 border border-yellow-900/40 text-yellow-100'
              }`}>
                {turn.message}
              </div>
            </div>
          );
        })}

        {footerLines.length > 0 && (
          <div className="font-mono text-[10px] space-y-0.5 pt-2 border-t border-theme-border">
            {footerLines.map((l, i) => {
              const isAlert = l.includes('FAILED') || l.includes('INVALID') || l.includes('BILLING_REVIEW');
              return (
                <div key={i} className={isAlert ? 'text-red-400' : 'text-gray-600'}>{l}</div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
