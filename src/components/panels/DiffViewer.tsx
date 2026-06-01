import { useMemo } from 'react';
import { GitCompare } from 'lucide-react';
import { useSimulationStore } from '@/store/useSimulationStore';
import { strings } from '@/strings';
import { computeDiff, isRawPatch, parseRawPatch } from '@/utils/diffAlgorithm';
import type { DiffOp } from '@/utils/diffAlgorithm';

interface DiffViewerProps {
  originalFilePath: string;
  modifiedFilePath: string;
  label: string;
}

export function DiffViewer({ originalFilePath, modifiedFilePath, label }: DiffViewerProps) {
  const { virtualFiles } = useSimulationStore();

  const s = strings.diffViewer;
  const originalFile = virtualFiles[originalFilePath];
  const modifiedFile = virtualFiles[modifiedFilePath];

  const diff = useMemo<DiffOp[] | null>(() => {
    if (modifiedFile && isRawPatch(modifiedFile.content)) {
      return parseRawPatch(modifiedFile.content);
    }
    if (originalFile && modifiedFile) {
      return computeDiff(originalFile.content, modifiedFile.content);
    }
    if (originalFile) {
      return originalFile.content.split('\n').map((line) => ({ type: 'same', line }));
    }
    return null;
  }, [originalFile, modifiedFile]);

  const stats = useMemo(() => {
    if (!diff) return { added: 0, removed: 0 };
    return {
      added: diff.filter((d) => d.type === 'add').length,
      removed: diff.filter((d) => d.type === 'remove').length,
    };
  }, [diff]);

  let leftLine = 0, rightLine = 0;
  const lineNumbers = diff?.map((op) => {
    if (op.type === 'same') { leftLine++; rightLine++; return { left: leftLine, right: rightLine }; }
    if (op.type === 'remove') { leftLine++; return { left: leftLine, right: null }; }
    rightLine++;
    return { left: null, right: rightLine };
  }) ?? [];

  return (
    <div className="cyber-panel flex flex-col h-full">
      <div className="cyber-panel-header">
        <div className="flex items-center gap-1.5">
          <GitCompare size={11} />
          <span>{label.toUpperCase()}</span>
        </div>
        {diff && (
          <div className="flex items-center gap-2 font-mono text-[10px]">
            <span className="text-emerald-400">+{stats.added}</span>
            <span className="text-red-400">-{stats.removed}</span>
          </div>
        )}
      </div>

      {/* File path header */}
      <div className="flex border-b border-theme-border font-mono text-[10px]">
        <div className="flex-1 px-3 py-1 text-red-400/70 truncate border-r border-theme-border">
          {s.original(originalFilePath)}
        </div>
        <div className="flex-1 px-3 py-1 text-emerald-400/70 truncate">
          {s.modified(modifiedFilePath)}
        </div>
      </div>

      {!diff ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-gray-700 font-mono text-xs">
          <GitCompare size={28} className="opacity-30" />
          <span>{s.filesNotFound}</span>
          <span className="text-[10px] opacity-60">{originalFilePath} ↔ {modifiedFilePath}</span>
        </div>
      ) : (
        <div className="flex-1 overflow-auto font-mono text-xs leading-5 bg-black/20">
          <table className="w-full border-collapse">
            <tbody>
              {diff.map((op, idx) => {
                const nums = lineNumbers[idx];
                const isAdd = op.type === 'add';
                const isRem = op.type === 'remove';
                const rowBg = isAdd
                  ? 'bg-emerald-950/40 hover:bg-emerald-950/60'
                  : isRem
                  ? 'bg-red-950/40 hover:bg-red-950/60'
                  : 'hover:bg-white/[0.02]';
                const sigil = isAdd ? '+' : isRem ? '-' : ' ';
                const sigilColor = isAdd ? 'text-emerald-400' : isRem ? 'text-red-400' : 'text-gray-700';
                const textColor = isAdd ? 'text-emerald-200' : isRem ? 'text-red-200' : 'text-gray-300';

                return (
                  <tr key={idx} className={rowBg}>
                    <td className="select-none text-right text-gray-700 pr-2 pl-2 w-8 shrink-0 align-top border-r border-gray-800/40">
                      {nums.left ?? ''}
                    </td>
                    <td className="select-none text-right text-gray-700 pr-2 w-8 shrink-0 align-top border-r border-gray-800/40">
                      {nums.right ?? ''}
                    </td>
                    <td className={`select-none text-center w-5 shrink-0 align-top ${sigilColor} font-bold`}>
                      {sigil}
                    </td>
                    <td className={`pl-2 pr-2 whitespace-pre align-top ${textColor}`}>
                      {op.line}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
