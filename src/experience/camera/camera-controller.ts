import type { CameraPreset, Vec3 } from "@/experience/scenes/scene-definition";
import {
  validateCameraPreset,
  type CameraPresetIssue,
} from "@/experience/scenes/validate-camera-preset";
import type { CameraState } from "./camera-state";

/**
 * Campo de visão vertical, em graus, usado quando um preset não declara
 * `fieldOfView`. Convenção visual do BioScale, não dado científico.
 */
export const DEFAULT_FIELD_OF_VIEW = 50;

export class InvalidCameraStateError extends Error {
  readonly issues: readonly CameraPresetIssue[];

  constructor(issues: readonly CameraPresetIssue[]) {
    super(`Camera state is invalid: ${issues.join(", ")}.`);
    this.name = "InvalidCameraStateError";
    this.issues = issues;
  }
}

/**
 * Estado lógico da câmera da experiência (ARCHITECTURE.md §11.2),
 * independente de framework.
 *
 * Regras:
 * - toda mudança é imediata; interpolação pertence à integração futura
 *   (TransitionController / Rendering Layer), que pode interpolar entre um
 *   snapshot anterior e o atual;
 * - uma mudança que viole as invariantes de câmera lança
 *   `InvalidCameraStateError` e não altera o estado;
 * - `reset` volta ao preset aplicado mais recentemente (o da construção,
 *   se nenhum outro foi aplicado): o enquadramento base da cena atual;
 * - foco em objetos e zoom semântico ainda não existem: `target` é o foco
 *   espacial abstrato atual.
 */
export class CameraController {
  #base: CameraState;
  #state: CameraState;

  constructor(preset: CameraPreset) {
    this.#base = resolvePreset(preset);
    this.#state = this.#base;
  }

  /** Snapshot imutável; permanece estável após mudanças posteriores. */
  getState(): CameraState {
    return this.#state;
  }

  /** Aplica o enquadramento de um preset e o torna a base de `reset`. */
  applyPreset(preset: CameraPreset): void {
    this.#base = resolvePreset(preset);
    this.#state = this.#base;
  }

  setPosition(position: Vec3): void {
    this.#state = resolveState({ ...this.#state, position });
  }

  setTarget(target: Vec3): void {
    this.#state = resolveState({ ...this.#state, target });
  }

  setFieldOfView(fieldOfView: number): void {
    this.#state = resolveState({ ...this.#state, fieldOfView });
  }

  reset(): void {
    this.#state = this.#base;
  }
}

function resolvePreset(preset: CameraPreset): CameraState {
  return resolveState({
    position: preset.position,
    target: preset.target,
    fieldOfView: preset.fieldOfView ?? DEFAULT_FIELD_OF_VIEW,
  });
}

/** Copia, valida e congela; a cópia isola o estado de arrays do chamador. */
function resolveState({ position, target, fieldOfView }: CameraState): CameraState {
  const state: CameraState = Object.freeze({
    position: freezeVec3(position),
    target: freezeVec3(target),
    fieldOfView,
  });
  const issues = validateCameraPreset(state);
  if (issues.length > 0) {
    throw new InvalidCameraStateError(issues);
  }
  return state;
}

function freezeVec3([x, y, z]: Vec3): Vec3 {
  return Object.freeze([x, y, z] as const);
}
