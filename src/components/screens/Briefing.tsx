import { useEffect, useRef, useState } from 'react';
import { Shield, Radio, Lock } from 'lucide-react';
import { useSimulationStore } from '@/store/useSimulationStore';

const ALL_BOOT_LINES = [
  '[SYS] CONNECTING TO NC_MUNICIPAL_SUBNET...',
  '[SEC] WEAVING DECOY TUNNEL ROUTE (3 NODES)...',
  '__decrypt__',
  '[SYS] FILE INTEGRITY TEMPLATES LOADED.',
  '[SYS] INTRUSION DETECTION HOOKS CONFIGURED.',
  '[OK] CONNECTION STABLE. DISPATCHING BRIEFING.',
];

interface Props {
  onInitialize: () => void;
}

export function Briefing({ onInitialize }: Props) {
  const { scenario } = useSimulationStore();
  const [bootLines, setBootLines] = useState<string[]>([]);
  const [decryptPct, setDecryptPct] = useState(0);
  const [bootDone, setBootDone] = useState(false);
  const startedRef = useRef(false);

  // startedRef guards against React StrictMode's double-mount re-running the animation
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    let idx = 0;

    const advance = () => {
      if (idx >= ALL_BOOT_LINES.length) {
        setTimeout(() => setBootDone(true), 1350);
        return;
      }
      const line = ALL_BOOT_LINES[idx++];
      setBootLines(prev => [...prev, line]);

      if (line === '__decrypt__') {
        let pct = 0;
        const id = setInterval(() => {
          pct = Math.min(100, pct + 5);
          setDecryptPct(pct);
          if (pct >= 100) {
            clearInterval(id);
            setTimeout(advance, 180);
          }
        }, 15);
      } else {
        setTimeout(advance, idx <= 2 ? 310 : 270);
      }
    };

    setTimeout(advance, 60);
  }, []);

  if (!scenario) return null;

  const { world, gameplay } = scenario;
  const isLive = gameplay.mode === 'live';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="cyber-grid-bg" />

      <div className="w-full max-w-2xl z-10 space-y-4">
        {/* Boot loader */}
        {!bootDone && (
        <div className="cyber-panel p-4 font-mono text-xs space-y-1">
          <div className="cyber-panel-header mb-3">
            <div className="flex items-center gap-2">
              <Lock size={14} />
              <span>SECURE CHANNEL INITIALIZING</span>
            </div>
          </div>
          {bootLines.map((line, i) => (
            <div
              key={i}
              className={line.startsWith('[OK]') ? 'text-green-400' : 'text-gray-400'}
            >
              {line === '__decrypt__'
                ? `[SYS] DECRYPTING ENCRYPTED ACCESS SYSLOGS [${decryptPct}%]...`
                : line}
            </div>
          ))}
          <div className="text-cyan-400 animate-pulse">█</div>
        </div>
        )}

        {/* Briefing */}
        {bootDone && (
          <div className="cyber-panel animate-fade-in">
            <div className="cyber-panel-header">
              <div className="flex items-center gap-2">
                <Shield size={14} />
                <span>SECURE CHANNEL #402-B: ENCRYPTED TRANSMISSION</span>
              </div>
              <div
                className={`flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 border rounded whitespace-nowrap shrink-0 ${
                  isLive
                    ? 'border-red-500/50 text-red-400 bg-red-950/20 animate-pulse'
                    : 'border-purple-500/50 text-purple-400 bg-purple-950/20'
                }`}
              >
                {isLive ? <Radio size={10} /> : <Shield size={10} />}
                <span>{isLive ? 'LIVE BREACH' : 'POST-MORTEM'}</span>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Sender info */}
              <div className="flex justify-between items-start text-xs font-mono text-gray-500">
                <div>
                  <div className="text-neon font-bold">{world.corporation}</div>
                  <div>{world.briefing.sender}</div>
                  <div className="text-gray-600">{world.location}</div>
                </div>
                <div className="text-right">
                  <div>{world.briefing.timestamp}</div>
                  <div className="uppercase text-gray-600">{world.player_role}</div>
                </div>
              </div>

              <div className="border-t border-theme-border pt-4">
                <h2 className="font-header text-lg text-white mb-3 tracking-wide">
                  {world.briefing.title}
                </h2>
                <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {world.briefing.body}
                </p>
              </div>

              {/* Metadata */}
              <div className="flex gap-4 text-xs font-mono text-gray-500 border-t border-theme-border pt-3">
                <span>
                  DIFFICULTY:{' '}
                  <span className={
                    gameplay.difficulty === 'beginner' ? 'text-cyan-400' :
                    gameplay.difficulty === 'intermediate' ? 'text-orange-400' :
                    'text-red-500'
                  }>
                    {gameplay.difficulty.toUpperCase()}
                  </span>
                </span>
                <span>
                  TIME LIMIT:{' '}
                  <span className="text-yellow-400">{Math.floor(gameplay.duration_seconds / 60)}m</span>
                </span>
                <span>
                  MODE:{' '}
                  <span className={isLive ? 'text-red-400' : 'text-purple-400'}>
                    {gameplay.mode.toUpperCase()}
                  </span>
                </span>
              </div>
            </div>

            <div className="p-4 border-t border-theme-border flex justify-end">
              <button className="cyber-button" onClick={onInitialize}>
                START
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
