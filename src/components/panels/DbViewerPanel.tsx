import { useState, useEffect, useRef, useCallback } from 'react';
import { Database, Trash2 } from 'lucide-react';
import { useSimulationStore } from '@/store/useSimulationStore';
import type { DbViewerPanel as DbViewerPanelType, DbViewerCollectionSchema, RuntimeDbRecord, DbRecord } from '@/scenario.types';

interface StaticRow {
  kind: 'static';
  id: string;
  record: DbRecord;
}
interface DynamicRow {
  kind: 'dynamic';
  id: string;
  record: RuntimeDbRecord;
}
type Row = StaticRow | DynamicRow;

function rowMatchesFilter(row: Row, filter: string): boolean {
  const q = filter.toLowerCase();
  if (row.kind === 'static') {
    return row.record.display_lines.some(l => l.toLowerCase().includes(q));
  }
  return Object.values(row.record.fields).some(v => v.toLowerCase().includes(q));
}

function displayId(id: string): string {
  return id.replace(/^dyn-/, '');
}

function RecordRow({
  row,
  schema,
  onDelete,
}: {
  row: Row;
  schema: DbViewerCollectionSchema;
  onDelete?: (id: string, invalidates_resource?: string) => void;
}) {
  const canDelete = onDelete && (row.kind === 'dynamic' || !row.record.delete_denied);
  const invalidates = row.record.invalidates_resource;

  if (row.kind === 'static') {
    return (
      <div className="group flex items-center gap-1 py-0.5 px-1 rounded hover:bg-white/5 text-gray-300">
        <div className="flex-1 min-w-0">
          {row.record.display_lines.map((line, i) => (
            <div key={i} className="font-mono text-[10px] break-all whitespace-pre-wrap leading-relaxed">
              {line}
            </div>
          ))}
        </div>
        {canDelete && (
          <button
            onClick={() => onDelete!(row.id, invalidates)}
            className="opacity-0 group-hover:opacity-100 shrink-0 self-center p-0.5 text-red-500/70 hover:text-red-400 transition-all"
            title="Delete record"
          >
            <Trash2 size={9} />
          </button>
        )}
      </div>
    );
  }

  const rec = row.record;
  const primaryCol = schema.columns.find(c => c !== 'id') ?? schema.columns[0];
  const primaryVal = primaryCol ? (rec.fields[primaryCol] ?? '') : '';
  const otherCols = schema.columns.filter(c => c !== 'id' && c !== primaryCol);

  return (
    <div className="group flex items-center gap-1 py-0.5 px-1 rounded hover:bg-white/5 text-gray-300">
      <div className="flex-1 min-w-0">
        <div className="font-mono text-[10px] leading-relaxed">
          <span className="text-gray-500">[id:{displayId(rec.id)}]</span>{' '}
          <span className="break-all">{primaryVal}</span>
        </div>
        {otherCols.map(col => {
          const val = rec.fields[col];
          if (!val) return null;
          return (
            <div key={col} className="font-mono text-[10px] text-gray-500 break-all whitespace-pre-wrap leading-relaxed pl-2">
              {col}: {val}
            </div>
          );
        })}
      </div>
      {canDelete && (
        <button
          onClick={() => onDelete!(rec.id, invalidates)}
          className="opacity-0 group-hover:opacity-100 shrink-0 self-center p-0.5 text-red-500/70 hover:text-red-400 transition-all"
          title="Delete record"
        >
          <Trash2 size={9} />
        </button>
      )}
    </div>
  );
}

