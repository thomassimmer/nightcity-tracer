import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, ChevronRight, Search, X, Copy, Check } from 'lucide-react';
import { useSimulationStore } from '@/store/useSimulationStore';
import type { FileState } from '@/scenario.types';
import { CopilotPatching } from '@/components/modals/CopilotPatching';
import { strings } from '@/strings';
import { detectLanguage, tokenizeLine, TOK_COLORS, findDefinition } from '@/utils/codeTokenizer';
import { buildGroups, fileName, searchVirtualFiles } from '@/utils/codeFileTree';
import type { TreeGroup, SearchHit } from '@/utils/codeFileTree';

// ─── File tree ────────────────────────────────────────────────────────────────

interface FileTreeProps {
  files: Record<string, FileState>;
  visiblePaths?: string[];
  activeFilePath: string;
  onSelect: (path: string) => void;
  onSearchOpen: () => void;
}

function FileTree({ files, visiblePaths, activeFilePath, onSelect, onSearchOpen }: FileTreeProps) {
  const paths = (visiblePaths ?? Object.keys(files)).sort();
  const groups: TreeGroup[] = buildGroups(paths);
  const s = strings.codeEditor;

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-black/30 border-r border-theme-border select-none">
      <div className="flex items-center justify-between px-2 pt-2 pb-1">
        <span className="text-xs font-mono font-bold text-gray-600 tracking-widest uppercase">
          {s.filesSection}
        </span>
        <button
          onClick={onSearchOpen}
          title="Search in files"
          className="text-gray-600 hover:text-gray-300 transition-colors"
        >
          <Search size={11} />
        </button>
      </div>

      {paths.length === 0 && (
        <div className="px-2 text-[10px] text-gray-700 font-mono italic">{s.noFilesAvailable}</div>
      )}

      {groups.map((group) => (
        <div key={group.dir ?? '__root__'}>
          {group.dir !== null && (
            <div className="flex items-center gap-0.5 px-1.5 pt-1.5 pb-0.5">
              <ChevronRight size={10} className="text-gray-600 shrink-0" />
              <span className="text-xs font-mono text-gray-500 truncate">{group.dir}/</span>
            </div>
          )}
          {group.paths.map((path) => {
            const isActive = path === activeFilePath;
            const fileState = files[path];
            const isFullyPatched = fileState?.patchedRuleIds.length > 0;
            const name = fileName(path);
            return (
              <button
                key={path}
                onClick={() => onSelect(path)}
                title={path}
                className={`w-full flex items-center gap-1 px-2 py-0.5 text-xs font-mono text-left transition-colors ${
                  group.dir !== null ? 'pl-5' : 'pl-2'
                } ${
                  isActive
                    ? 'bg-theme-primary/15 text-theme-primary'
                    : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                }`}
              >
                <span className="truncate flex-1">{name}</span>
                {isFullyPatched && <CheckCircle2 size={9} className="shrink-0 text-emerald-500" />}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─── Search sidebar ───────────────────────────────────────────────────────────

interface SearchSidebarProps {
  files: Record<string, FileState>;
  onNavigate: (filePath: string, lineNumber: number) => void;
  onClose: () => void;
}

function SearchSidebar({ files, onNavigate, onClose }: SearchSidebarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchHit[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const s = strings.codeEditor;

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    const timer = setTimeout(() => setResults(searchVirtualFiles(files, query)), 150);
    return () => clearTimeout(timer);
  }, [query, files]);

  const grouped = results.reduce<Map<string, SearchHit[]>>((acc, hit) => {
    const existing = acc.get(hit.filePath) ?? [];
    existing.push(hit);
    acc.set(hit.filePath, existing);
    return acc;
  }, new Map());

  return (
    <div className="flex flex-col h-full bg-black/30 border-r border-theme-border">
      <div className="flex items-center gap-1.5 px-2 pt-2 pb-1.5">
        <Search size={9} className="text-gray-600 shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={s.searchPlaceholder}
          className="flex-1 bg-transparent text-xs font-mono text-gray-200 outline-none placeholder:text-gray-700 min-w-0"
        />
        <button onClick={onClose} className="text-gray-700 hover:text-gray-400 shrink-0">
          <X size={9} />
        </button>
      </div>
      <div className="h-px bg-gray-800/50" />

      <div className="flex-1 overflow-y-auto">
        {!query.trim() && (
          <p className="px-2 pt-2 text-xs text-gray-700 font-mono italic">{s.searchPrompt}</p>
        )}
        {query.trim() && results.length === 0 && (
          <p className="px-2 pt-2 text-xs text-gray-700 font-mono italic">{s.searchNoResults(query)}</p>
        )}
        {[...grouped].map(([filePath, hits]) => (
          <div key={filePath}>
            <div className="px-2 pt-2 pb-0.5 text-xs font-mono text-gray-500 truncate" title={filePath}>
              {fileName(filePath)}
            </div>
            {hits.map((hit) => (
              <button
                key={`${hit.filePath}:${hit.lineNumber}`}
                onClick={() => onNavigate(hit.filePath, hit.lineNumber)}
                className="w-full flex items-start gap-1.5 px-2 py-0.5 hover:bg-white/5 text-left"
              >
                <span className="text-xs font-mono text-gray-700 shrink-0 w-5 text-right leading-4 mt-px">{hit.lineNumber}</span>
                <span className="text-xs font-mono text-gray-400 truncate leading-4">{hit.lineContent.trim()}</span>
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface CodeEditorProps {
  filePath: string;
  label: string;
  visiblePaths?: string[];
}

export function CodeEditor({ filePath, label, visiblePaths }: CodeEditorProps) {
  const { virtualFiles, scenario } = useSimulationStore();
  const [activeFilePath, setActiveFilePath] = useState(filePath);
  const [openCopilotRuleId, setOpenCopilotRuleId] = useState<string | null>(null);
  const [searchMode, setSearchMode] = useState(false);
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [scrollToLine, setScrollToLine] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const codeAreaRef = useRef<HTMLDivElement>(null);
  const s = strings.codeEditor;

  const patchRules = scenario?.simulation.interactive_defense?.code_patching_rules ?? [];
  const currentRules = patchRules.filter((r) => r.target_file === activeFilePath);

  const fileState = virtualFiles[activeFilePath];
  const content = fileState?.content ?? s.fileNotFound(activeFilePath);
  const patchedRuleIds = fileState?.patchedRuleIds ?? [];
  const lang = detectLanguage(activeFilePath);
  const lines = content.split('\n');

  const isFullyPatched = currentRules.length > 0 && currentRules.every(r => patchedRuleIds.includes(r.id));
  const lineToRule = new Map<number, typeof currentRules[0]>();
  for (const rule of currentRules) {
    if (rule.vulnerable_lines && !patchedRuleIds.includes(rule.id)) {
      for (const ln of rule.vulnerable_lines) {
        lineToRule.set(ln, rule);
      }
    }
  }

  useEffect(() => { setSelectedLine(null); }, [activeFilePath]);

  useEffect(() => {
    if (scrollToLine === null || !codeAreaRef.current) return;
    const row = codeAreaRef.current.querySelector(`[data-line="${scrollToLine}"]`);
    if (row) row.scrollIntoView({ block: 'center', behavior: 'smooth' });
    setScrollToLine(null);
  }, [scrollToLine]);

  const handleLineClick = (lineNum: number) => {
    setSelectedLine(lineNum);
    const rule = lineToRule.get(lineNum);
    if (rule) {
      setOpenCopilotRuleId(rule.id);
    }
  };

  const handleSearchNavigate = (targetPath: string, lineNumber: number) => {
    setActiveFilePath(targetPath);
    setSelectedLine(lineNumber);
    setScrollToLine(lineNumber);
    setSearchMode(false);
  };

  const handleGoToDefinition = (word: string) => {
    const result = findDefinition(word, virtualFiles);
    if (result) handleSearchNavigate(result.filePath, result.lineNumber);
  };

  const handleCopyPath = () => {
    navigator.clipboard.writeText(activeFilePath).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="cyber-panel flex flex-col h-full">
      {/* Header */}
      <div className="cyber-panel-header shrink-0">
        <span>{label.toUpperCase()}</span>
        <div className="flex items-center gap-2">
          {isFullyPatched && (
            <span className="flex items-center gap-1 text-emerald-400 text-[10px] font-bold font-mono border border-emerald-800 px-1.5 py-0.5 rounded">
              <CheckCircle2 size={9} />
              {s.patched}
            </span>
          )}
        </div>
      </div>

      {/* Body: sidebar + code */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Sidebar */}
        <div className={`shrink-0 transition-all duration-150 ${searchMode ? 'w-52' : 'w-36'}`}>
          {searchMode ? (
            <SearchSidebar
              files={virtualFiles}
              onNavigate={handleSearchNavigate}
              onClose={() => setSearchMode(false)}
            />
          ) : (
            <FileTree
              files={virtualFiles}
              visiblePaths={visiblePaths}
              activeFilePath={activeFilePath}
              onSelect={setActiveFilePath}
              onSearchOpen={() => setSearchMode(true)}
            />
          )}
        </div>

        {/* Code area */}
        <div ref={codeAreaRef} className="flex-1 overflow-auto font-mono text-xs leading-5 bg-black/20">
          {/* Breadcrumb with copy button */}
          <div className="sticky top-0 z-10 flex items-center gap-1.5 px-3 py-0.5 bg-black/60 border-b border-gray-800/50">
            <span className="font-mono text-xs text-gray-600 truncate">{activeFilePath}</span>
            <button
              onClick={handleCopyPath}
              title="Copy file path"
              className="shrink-0 text-gray-700 hover:text-gray-400 transition-colors"
            >
              {copied ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}
            </button>
            <span className="font-mono text-xs text-gray-700 ml-auto shrink-0">{lang}</span>
          </div>

          <table className="w-full border-collapse">
            <tbody>
              {lines.map((line, i) => {
                const lineNum = i + 1;
                const isSelected = selectedLine === lineNum;
                const isVulnerable = lineToRule.has(lineNum);
                const toks = tokenizeLine(line, lang);

                return (
                  <tr
                    key={i}
                    data-line={lineNum}
                    onClick={() => handleLineClick(lineNum)}
                    className={`cursor-pointer ${
                      isSelected ? 'bg-cyan-900/20' : 'hover:bg-white/2'
                    }`}
                  >
                    <td className={`select-none text-right pr-3 pl-2 w-10 shrink-0 align-top border-r border-gray-800/40 ${
                      isVulnerable && isSelected ? 'text-amber-400' : 'text-gray-700'
                    }`}>
                      {lineNum}
                    </td>
                    <td className="pl-3 pr-2 whitespace-pre align-top">
                      {toks.map((tok, j) => (
                        <span
                          key={j}
                          className={TOK_COLORS[tok.type]}
                          onClick={tok.type === 'plain' ? (e) => {
                            if (e.ctrlKey || e.metaKey) {
                              e.stopPropagation();
                              handleGoToDefinition(tok.value);
                            }
                          } : undefined}
                        >{tok.value}</span>
                      ))}
                      {line === '' && ' '}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {openCopilotRuleId && createPortal(
        <CopilotPatching
          filePath={activeFilePath}
          ruleId={openCopilotRuleId}
          onClose={() => setOpenCopilotRuleId(null)}
        />,
        document.body,
      )}
    </div>
  );
}
