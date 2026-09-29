/** Metadados aproximados de escala de uma estrutura (ARCHITECTURE.md §16). */
export const SCALE_UNITS = ["m", "cm", "mm", "µm", "nm"] as const;

export type ScaleUnit = (typeof SCALE_UNITS)[number];

export interface Scale {
  readonly magnitude: number;
  readonly unit: ScaleUnit;
}