function TableList({
  schemas,
  activeTable,
  rowCounts,
  onSelect,
}: {
  schemas: DbViewerCollectionSchema[];
  activeTable: string;
  rowCounts: Map<string, number>;
  onSelect: (name: string) => void;
}) {
  return (
    <div className="flex flex-col h-full overflow-y-auto bg-black/30 border-r border-theme-border select-none">
      <div className="px-2 pt-2 pb-1">
        <span className="text-xs font-mono font-bold text-gray-600 tracking-widest uppercase">Tables</span>
      </div>
      {schemas.map(schema => {
        const isActive = schema.name === activeTable;
        const count = rowCounts.get(schema.name) ?? 0;
        return (
          <button
            key={schema.name}
            onClick={() => onSelect(schema.name)}
            title={schema.name}
            className={`w-full flex items-center gap-1 px-2 py-0.5 text-xs font-mono text-left transition-colors ${
              isActive
                ? 'bg-theme-primary/15 text-theme-primary'
                : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
            }`}
          >
            <span className="truncate flex-1">{schema.name}</span>
            <span className={`shrink-0 text-[10px] ${isActive ? 'text-theme-primary/60' : 'text-gray-600'}`}>{count}</span>
          </button>
        );
      })}
    </div>
  );
}

export function DbViewerPanel({ config, label }: Pick<DbViewerPanelType, 'config' | 'label'>) {
  const { runtimeDbRecords, deletedDbRecords, deleteDbRecord } = useSimulationStore();
  const [activeTable, setActiveTable] = useState(config.collections[0]?.name ?? '');
  const [filter, setFilter] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const atBottomRef = useRef(true);

  useEffect(() => {
    if (atBottomRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [runtimeDbRecords]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  }, []);

  const rowCounts = new Map<string, number>();
  for (const schema of config.collections) {
    const staticCol = config.db_collections?.find(c => c.name === schema.name);
    const staticRecords = staticCol?.records ?? [];
    const dynamicRecords = runtimeDbRecords.get(schema.name) ?? [];
    const deletedIds = deletedDbRecords.get(schema.name) ?? new Set<string>();
    const total = staticRecords.filter(r => !deletedIds.has(r.id)).length
      + dynamicRecords.filter(r => !deletedIds.has(r.id)).length;
    rowCounts.set(schema.name, total);
  }

  const activeSchema = config.collections.find(s => s.name === activeTable);
  let rows: Row[] = [];
  if (activeSchema) {
    const staticCol = config.db_collections?.find(c => c.name === activeTable);
    const staticRecords = staticCol?.records ?? [];
    const dynamicRecords = runtimeDbRecords.get(activeTable) ?? [];
    const deletedIds = deletedDbRecords.get(activeTable) ?? new Set<string>();
    const allRows: Row[] = [
      ...staticRecords
        .filter(r => !deletedIds.has(r.id))
        .map(r => ({ kind: 'static' as const, id: r.id, record: r })),
      ...dynamicRecords
        .filter(r => !deletedIds.has(r.id))
        .map(r => ({ kind: 'dynamic' as const, id: r.id, record: r })),
    ];
    rows = filter ? allRows.filter(r => rowMatchesFilter(r, filter)) : allRows;
  }

  return (
    <div className="cyber-panel flex flex-col h-full">
      <div className="cyber-panel-header shrink-0">
        <div className="flex items-center gap-1.5">
          <Database size={11} />
          <span>{label.toUpperCase()}</span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden min-h-0">
        <div className="shrink-0 w-32">
          <TableList
            schemas={config.collections}
            activeTable={activeTable}
            rowCounts={rowCounts}
            onSelect={name => { setActiveTable(name); setFilter(''); }}
          />
        </div>

        <div className="flex flex-col flex-1 overflow-hidden min-w-0">
          <div className="px-3 py-1 border-b border-theme-border shrink-0">
            <input
              type="text"
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder="Filter…"
              aria-label="Filter records"
              className="w-full bg-transparent text-xs text-white placeholder-gray-600 outline-none font-mono py-1"
            />
          </div>

          <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-2">
            {!activeSchema ? (
              <div className="text-gray-700 font-mono text-[10px] italic py-1">no table selected</div>
            ) : rows.length === 0 ? (
              <div className="text-gray-700 font-mono text-[10px] italic py-1">
                {filter ? 'no match' : 'empty'}
              </div>
            ) : (
              rows.map(row => (
                <RecordRow
                  key={row.id}
                  row={row}
                  schema={activeSchema}
                  onDelete={activeSchema.allow_delete ? (id, inv) => deleteDbRecord(activeSchema.name, id, inv) : undefined}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
