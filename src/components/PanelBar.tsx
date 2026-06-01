import {
  Terminal, ScrollText, Code2, Network, ShieldCheck, GitMerge,
  GitCommit, Mail, Cpu, Database, MessageSquare,
  Cloud, FileCode, Zap, Box, BadgeCheck,
  Clock, Thermometer, Binary, Key,
} from 'lucide-react';
import type { PanelDefinition } from '@/scenario.types';
import type { PanelManager } from '@/hooks/usePanelManager';

const PANEL_ICONS: Record<string, React.ElementType> = {
  terminal: Terminal,
  log_stream: ScrollText,
  code_editor: Code2,
  network_map: Network,
  admin_console: ShieldCheck,
  diff_viewer: GitMerge,
  git_history: GitCommit,
  email_chain: Mail,
  memory_dump: Cpu,
  db_schema: Database,
  db_viewer: Database,
  conversation_log: MessageSquare,
  cloud_config: Cloud,
  config_file: FileCode,
  serverless_logs: Zap,
  k8s_logs: Box,
  badge_log: BadgeCheck,
  timeline_builder: Clock,
  thermal_map: Thermometer,
  hex_viewer: Binary,
  jwt_decoder: Key,
};

export { PANEL_ICONS };

export function PanelBar({
  panels,
  manager,
}: {
  panels: PanelDefinition[];
  manager: PanelManager;
}) {
  return (
    <div className="flex items-center shrink-0 border-b border-theme-border bg-black/30 h-8">
      <div
        className="flex-1 flex items-center justify-center gap-1 overflow-x-auto px-3"
        style={{ scrollbarWidth: 'none' }}
      >
        {manager.order.map((id, i) => {
          const panel = panels.find(p => p.id === id);
          if (!panel) return null;
          const state = manager.states[id] ?? { isOpen: true, isNew: false };
          const isOpen = state.isOpen;
          const isNew = state.isNew;
          const isActive = manager.activeId === id && isOpen;
          const Icon = PANEL_ICONS[panel.type] ?? Box;

          return (
            <button
              key={id}
              onClick={() => {
                if (isNew) manager.markSeen(id);
                manager.toggleOpen(id);
                if (!isOpen) manager.setActive(id);
              }}
              title={`${panel.label} [${i + 1}]`}
              className={`
                flex items-center gap-1 px-2 py-0.5 rounded
                font-mono text-[10px] whitespace-nowrap shrink-0
                transition-all border
                ${isNew
                  ? 'border-cyan-400/60 text-cyan-300 bg-cyan-950/40 animate-pulse'
                  : isActive
                  ? 'border-theme-primary/60 text-theme-primary bg-theme-primary/10'
                  : isOpen
                  ? 'border-theme-border/60 text-gray-300 bg-black/20 hover:border-gray-500'
                  : 'border-transparent text-gray-600 bg-transparent hover:text-gray-400 hover:border-gray-700'}
              `}
            >
              <Icon size={9} />
              <span>{panel.label}</span>
            </button>
          );
        })}
      </div>

    </div>
  );
}
