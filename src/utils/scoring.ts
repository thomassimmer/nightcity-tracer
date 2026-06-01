import type { Scenario, ReportField } from '@/scenario.types';
import type { UserAction } from '@/utils/saveState';

/**
 * Returns true when a report field should be entirely skipped from scoring
 * because the attacker never reached any of the states listed in
 * `skip_if_states_not_reached`.
 */
export function isFieldSkipped(
  field: ReportField,
  stepReachedIds: Set<string>,
): boolean {
  if (!field.skip_if_states_not_reached || field.skip_if_states_not_reached.length === 0) {
    return false;
  }
  return !field.skip_if_states_not_reached.some((s) => stepReachedIds.has(s));
}

export function resolveField(field: ReportField, usedAttackerIps: string[]): ReportField {
  if (field.correct_answer === "$attacker_ips") {
    return { ...field, correct_answer: usedAttackerIps };
  }
  return field;
}

export function gradeField(field: ReportField, answer: string): boolean {
  const correct = Array.isArray(field.correct_answer)
    ? field.correct_answer
    : [field.correct_answer];

  const a = answer.trim().toLowerCase();

  if (field.match_mode === 'contains_all') {
    return correct.every(c => a.includes(c.toLowerCase()));
  }

  return correct.some(c => {
    const cv = c.toLowerCase();
    if (field.match_mode === 'exact') return a === cv;
    if (field.match_mode === 'contains') return a.includes(cv) || (a.length > 0 && cv.includes(a));
    if (field.match_mode === 'regex') {
      try { return new RegExp(cv, 'i').test(a); }
      catch (err) {
        console.warn(`gradeField: invalid regex pattern "${cv}" in field "${field.id}":`, err);
        return false;
      }
    }
    return false;
  });
}

export function calcScore(
  scenario: Scenario | null,
  answers: Record<string, string>,
  elapsed: number,
  blockedIPs: Set<string>,
  filePatches: Record<string, string>,
  userActions: UserAction[] = [],
  stepReachedIds: Set<string> = new Set(),
  usedAttackerIps: string[] = [],
  revokedTokens: Set<string> = new Set(),
): { speed: number; precision: number; defense: number; total: number } {
  if (!scenario) return { speed: 0, precision: 0, defense: 0, total: 0 };

  const dims = scenario.scoring.dimensions;

  const speedDim = dims['speed'];
  let speed = speedDim ? 0 : 100;
  if (scenario.tutorial?.enabled) {
    speed = 100;
  } else if (speedDim?.type === 'time_pressure') {
    const { full_score_before, zero_score_after } = speedDim.config;
    if (elapsed <= full_score_before) speed = 100;
    else if (elapsed >= zero_score_after) speed = 0;
    else speed = Math.round(100 * (1 - (elapsed - full_score_before) / (zero_score_after - full_score_before)));
  }

  const precDim = dims['precision'];
  let precision = 0;
  if (precDim?.type === 'field_match') {
    const fields = precDim.config.fields;
    const reportFields = fields
      ? scenario.report.fields.filter(f => fields.includes(f.id))
      : scenario.report.fields;
    // Exclude fields whose required attacker states were never reached
    const activeFields = reportFields.filter(f => !isFieldSkipped(f, stepReachedIds));
    const correct = activeFields.filter(f => gradeField(resolveField(f, usedAttackerIps), answers[f.id] ?? '')).length;
    precision = activeFields.length > 0 ? Math.round((correct / activeFields.length) * 100) : 0;
  }

  const defDim = dims['defense_efficiency'];
  let defense = 0;
  if (defDim?.type === 'interactive_mitigation') {
    const applicableMitigations = defDim.config.mitigations.filter(m => {
      if (!m.skip_if_states_not_reached?.length) return true;
      return m.skip_if_states_not_reached.some(s => stepReachedIds.has(s));
    });
    const max = applicableMitigations.reduce((s, m) => s + m.points, 0);
    const sessionRevoked = revokedTokens.size > 0;
    let earned = 0;
    applicableMitigations.forEach(m => {
      if (m.action === 'ip_blocked' && blockedIPs.size > 0) earned += m.points;
      if (m.action === 'session_revoked' && sessionRevoked) earned += m.points;
      if (m.action === 'code_patched' && Object.keys(filePatches).length > 0) earned += m.points;
      if (m.action === 'stored_xss_deleted' && userActions.some(a =>
        a.type === 'delete_xss' || (a.type === 'delete_db_record' && a.invalidates_resource === 'stored_xss')
      )) earned += m.points;
    });
    defense = max > 0 ? Math.round((earned / max) * 100) : 100;
  }

  const sw = speedDim?.weight ?? 0;
  const pw = precDim?.weight ?? 0.50;
  const dw = defDim?.weight ?? 0.25;
  const total = Math.round(speed * sw + precision * pw + defense * dw);

  return { speed, precision, defense, total };
}

export function getGrade(total: number): { letter: string; title: string } {
  if (total >= 90) return { letter: 'S', title: 'Elite Netrunner' };
  if (total >= 75) return { letter: 'A', title: 'Senior Analyst' };
  if (total >= 50) return { letter: 'B', title: 'Field Agent' };
  if (total >= 25) return { letter: 'C', title: 'Raw Recruit' };
  return { letter: 'F', title: 'Ghost Protocol Failed' };
}

export const MITIGATION_LABELS: Record<string, string> = {
  ip_blocked: 'IP Blocked',
  session_revoked: 'Session Revoked',
  code_patched: 'Code Patched',
  stored_xss_deleted: 'Stored XSS Deleted',
};
