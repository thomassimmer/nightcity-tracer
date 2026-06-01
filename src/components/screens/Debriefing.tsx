import { useEffect } from 'react';
import { CheckCircle, XCircle, Clock, Shield, Zap } from 'lucide-react';
import { useSimulationStore } from '@/store/useSimulationStore';
import { useCountUp } from '@/hooks/useCountUp';
import { gradeField, resolveField, calcScore, getGrade, MITIGATION_LABELS, isFieldSkipped } from '@/utils/scoring';
import { ScoreDimension } from '@/components/ui/ScoreDimension';
import { saveCompletion } from '@/utils/saveState';

interface Props {
  onReturn: () => void;
  onRetry: () => void;
}

export function Debriefing({ onReturn, onRetry }: Props) {
  const {
    scenario,
    gameEndedWith,
    gameOverReason,
    reportAnswers,
    elapsedSeconds,
    blockedIPs,
    revokedTokens,
    resourceValues,
    usedAttackerIps,
    filePatches,
    userActions,
    stepReachedIds,
  } = useSimulationStore();

  const score = calcScore(scenario, reportAnswers, elapsedSeconds, blockedIPs, filePatches, userActions, stepReachedIds, usedAttackerIps, revokedTokens);

  // Dep on scenario.id (not score) so this fires once per scenario, not on every score recalc; skipped for tutorial runs
  useEffect(() => {
    if (!scenario || scenario.tutorial?.enabled) return;
    const grade = getGrade(score.total);
    saveCompletion({
      v: 1,
      scenarioId: scenario.id,
      grade: grade.letter,
      total: score.total,
      completedAt: Date.now(),
    });
  }, [scenario?.id]);

  const displaySpeed = useCountUp(score.speed);
  const displayPrecision = useCountUp(score.precision);
  const displayDefense = useCountUp(score.defense);
  const displayTotal = useCountUp(score.total);

  if (!scenario) return null;

  const isVictory = gameEndedWith === 'victory';
  const titleText = isVictory ? 'MISSION COMPLETE' : 'SYSTEM COMPROMISED';
  const grade = getGrade(score.total);

  const elapsed = elapsedSeconds;
  const mm = Math.floor(elapsed / 60);
  const ss = elapsed % 60;
  const elapsedLabel = `${mm}m ${ss}s`;

  const defDim = scenario.scoring.dimensions['defense_efficiency'];

  return (
    <div className="space-y-4">
        {/* Header */}
        <div className={`cyber-panel p-6 text-center ${isVictory ? '' : 'alarm-active'}`}>
          <div
            data-text={titleText}
            className={`glitch-title text-4xl font-bold font-header tracking-widest whitespace-nowrap mb-2 ${isVictory ? 'text-green-400' : 'text-red-500'}`}
          >
            {titleText}
          </div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="font-mono text-sm text-gray-500 tracking-widest uppercase">GRADE</span>
            <span className={`font-mono text-2xl font-bold ${isVictory ? 'text-neon' : 'text-red-400'}`}>
              {grade.letter}
            </span>
            <span className="font-mono text-sm text-gray-500 tracking-widest">/</span>
            <span className="font-mono text-sm text-gray-300 tracking-widest uppercase">
              {grade.title}
            </span>
          </div>
          <p className="text-xs text-gray-400">{gameOverReason}</p>
        </div>

        {/* Score breakdown */}
        <div className="cyber-panel">
          <div className="cyber-panel-header">
            <span>PERFORMANCE MATRIX</span>
            <span className="text-2xl font-bold font-mono text-neon">
              {displayTotal}<span className="text-sm text-gray-500">/100</span>
            </span>
          </div>
          <div className="p-4 grid grid-cols-3 gap-4">
            <ScoreDimension
              icon={<Clock size={18} />}
              label="SPEED"
              value={displaySpeed}
              finalValue={score.speed}
              sub={elapsedLabel}
            />
            <ScoreDimension
              icon={<Shield size={18} />}
              label="PRECISION"
              value={displayPrecision}
              finalValue={score.precision}
            />
            <ScoreDimension
              icon={<Zap size={18} />}
              label="DEFENSE"
              value={displayDefense}
              finalValue={score.defense}
            />
          </div>

          {defDim?.type === 'interactive_mitigation' && (
            <div className="px-4 pb-4 border-t border-gray-800 pt-3 space-y-1.5">
              <div className="font-mono text-[10px] text-gray-500 mb-2 tracking-widest">DEFENSE ACTIONS</div>
              {defDim.config.mitigations.map(m => {
                const applicable = !m.skip_if_states_not_reached?.length ||
                  m.skip_if_states_not_reached.some(s => stepReachedIds.has(s));
                const revokedResources = (scenario.simulation.resources).filter(
                  (r) => r.revocable && resourceValues.get(r.id) === null,
                );
                const done = applicable && (
                  m.action === 'ip_blocked' ? blockedIPs.size > 0
                  : m.action === 'session_revoked' ? revokedResources.length > 0
                  : m.action === 'stored_xss_deleted' ? userActions.some(a =>
                    a.type === 'delete_xss' || (a.type === 'delete_db_record' && a.invalidates_resource === 'stored_xss')
                  )
                  : Object.keys(filePatches).length > 0
                );
                const detail =
                  m.action === 'ip_blocked' ? [...blockedIPs].join(', ')
                  : m.action === 'session_revoked' ? [...revokedTokens].map(t => t.slice(0, 20) + '…').join(', ')
                  : Object.keys(filePatches).join(', ');
                return (
                  <div key={m.action} className="flex items-start gap-2 font-mono text-xs">
                    {!applicable
                      ? <span className="text-gray-600 mt-0.5 shrink-0 text-[11px]">—</span>
                      : done
                        ? <CheckCircle size={12} className="text-green-400 mt-0.5 shrink-0" />
                        : <XCircle size={12} className="text-red-500 mt-0.5 shrink-0" />}
                    <span className={!applicable ? 'text-gray-600' : done ? 'text-green-400' : 'text-gray-600'}>
                      {MITIGATION_LABELS[m.action] ?? m.action}
                    </span>
                    {!applicable
                      ? <span className="text-gray-600 ml-1 italic">N/A</span>
                      : done && detail && <span className="text-gray-500 ml-1">{detail}</span>}
                    <span className="ml-auto text-gray-600">+{m.points}pts</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Report grading */}
        <div className="cyber-panel">
          <div className="cyber-panel-header">FORENSIC REPORT REVIEW</div>
          <div className="p-4 space-y-3">
            {scenario.report.fields.map(field => {
              const resolved = resolveField(field, usedAttackerIps);
              const skipped = isFieldSkipped(field, stepReachedIds);
              const answered = reportAnswers[field.id] ?? '';
              const correct = !skipped && gradeField(resolved, answered);
              return (
                <div key={field.id} className="font-mono text-xs">
                  <div className="flex items-start gap-2">
                    {skipped
                      ? <span className="text-gray-600 mt-0.5 shrink-0 text-[11px]">—</span>
                      : correct
                        ? <CheckCircle size={14} className="text-green-400 mt-0.5 shrink-0" />
                        : <XCircle size={14} className="text-red-500 mt-0.5 shrink-0" />}
                    <div className="flex-1">
                      <div className={skipped ? 'text-gray-600' : 'text-gray-400'}>{field.label}</div>
                      {skipped ? (
                        <div className="mt-0.5 text-gray-600 italic">
                          N/A — attack was stopped before this phase
                        </div>
                      ) : (
                        <>
                          <div className="flex gap-2 mt-0.5">
                            <span className="text-gray-600">Your answer:</span>
                            <span className={correct ? 'text-green-400' : 'text-red-400'}>
                              {answered || '(blank)'}
                            </span>
                          </div>
                          <div className="flex gap-2 mt-0.5">
                            <span className="text-gray-600">Correct:</span>
                            <span className="text-cyan-400">
                              {Array.isArray(resolved.correct_answer)
                                ? resolved.correct_answer.join(', ')
                                : resolved.correct_answer}
                            </span>
                          </div>
                          {field.explanation && (
                            <div className="mt-1 text-gray-500 italic border-l border-gray-700 pl-2">
                              {field.explanation}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Replay narration */}
        <div className="cyber-panel">
          <div className="cyber-panel-header">ATTACK TIMELINE RECONSTRUCTION</div>
          <div className="p-4 space-y-2">
            {scenario.replay.narration.map((step, i) => (
              <div key={i} className="flex gap-3 font-mono text-xs">
                <span className="text-neon shrink-0">{String(i + 1).padStart(2, '0')}.</span>
                <span className="text-gray-400">{step.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Defense takeaways */}
        {scenario.defense_takeaways && scenario.defense_takeaways.length > 0 && (
          <div className="cyber-panel">
            <div className="cyber-panel-header">REAL-WORLD DEFENSE TAKEAWAYS</div>
            <div className="p-4 space-y-2">
              {scenario.defense_takeaways.map((tip, i) => (
                <div key={i} className="flex gap-3 font-mono text-xs">
                  <span className="text-yellow-400 shrink-0">{'>'}</span>
                  <span className="text-gray-300">{tip}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between">
          <button className="cyber-button" onClick={onReturn}>
            RETURN TO NC-OS DIRECTORY
          </button>
          <button className="cyber-button" onClick={onRetry}>
            RETRY SCENARIO
          </button>
        </div>
    </div>
  );
}
