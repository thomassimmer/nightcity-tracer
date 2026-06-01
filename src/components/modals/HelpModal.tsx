import { X, HelpCircle } from 'lucide-react';
import { useSimulationStore } from '@/store/useSimulationStore';

export const HELP_STORAGE_KEY = 'nightcity-help-seen';

const PANEL_TYPE_FALLBACKS: Partial<Record<string, string>> = {
  log_stream:       'Live event stream. Trace system activity in real time.',
  terminal:         'Command shell. Query and filter forensic data.',
  code_editor:      'Source file viewer. Inspect application code.',
  config_file:      'Configuration file. Review system settings.',
  diff_viewer:      'File diff. Compare original vs. modified versions.',
  network_map:      'Network topology. Visualise active connections.',
  admin_console:    'Admin interface. Access privileged endpoints.',
  git_history:      'Repository log. Trace commit history.',
  email_chain:      'Inbox. Read intercepted communications.',
  memory_dump:      'Memory capture. Analyse process memory.',
  db_schema:        'Database schema. Inspect table structure.',
  timeline_builder: 'Timeline. Reconstruct the sequence of events.',
};

const SHORTCUTS: [string, string][] = [
  ['?',   'Open / close this handbook'],
  ['B',   'Review the briefing'],
  ['N',   'Open / close notifications'],
  ['F',   'Open / close file report'],
  ['← →', 'Navigate between panels'],
  ['Z',   'Zoom / restore active panel'],
  ['W',   'Close active panel'],
  ['1–9', 'Toggle panel by index'],
  ['Esc', 'Exit zoom'],
];

export function HelpModal({ onClose }: { onClose: () => void }) {
  const { scenario } = useSimulationStore();
  const hasCodeEditor = scenario?.panels.some(p => p.type === 'file_explorer' || p.type === 'code_editor') ?? false;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-50"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Agent Handbook"
        className="cyber-panel w-full max-w-xl max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="cyber-panel-header">
          <div className="flex items-center gap-2">
            <HelpCircle size={14} className="text-theme-primary" />
            <span>AGENT HANDBOOK</span>
          </div>
          <button onClick={onClose} aria-label="Close" className="opacity-60 hover:opacity-100"><X size={16} /></button>
        </div>

        <div className="p-5 text-xs overflow-y-auto flex-1 space-y-5">
          {scenario && (
            <div>
              <div className="text-theme-primary font-bold tracking-widest mb-2">// AVAILABLE PANELS</div>
              <div className="space-y-2.5">
                {scenario.panels.map(panel => (
                  <div key={panel.id}>
                    <span className="text-white">{panel.label}</span>
                    <span className="text-gray-600 mx-1">:</span>
                    <span className="text-gray-500">
                      {panel.description ?? PANEL_TYPE_FALLBACKS[panel.type] ?? 'Investigation tool.'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="text-theme-primary font-bold tracking-widest mb-2">// SHORTCUTS</div>
            <div className="space-y-1.5">
              {SHORTCUTS.map(([key, desc]) => (
                <div key={key} className="flex gap-3">
                  <span className="text-theme-primary w-12 shrink-0 font-bold">{key}</span>
                  <span className="text-gray-500">{desc}</span>
                </div>
              ))}
              {hasCodeEditor && (
                <div className="flex gap-3">
                  <span className="text-theme-primary shrink-0 font-bold whitespace-nowrap">Ctrl+click</span>
                  <span className="text-gray-500 ml-3">Go to definition in source files</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-theme-border flex justify-end">
          <button onClick={onClose} className="cyber-button text-xs">UNDERSTOOD</button>
        </div>
      </div>
    </div>
  );
}
