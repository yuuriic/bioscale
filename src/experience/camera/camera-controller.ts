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
 *   espacial abstrato atual;
 * - a identidade do estado é semântica: uma operação que resulta nos mesmos
 *   valores (componentes de `position` e `target`, e `fieldOfView`) preserva
 *   a referência; qualquer mudança observável produz um novo estado. A
 *   entrada é sempre validada antes da comparação.
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

  /**
   * Aplica o enquadramento de um preset e o torna a base de `reset`.
   *
   * A base e o estado atual são decididos separadamente: a base passa a ser o
   * preset sempre que difere dela, mesmo que a câmera atual já tenha esses
   * valores (o `reset` futuro muda); o estado só ganha nova referência se
   * seus valores mudarem. A base não faz parte do estado observável.
   */
  applyPreset(preset: CameraPreset): void {
    const next = resolvePreset(preset);
    if (!isSameCamera(next, this.#base)) {
      this.#base = next;
    }
    this.#commit(this.#base);
  }

  setPosition(position: Vec3): void {
    this.#commit(resolveState({ ...this.#state, position }));
  }

  setTarget(target: Vec3): void {
    this.#commit(resolveState({ ...this.#state, target }));
  }

  setFieldOfView(fieldOfView: number): void {
    this.#commit(resolveState({ ...this.#state, fieldOfView }));
  }

  reset(): void {
    this.#commit(this.#base);
  }

  /** Adota `next` somente se ele difere do estado atual em algum valor. */
  #commit(next: CameraState): void {
    if (!isSameCamera(next, this.#state)) {
      this.#state = next;
    }
  }
}

function isSameCamera(a: CameraState, b: CameraState): boolean {
  return (
    isSameVec3(a.position, b.position) &&
    isSameVec3(a.target, b.target) &&
    a.fieldOfView === b.fieldOfView
  );
}

function isSameVec3(a: Vec3, b: Vec3): boolean {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
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
