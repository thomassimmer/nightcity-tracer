# NightCity Tracer: Project Guidelines

## Tech stack
React 19, TypeScript 6, Vite 8, Tailwind v4, Lucide icons. 100% static/client-side, hosted on GitHub Pages.

## Architecture
- Phase-based navigation in `App.tsx`: menu > briefing > hud > debrief (no react-router)
- `SimulationProvider` in `main.tsx` wraps the whole app
- All scenario data lives in `src/scenarios/*.ts`
- Types in `src/scenario.types.ts`
- CSS: `src/index.css` (Tailwind v4 `@theme` + imports). Tokens in `src/styles/tokens.css`, primitives in `primitives.css`, feature styles in `styles/features/`. Use Tailwind theme utilities (`text-theme-primary`, `border-theme-border`) for dynamic corporate colors; keep semantic classes (`cyber-panel`, `cyber-button`) for complex effects.

### File layout
```
src/
  components/
    panels/        # One file per panel type (LogStreamPanel, CodeEditorPanel, ...)
    ui/            # Reusable UI primitives with no game logic (CyberSelect, ...)
  context/         # SimulationContext -- single source of truth for game state
  hooks/           # Custom hooks (usePanelManager, useTutorial, ...)
  scenarios/       # One folder per scenario, index.ts as entry point
  utils/           # Pure functions (gridLayout, saveState, ...)
```

## Writing style
- No em dashes (--) anywhere in code, UI strings, or tutorial text.
- UI text in English. Conversations with the user in French.

## Code style
- No comments unless the reason is non-obvious
- No abstractions beyond what the task requires
- Prefer editing existing files over creating new ones
- Keep files small: extract pure functions to `utils/` and React-free types to `scenario.types.ts` before a file grows unwieldy
- Use `import type` for type-only imports
- Named exports everywhere -- no default exports except where a framework requires it
- Never swallow errors silently: use `console.warn` at minimum so scenario authors can diagnose issues
- Use the `@` alias for all imports (`@` maps to `src/`). Exception: `?raw` asset imports inside a scenario folder may stay relative.

## Patterns

### Modals
All modals receive `onClose: () => void`. The backdrop div gets `onClick={onClose}`, the inner panel gets `onClick={e => e.stopPropagation()}`. See `HelpModal`, `BriefingModal`, `NotificationCenter` for reference.

### Terminal commands
Source commands (produce data) and pipe commands (transform data) both return `CommandResult = { data: string[]; error?: string }`. Add source commands in the `idx === 0` branch of `executeCommandChain`, pipe commands in the `else` branch. See `Terminal.tsx` for the full list of handlers.

### Simulation timeline
All simulated time advances through `advanceSecond` in `src/simulation/advanceSecond.ts` (noise, attacker state machine, game-over). Do not duplicate this logic elsewhere.

- **Live play**: one `advanceSecond` call per store tick, with a session `prng` created at start/restore.
- **Postmortem / full timeline**: `buildTimeline` in `src/simulation/buildTimeline.ts` loops `advanceSecond` for the full duration. Pass `collectAlerts: true` to collect `notify_ui` actions.
- **Restore (live)**: `replayTimeline` replays seconds `1..elapsedSeconds` with the same engine.

## Scoring dimensions
`DebriefingScreen` looks for dimension keys `speed`, `precision`, `defense_efficiency` inside `scenario.scoring.dimensions`. Scenarios must use those exact keys (not `field_match`, etc.).

## Tutorial system
- Steps are defined in the scenario file under `tutorial.steps`
- Each step can have `position: 'left' | 'right'` to control which side the overlay appears on
- `TutorialOverlay` resets its position when the step changes
- Top-right button highlights use IDs: `notif-btn`, `handbook-btn`, `briefing-btn`, `report-btn`
- Tutorial state and trigger logic lives in `hooks/useTutorial.ts`

## Adding a new panel type
1. Add the discriminated union variant to `PanelDefinition` in `scenario.types.ts`
2. Create the component in `src/components/panels/`
3. Add a `case` in `PanelRenderer` inside `SortablePanelCell.tsx`
4. Add an icon entry to `PANEL_ICONS` in `PanelBar.tsx`

## Adding a new scenario
1. Create `src/scenarios/<name>/index.ts` -- follow an existing scenario as template
2. Use scoring dimensions `speed`, `precision`, `defense_efficiency` (see above)
3. Import text asset files with the `?raw` Vite suffix: `import src from './file.py?raw'`
4. Register the scenario in the scenarios array in `App.tsx`

## Report design
- Do not name vulnerability classes in report labels. The player's job is to discover that there is an XSS or a format injection; stating it in the question removes the investigation.
- The code patching mechanic already answers "where is the flaw" and "how does it work". Report fields must not duplicate what patching reveals.
- Each field should point to an observable the player finds through active investigation: logs, terminal output, network map. If the answer cannot be found outside the source code, the question belongs in the patch, not the report.
- Hints indicate expected format only (`e.g., 1.2.3.4`, `e.g., db_name`), never the answer domain.
- Prefer 3-4 broad fields over 6+ targeted fields. Many narrow questions turn the report into a quiz the player fills in mechanically.
