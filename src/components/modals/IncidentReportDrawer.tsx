import { useRef, useEffect, type Dispatch, type SetStateAction, type FormEvent } from 'react';
import { FileText, X } from 'lucide-react';
import { useSimulationStore } from '@/store/useSimulationStore';
import { isFieldSkipped } from '@/utils/scoring';
import { Debriefing } from '@/components/screens/Debriefing';
import { CyberSelect } from '@/components/ui/CyberSelect';

interface IncidentReportDrawerProps {
  onClose: () => void;
  onReturn: () => void;
  onRetry: () => void;
  answers: Record<string, string>;
  setAnswers: Dispatch<SetStateAction<Record<string, string>>>;
  autoFill: boolean;
}

export function IncidentReportDrawer({
  onClose, onReturn, onRetry, answers, setAnswers, autoFill,
}: IncidentReportDrawerProps) {
  const { scenario, submitReport, isGameOver, gameEndedWith, stepReachedIds } = useSimulationStore();
  const initialAnswersRef = useRef(answers);

  // Typewriter auto-fill for postmortem mode; initialAnswersRef guard prevents replaying if user already typed something
  useEffect(() => {
    if (!autoFill || !scenario) return;
    if (Object.values(initialAnswersRef.current).some(v => v)) return;
    const fields = scenario.report.fields.filter(f => !isFieldSkipped(f, stepReachedIds));
    let cancelled = false;
    const typeField = async (fieldIdx: number) => {
      if (cancelled || fieldIdx >= fields.length) return;
      const field = fields[fieldIdx];
      const answer = Array.isArray(field.correct_answer) ? field.correct_answer[0] : field.correct_answer;
      if (field.type === 'choice' || field.type === 'multiselect') {
        if (!cancelled) setAnswers(prev => ({ ...prev, [field.id]: answer }));
        await new Promise<void>(r => setTimeout(r, 300));
        typeField(fieldIdx + 1);
        return;
      }
      for (let i = 1; i <= answer.length; i++) {
        if (cancelled) return;
        await new Promise<void>(r => setTimeout(r, 55));
        setAnswers(prev => ({ ...prev, [field.id]: answer.slice(0, i) }));
      }
      await new Promise<void>(r => setTimeout(r, 500));
      typeField(fieldIdx + 1);
    };
    const t = setTimeout(() => typeField(0), 600);
    return () => { cancelled = true; clearTimeout(t); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFill]);

  if (!scenario) return null;

  const visibleFields = scenario.report.fields.filter(
    f => !isFieldSkipped(f, stepReachedIds),
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    submitReport(answers);
    onClose();
  };

  if (isGameOver) {
    const isVictory = gameEndedWith === 'victory';
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-50" onClick={onClose}>
        <div className="cyber-panel w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
          <div className="cyber-panel-header">
            <div className="flex items-center gap-2">
              <FileText size={14} />
              <span className={isVictory ? 'text-green-400' : 'text-red-400'}>
                {isVictory ? 'MISSION DEBRIEF: SUCCESS' : 'MISSION DEBRIEF: FAILURE'}
              </span>
            </div>
            <button onClick={onClose} className="opacity-60 hover:opacity-100" title="Explore logs">
              <X size={16} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <Debriefing onReturn={onReturn} onRetry={onRetry} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-50" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={`Incident Report: ${scenario.world.corporation}`} className="cyber-panel w-full max-w-xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="cyber-panel-header">
          <div className="flex items-center gap-2">
            <FileText size={14} />
            <span>INCIDENT REPORT: {scenario.world.corporation}</span>
          </div>
          <button onClick={onClose} aria-label="Close" className="opacity-60 hover:opacity-100">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-y-auto">
          <div className="p-5 space-y-4">
            {visibleFields.map(field => (
              <div key={field.id}>
                {field.type === 'choice' ? (
                  <>
                    <p className="text-xs font-mono text-gray-400 mb-1">{field.label}</p>
                    <CyberSelect
                      label=""
                      value={answers[field.id] ?? ''}
                      onChange={v => setAnswers(prev => ({ ...prev, [field.id]: v }))}
                      className="py-2"
                      options={[
                        { value: '', label: '-- select an option --', color: 'text-gray-500' },
                        ...(field.options ?? []).map(opt => ({ value: opt, label: opt })),
                      ]}
                    />
                  </>
                ) : (
                  <>
                    <label htmlFor={field.id} className="block text-xs font-mono text-gray-400 mb-1">
                      {field.label}
                    </label>
                    {field.hint && (
                      <p className="text-[10px] text-gray-600 mb-1 font-mono">{field.hint}</p>
                    )}
                    {field.type === 'textarea' ? (
                      <textarea
                        id={field.id}
                        value={answers[field.id] ?? ''}
                        onChange={e => setAnswers(prev => ({ ...prev, [field.id]: e.target.value }))}
                        rows={3}
                        className="w-full bg-black/40 border border-theme-border text-white text-xs font-mono p-2 rounded outline-none focus:border-theme-primary"
                      />
                    ) : (
                      <input
                        id={field.id}
                        type="text"
                        value={answers[field.id] ?? ''}
                        onChange={e => setAnswers(prev => ({ ...prev, [field.id]: e.target.value }))}
                        className="w-full bg-black/40 border border-theme-border text-white text-xs font-mono p-2 rounded outline-none focus:border-theme-primary"
                      />
                    )}
                  </>
                )}
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-theme-border flex justify-end">
            <button type="submit" className="cyber-button">
              SUBMIT REPORT
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
