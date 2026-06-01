import React, { useMemo, useState } from 'react';
import { useSimulationStore } from '@/store/useSimulationStore';
import { X, CheckCircle2, XCircle } from 'lucide-react';
import { strings } from '@/strings';

interface CopilotPatchingProps {
  filePath: string;
  ruleId: string;
  onClose?: () => void;
}

interface FeedbackState {
  optionId: string;
  isCorrect: boolean;
  text: string;
}

export const CopilotPatching: React.FC<CopilotPatchingProps> = ({ filePath, ruleId, onClose }) => {
  const { scenario, applyCodePatch, addAlert } = useSimulationStore();
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  const rule = scenario?.simulation.interactive_defense?.code_patching_rules?.find(
    (r) => r.id === ruleId,
  );

  if (!rule) return null;

  const s = strings.copilot;

  const shuffledOptions = useMemo(
    () => [...rule.options].sort(() => Math.random() - 0.5),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ruleId],
  );

  const handleSelect = (optionId: string) => {
    if (feedback?.isCorrect) return;

    const chosen = rule.options.find((o) => o.id === optionId);
    if (!chosen) return;

    applyCodePatch(filePath, ruleId, optionId);
    setFeedback({ optionId, isCorrect: chosen.is_correct, text: chosen.feedback });

    if (chosen.is_correct) {
      addAlert('info', s.alertPatchDeployed(chosen.label));
    } else {
      addAlert('warning', s.alertIncorrect(chosen.label));
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-50">
      <div className="cyber-panel p-6 max-w-2xl w-full relative max-h-[85vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-cyan-400 hover:text-cyan-200"
        >
          <X size={20} />
        </button>

        <h2 className="text-base font-bold text-neon mb-1 font-mono">
          ›_ {s.title}
        </h2>
        <p className="text-xs text-gray-400 mb-1">
          {rule.description}
        </p>
        <p className="text-[11px] text-gray-600 mb-4">
          {s.fileLabel(filePath)}: {s.instruction}
        </p>

        <div className="space-y-3 overflow-y-auto flex-1 pr-1">
          {shuffledOptions.map((opt) => {
            const isSelected = feedback?.optionId === opt.id;
            const isCorrectAndSelected = isSelected && feedback?.isCorrect;
            const isWrongAndSelected = isSelected && !feedback?.isCorrect;
            const isDisabled = feedback?.isCorrect && !isSelected;

            return (
              <div
                key={opt.id}
                onClick={() => handleSelect(opt.id)}
                className={`border rounded p-3 transition-all ${
                  isDisabled
                    ? 'opacity-30 cursor-not-allowed bg-black/20 border-gray-800'
                    : isCorrectAndSelected
                    ? 'bg-emerald-950/30 border-emerald-500 cursor-default'
                    : isWrongAndSelected
                    ? 'bg-red-950/30 border-red-500 cursor-pointer'
                    : 'bg-black/30 border-gray-700 cursor-pointer hover:border-cyan-600'
                }`}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="font-mono text-xs text-cyan-300 font-bold">{opt.label}</span>
                  {isCorrectAndSelected && (
                    <span className="flex items-center gap-1 text-emerald-400 text-[10px] font-bold">
                      <CheckCircle2 size={11} /> {s.correct}
                    </span>
                  )}
                  {isWrongAndSelected && (
                    <span className="flex items-center gap-1 text-red-400 text-[10px] font-bold">
                      <XCircle size={11} /> {s.incorrectRetry}
                    </span>
                  )}
                </div>

                <pre className="text-[10px] leading-4 whitespace-pre-wrap bg-black/30 p-2 rounded overflow-x-auto border border-gray-800/50">
                  {opt.patch_diff.split('\n').map((line, i) => {
                    const color = line.startsWith('+') && !line.startsWith('+++')
                      ? 'text-emerald-300'
                      : line.startsWith('-') && !line.startsWith('---')
                      ? 'text-red-300'
                      : line.startsWith('@@')
                      ? 'text-cyan-500'
                      : 'text-gray-300';
                    return <span key={i} className={`block ${color}`}>{line || ' '}</span>;
                  })}
                </pre>

                {isSelected && feedback && (
                  <p className={`mt-2 text-[10px] font-mono ${feedback.isCorrect ? 'text-emerald-400' : 'text-red-400'}`}>
                    {feedback.text}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
