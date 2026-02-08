export type FormationPresetId = "F442" | "F433" | "F4231" | "F352";

export interface FormationPreset {
  id: FormationPresetId;
  label: string;
  lines: {
    DEF: number;
    MID: number;
    FWD: number;
  };
  lineXHome: {
    DEF: number;
    MID: number;
    FWD: number;
  };
}

export const FORMATION_PRESETS: Record<FormationPresetId, FormationPreset> = {
  F442: {
    id: "F442",
    label: "4-4-2",
    lines: { DEF: 4, MID: 4, FWD: 2 },
    lineXHome: { DEF: 250, MID: 470, FWD: 670 },
  },
  F433: {
    id: "F433",
    label: "4-3-3",
    lines: { DEF: 4, MID: 3, FWD: 3 },
    lineXHome: { DEF: 255, MID: 450, FWD: 700 },
  },
  F4231: {
    id: "F4231",
    label: "4-2-3-1",
    lines: { DEF: 4, MID: 5, FWD: 1 },
    lineXHome: { DEF: 250, MID: 455, FWD: 705 },
  },
  F352: {
    id: "F352",
    label: "3-5-2",
    lines: { DEF: 3, MID: 5, FWD: 2 },
    lineXHome: { DEF: 235, MID: 470, FWD: 690 },
  },
};

export const DEFAULT_FORMATION: FormationPresetId = "F442";
