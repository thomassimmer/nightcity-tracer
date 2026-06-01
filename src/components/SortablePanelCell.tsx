import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripHorizontal, Maximize2, Minimize2, X, Box } from 'lucide-react';
import { Terminal } from '@/components/panels/Terminal';
import { LogStream } from '@/components/panels/LogStream';
import { CodeEditor } from '@/components/panels/CodeEditor';
import { DiffViewer } from '@/components/panels/DiffViewer';
import { NetworkMap } from '@/components/panels/NetworkMap';
import { ConversationLog } from '@/components/panels/ConversationLog';
import { DbViewerPanel } from '@/components/panels/DbViewerPanel';
import { PANEL_ICONS } from '@/components/PanelBar';
import type { PanelDefinition } from '@/scenario.types';

function PlaceholderPanel({ panel }: { panel: PanelDefinition }) {
  const Icon = PANEL_ICONS[panel.type] ?? Box;
  return (
    <div className="cyber-panel flex flex-col h-full">
      <div className="cyber-panel-header">
        <div className="flex items-center gap-1.5">
          <Icon size={11} />
          <span>{panel.label.toUpperCase()}</span>
        </div>
        <span className="text-[10px] text-gray-600">{panel.type}</span>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-700 font-mono text-xs">
        <span className="text-3xl tracking-widest">[ _ ]</span>
        <span>MODULE OFFLINE: COMING SOON</span>
      </div>
    </div>
  );
}

function PanelRenderer({ panel, onTerminalCommand }: { panel: PanelDefinition; onTerminalCommand?: (cmd: string) => void }) {
  switch (panel.type) {
    case 'log_stream':    return <LogStream label={panel.label} source={panel.config.source} />;
    case 'terminal':      return <Terminal config={panel.config} onCommandExecuted={onTerminalCommand} />;
    case 'code_editor':
    case 'config_file':   return <CodeEditor filePath={panel.config.file_path} label={panel.label} visiblePaths={[panel.config.file_path]} />;
    case 'file_explorer': return <CodeEditor filePath={panel.config.default_file} label={panel.label} visiblePaths={panel.config.files} />;
    case 'diff_viewer':   return (
      <DiffViewer
        originalFilePath={panel.config.original_file_path}
        modifiedFilePath={panel.config.modified_file_path}
        label={panel.label}
      />
    );
    case 'network_map':   return <NetworkMap label={panel.label} />;
    case 'db_viewer':     return <DbViewerPanel config={panel.config} label={panel.label} />;
    case 'conversation_log': return (
      <ConversationLog
        sessionFile={panel.config.session_file}
        participants={panel.config.participants}
      />
    );
    default: return <PlaceholderPanel panel={panel} />;
  }
}

export interface SortablePanelCellProps {
  id: string;
  panel: PanelDefinition;
  gridColumn: string;
  gridRow: string;
  isActive: boolean;
  isZoomed: boolean;
  isHidden: boolean;
  onZoom: () => void;
  onClose: () => void;
  onActivate: () => void;
  onTerminalCommand?: (cmd: string) => void;
}

export function SortablePanelCell({
  id, panel, gridColumn, gridRow,
  isActive, isZoomed, isHidden,
  onZoom, onClose, onActivate, onTerminalCommand,
}: SortablePanelCellProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      data-tutorial-id={`panel:${id}`}
      onClick={onActivate}
      style={{
        gridColumn: isZoomed ? undefined : gridColumn,
        gridRow: isZoomed ? undefined : gridRow,
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 5 : isZoomed ? 4 : 'auto',
        ...(isZoomed ? { position: 'absolute', inset: 0, zIndex: 10 } : {}),
        ...(isHidden ? { visibility: 'hidden' as const, pointerEvents: 'none' as const } : {}),
      }}
      className={`flex flex-col overflow-hidden min-h-0 group/cell ${
        isActive && !isZoomed ? 'ring-1 ring-inset ring-theme-primary/25' : ''
      } ${isDragging ? 'opacity-75' : ''}`}
    >
      <div className={`flex items-center h-5 shrink-0 px-1 gap-0.5 transition-opacity ${
        isZoomed ? 'opacity-100' : 'opacity-0 group-hover/cell:opacity-100'
      }`}>
        {!isZoomed && (
          <div
            {...attributes}
            {...listeners}
            className="flex-1 cursor-grab active:cursor-grabbing flex items-center justify-center"
            title="Drag to reorder"
          >
            <GripHorizontal size={8} className="text-gray-700" />
          </div>
        )}
        <div className="ml-auto flex items-center gap-0.5">
          <button
            onClick={e => { e.stopPropagation(); onZoom(); }}
            title={isZoomed ? 'Restore [Z]' : 'Zoom [Z]'}
            aria-label={isZoomed ? 'Restore panel' : 'Zoom panel'}
            className="p-0.5 rounded text-gray-600 hover:text-theme-primary transition-colors"
          >
            {isZoomed ? <Minimize2 size={10} /> : <Maximize2 size={10} />}
          </button>
          {!isZoomed && (
            <button
              onClick={e => { e.stopPropagation(); onClose(); }}
              title="Close [W]"
              aria-label="Close panel"
              className="p-0.5 rounded text-gray-600 hover:text-red-400 transition-colors"
            >
              <X size={10} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden min-h-0">
        <PanelRenderer panel={panel} onTerminalCommand={onTerminalCommand} />
      </div>
    </div>
  );
}
