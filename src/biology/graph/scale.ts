/** Metadados aproximados de escala de uma estrutura (ARCHITECTURE.md §16). */
export const SCALE_UNITS = ["m", "cm", "mm", "µm", "nm"] as const;

export type ScaleUnit = (typeof SCALE_UNITS)[number];

/** Grandeza medida. Novas dimensões são adicionadas a esta lista. */
export const SCALE_DIMENSIONS = ["diameter", "length", "width", "thickness", "height"] as const;

export type ScaleDimension = (typeof SCALE_DIMENSIONS)[number];

interface ScaleMeasure {
  readonly dimension: ScaleDimension;
  readonly unit: ScaleUnit;
}

/** Valor único, ex.: 2 nm de diâmetro. */
export interface ScaleValue extends ScaleMeasure {
  readonly value: number;
  readonly min?: never;
  readonly max?: never;
}

/** Intervalo, para estruturas cuja dimensão varia. Exige `min < max`. */
export interface ScaleRange extends ScaleMeasure {
  readonly min: number;
  readonly max: number;
  readonly value?: never;
}

export type Scale = ScaleValue | ScaleRange;

export function isScaleRange(scale: Scale): scale is ScaleRange {
  return scale.value === undefined;
}

function isPositive(n: number): boolean {
  return Number.isFinite(n) && n > 0;
}

export function isValidScale(scale: Scale): boolean {
  if (!isScaleRange(scale)) {
    return isPositive(scale.value);
  }
  return isPositive(scale.min) && isPositive(scale.max) && scale.min < scale.max;
}
