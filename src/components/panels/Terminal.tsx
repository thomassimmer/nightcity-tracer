import React, { useState, useRef, useEffect, type FormEvent, type KeyboardEvent } from 'react';
import { useSimulationStore } from '@/store/useSimulationStore';
import { Terminal as TerminalIcon } from 'lucide-react';
import type { TerminalPanelConfig } from '@/scenario.types';
import { executeTerminalCommand, type TerminalLine } from '@/utils/terminalExec';

interface TerminalProps {
  config: TerminalPanelConfig;
  onCommandExecuted?: (cmd: string) => void;
}

const BOOT_LINES: TerminalLine[] = [
  { type: 'output', text: 'NIGHTCITY MUNICIPAL FORENSIC OS [Version 4.2.907]' },
  { type: 'output', text: 'TYPE "help" TO LIST THE CORPORATE CLI QUICK ACTIONS MANUAL.' },
  { type: 'output', text: '---------------------------------------------------------' },
];

export const Terminal: React.FC<TerminalProps> = ({ config, onCommandExecuted }) => {
  const {
    blockIP, revokeToken, deleteStoredXss,
    logs, virtualFiles,
    stepReachedIds, deletedXssEntries, resourceValues,
    recordTerminalCommand, restoredTerminalLines,
  } = useSimulationStore();

  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>(config.initial_history ?? []);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [output, setOutput] = useState<TerminalLine[]>(() =>
    restoredTerminalLines.length > 0 ? restoredTerminalLines : BOOT_LINES
  );

  const outputEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    outputEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [output]);

  const focusInput = () => {
    if (window.getSelection()?.toString()) return;
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab') {
      if (!input.trim()) { inputRef.current?.blur(); return; }
      e.preventDefault();
      const trimmedInput = input.trim();
      const scenarioKeys = Object.keys(config.commands ?? {});
      const scenarioMatches = scenarioKeys.filter(k => k.startsWith(trimmedInput) && k !== trimmedInput);
      if (scenarioMatches.length === 1) {
        setInput(scenarioMatches[0]);
        return;
      } else if (scenarioMatches.length > 1) {
        let prefix = scenarioMatches[0];
        for (const s of scenarioMatches.slice(1)) {
          while (!s.startsWith(prefix)) prefix = prefix.slice(0, -1);
        }
        if (prefix.length > trimmedInput.length) setInput(prefix);
        else setOutput(prev => [...prev, { type: 'output', text: `Matches: ${scenarioMatches.join('  ')}` }]);
        return;
      }
      const parts = input.split(' ');
      const lastPart = parts[parts.length - 1];
      const fileNames = [...Object.keys(config.log_files ?? {}), ...Object.keys(virtualFiles)];
      const fileMatches = fileNames.filter(f => f.startsWith(lastPart));
      if (fileMatches.length === 1) {
        parts[parts.length - 1] = fileMatches[0];
        setInput(parts.join(' '));
      } else if (fileMatches.length > 1) {
        setOutput(prev => [...prev, { type: 'output', text: `Matches: ${fileMatches.join(', ')}` }]);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const nextIdx = historyIdx < history.length - 1 ? historyIdx + 1 : historyIdx;
        setHistoryIdx(nextIdx);
        setInput(history[history.length - 1 - nextIdx]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIdx > 0) {
        setHistoryIdx(historyIdx - 1);
        setInput(history[history.length - 1 - (historyIdx - 1)]);
      } else if (historyIdx === 0) {
        setHistoryIdx(-1);
        setInput('');
      }
    }
  };

  const handleSubmit = (cmdString: string) => {
    const trimmed = cmdString.trim();
    if (!trimmed) return;

    setHistory(prev => [...prev, trimmed]);
    setHistoryIdx(-1);
    onCommandExecuted?.(trimmed);
    recordTerminalCommand(trimmed);
    setInput('');

    if (trimmed === 'clear') {
      setOutput([]);
      return;
    }

    const runtime = { logs, stepReachedIds, deletedXssEntries, resourceValues };
    const lines = executeTerminalCommand(trimmed, config, runtime, virtualFiles, {
      blockIP,
      revokeToken,
      deleteStoredXss,
    });
    setOutput(prev => [...prev, ...lines]);
  };

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleSubmit(input);
  };

  return (
    <div
      className="cyber-panel flex flex-col h-full font-mono text-xs select-none"
      onClick={focusInput}
      style={{ minHeight: '260px', height: '100%' }}
    >
      <div className="cyber-panel-header">
        <div className="flex items-center gap-2">
          <TerminalIcon size={14} className="text-neon" />
          <span>VIRTUAL SECURE SHELL (NC-OS v4.2)</span>
        </div>
        <div className="text-[10px] text-gray-500 font-mono select-none">type 'help' for commands</div>
      </div>

      <div
        className="flex-1 overflow-y-auto p-4 space-y-1 select-text bg-[#030308]"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        {output.map((line, idx) => {
          let color = 'text-[#c4c9e2]';
          if (line.type === 'input')   color = 'text-yellow-400 font-bold';
          if (line.type === 'error')   color = 'text-[#ff0055] font-bold';
          if (line.type === 'success') color = 'text-[#39ff14] text-glow font-bold';
          return (
            <div key={idx} className={`${color} leading-relaxed break-all`}>
              {line.text}
            </div>
          );
        })}
        <div ref={outputEndRef} />
      </div>

      <form
        onSubmit={handleFormSubmit}
        className="flex items-center gap-2 p-2 border-t border-cyan-500/20 bg-black/60"
      >
        <span className="text-theme-primary font-bold select-none pl-1">nc-os:~$</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="Terminal command"
          className="flex-1 bg-transparent text-yellow-300 focus:outline-none border-none outline-none font-bold"
          autoComplete="off"
          spellCheck="false"
        />
      </form>
    </div>
  );
};
