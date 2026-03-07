// Minimal type stubs — full types defined by another agent

export type Screen =
  | "logo"
  | "onboarding"
  | "missionMap"
  | "briefing"
  | "mission"
  | "debrief";

export interface GameConfig {
  noAnimation: boolean;
}
