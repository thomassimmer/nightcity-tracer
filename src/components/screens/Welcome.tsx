import { useState } from "react";
import { Shield, Terminal, BookOpen, Search } from "lucide-react";
import type { Scenario } from "@/scenario.types";
import type { SavedState, CompletedState } from "@/utils/saveState";
import { CyberSelect } from "@/components/ui/CyberSelect";
import { GitHubIcon } from "@/components/ui/GitHubIcon";
import { TutorialBanner } from "@/components/screens/TutorialBanner";
import { ScenarioCard } from "@/components/screens/ScenarioCard";

const GITHUB_URL = "https://github.com/thomassimmer/nightcity-tracer";

interface Props {
  scenarios: Scenario[];
  savedStates: Record<string, SavedState>;
  completions: Record<string, CompletedState>;
  onSelectScenario: (scenario: Scenario) => void;
  onResume: (scenarioId: string) => void;
}

export function Welcome({
  scenarios,
  savedStates,
  completions,
  onSelectScenario,
  onResume,
}: Props) {
  const [search, setSearch] = useState("");
  const [selectedMode, setSelectedMode] = useState<string>("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [tutorialDone] = useState(
    () => localStorage.getItem("nc_tutorial_done") !== null
  );

  const tutorialScenario = scenarios.find((s) => s.tutorial?.enabled);
  const regularScenarios = scenarios.filter((s) => !s.tutorial?.enabled);

  const filtered = regularScenarios.filter((s) => {
    const q = search.toLowerCase();
    const matchesSearch =
      s.title.toLowerCase().includes(q) ||
      s.world.corporation.toLowerCase().includes(q) ||
      s.tags.some((t) => t.toLowerCase().includes(q));
    const matchesDifficulty =
      selectedDifficulty === "all" ||
      s.gameplay.difficulty === selectedDifficulty;
    const matchesMode =
      selectedMode === "all" || s.gameplay.mode === selectedMode;
    const matchesStatus =
      selectedStatus === "all" ||
      (selectedStatus === "completed" && !!completions[s.id]) ||
      (selectedStatus === "new" && !completions[s.id]);
    return matchesSearch && matchesDifficulty && matchesMode && matchesStatus;
  });

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col p-6 max-w-7xl mx-auto w-full z-10">
      <div className="cyber-grid-bg" />

      <header className="flex justify-between items-center mb-10 mt-4 border-b border-theme-border pb-4">
        <div className="flex items-center gap-3">
          <Terminal className="text-neon animate-pulse" size={24} />
          <div>
            <h1 className="text-xl font-bold font-header text-neon tracking-wider">
              NC-OS // FORENSICS UNIT
            </h1>
            <p className="text-[10px] text-gray-500 font-mono">
              CONNECTION STATUS: SECURE
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {tutorialScenario && (
            <button
              onClick={() => onSelectScenario(tutorialScenario)}
              aria-label="Start tutorial"
              title="Tutorial"
              className={`transition-colors duration-200 cursor-pointer bg-transparent border-none p-0 ${
                !tutorialDone
                  ? "text-amber-500 hover:text-amber-300"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <BookOpen size={16} />
            </button>
          )}
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub repository"
            className="text-gray-500 hover:text-neon transition-colors duration-200"
          >
            <GitHubIcon />
          </a>
        </div>
      </header>

      <div className="text-center my-6 flex flex-col items-center">
        <h2
          className="text-5xl md:text-6xl text-glitch tracking-widest mb-2 transition-transform duration-300 hover:scale-[1.04] cursor-default"
          data-text="NIGHTCITY TRACER"
        >
          NIGHTCITY TRACER
        </h2>
        <p className="text-xs text-cyan-400 max-w-lg mt-2 leading-relaxed">
          Trace the ghost. Reconstruct the breach.
          <span className="block text-gray-500 mt-1">
            Real forensics tradecraft, Night City aesthetic.
          </span>
        </p>
      </div>

      {tutorialScenario && !tutorialDone && (
        <TutorialBanner scenario={tutorialScenario} onSelect={onSelectScenario} />
      )}

      <section className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8 mt-6 relative z-10">
        <div className="cyber-panel md:col-span-2 flex items-center px-4 py-1">
          <Search size={16} className="text-gray-500 mr-2 shrink-0" />
          <input
            type="text"
            aria-label="Search scenarios"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, corp, or technique..."
            className="bg-transparent border-none outline-none w-full text-xs text-white placeholder-gray-600 py-2"
          />
        </div>

        <CyberSelect
          label="DIFFICULTY"
          value={selectedDifficulty}
          onChange={setSelectedDifficulty}
          options={[
            { value: "all", label: "ALL" },
            { value: "beginner", label: "BEGINNER", color: "text-cyan-400" },
            { value: "intermediate", label: "INTERMEDIATE", color: "text-orange-400" },
            { value: "advanced", label: "ADVANCED", color: "text-red-500" },
          ]}
        />

        <CyberSelect
          label="MODE"
          value={selectedMode}
          onChange={setSelectedMode}
          options={[
            { value: "all", label: "ALL" },
            { value: "live", label: "LIVE", color: "text-red-500" },
            { value: "postmortem", label: "POST-MORTEM", color: "text-purple-400" },
          ]}
        />

        <CyberSelect
          label="STATUS"
          value={selectedStatus}
          onChange={setSelectedStatus}
          options={[
            { value: "all", label: "ALL" },
            { value: "new", label: "NEW", color: "text-gray-400" },
            { value: "completed", label: "COMPLETED", color: "text-green-400" },
          ]}
        />
      </section>

      <main className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 flex-1 mb-10">
        {filtered.map((sc) => (
          <ScenarioCard
            key={sc.id}
            sc={sc}
            save={savedStates[sc.id]}
            completion={completions[sc.id]}
            onSelectScenario={onSelectScenario}
            onResume={onResume}
          />
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full py-16 text-center cyber-panel bg-black/40 border-dashed">
            <Shield size={36} className="mx-auto text-gray-500 animate-pulse mb-3" />
            <p className="font-mono text-sm text-gray-500">
              NO ENCRYPTED DOSSIERS MATCHING CURRENT SEARCH.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
