import type { CameraPreset } from "./scene-definition";

export type CameraPresetIssue =
  | "non_finite_position"
  | "non_finite_target"
  | "position_equals_target"
  | "invalid_field_of_view";

/**
 * Invariantes de uma câmera abstrata, compartilhadas pela validação de
 * SceneDefinition e pelo CameraController: coordenadas finitas, posição
 * diferente do alvo e campo de visão no intervalo (0, 180).
 */
export function validateCameraPreset({
  position,
  target,
  fieldOfView,
}: CameraPreset): CameraPresetIssue[] {
  const issues: CameraPresetIssue[] = [];
  const finitePosition = position.every(Number.isFinite);
  const finiteTarget = target.every(Number.isFinite);

  if (!finitePosition) {
    issues.push("non_finite_position");
  }
  if (!finiteTarget) {
    issues.push("non_finite_target");
  }
  if (finitePosition && finiteTarget && position.every((value, axis) => value === target[axis])) {
    issues.push("position_equals_target");
  }
  if (fieldOfView !== undefined && !(fieldOfView > 0 && fieldOfView < 180)) {
    issues.push("invalid_field_of_view");
  }
  return issues;
}
