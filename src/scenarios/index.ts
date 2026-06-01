import type { Scenario } from "@/scenario.types";
import { tutorialJwtBypass } from "@/scenarios/tutorial-jwt-bypass";
import { nightopsPlatform } from "@/scenarios/nightops-platform";
import { traumaTeamPromptInjection } from "@/scenarios/trauma-team-prompt-injection";
import { watsonAdHijack } from "@/scenarios/watson-ad-hijack";

export const SCENARIOS: Scenario[] = [
  tutorialJwtBypass,
  nightopsPlatform,
  traumaTeamPromptInjection,
  watsonAdHijack,
];
