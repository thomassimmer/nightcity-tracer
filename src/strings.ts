// Central UI strings: swap this object (or import a different locale) for i18n.
// All user-facing text in panels/modals should come from here.

export const strings = {
  copilot: {
    title: 'DevSec-AI Copilot: Code Patch',
    fileLabel: (path: string) => `File: ${path}`,
    instruction: 'Select the diff that correctly fixes the vulnerability.',
    correct: 'CORRECT',
    incorrectRetry: 'INCORRECT. Try again',
    alertPatchDeployed: (label: string) => `Patch deployed: ${label}`,
    alertIncorrect: (label: string) => `Incorrect patch – ${label}`,
  },

  codeEditor: {
    filesSection: 'FILES',
    patched: 'PATCHED',
    analyseWithCopilot: 'Analyse with Copilot',
    fileNotFound: (path: string) => `// ${path}: not found in virtual filesystem`,
    noFilesAvailable: 'No files available',
    hasCopilotRule: 'Has Copilot patch rule',
    searchPlaceholder: 'Search in files…',
    searchPrompt: 'Type to search across all files',
    searchNoResults: (q: string) => `No results for "${q}"`,
  },

  diffViewer: {
    filesNotFound: 'FILES NOT FOUND IN VIRTUAL FILESYSTEM',
    original: (path: string) => `a/${path}`,
    modified: (path: string) => `b/${path}`,
  },
} as const;
