import type { VisualLayer } from "@/experience/scenes/scene-definition";
import type { LayerControllerState, LayerState } from "./layer-state";

export class UnknownVisualLayerError extends Error {
  readonly layerId: string;

  constructor(layerId: string) {
    super(`Visual layer "${layerId}" does not exist in this layer configuration.`);
    this.name = "UnknownVisualLayerError";
    this.layerId = layerId;
  }
}

export class DuplicateVisualLayerError extends Error {
  readonly layerId: string;

  constructor(layerId: string) {
    super(`Visual layer "${layerId}" is declared more than once.`);
    this.name = "DuplicateVisualLayerError";
    this.layerId = layerId;
  }
}

/**
 * Estado lógico das VisualLayers de uma cena (ARCHITECTURE.md §13),
 * independente de framework. O rendering futuro interpretará este estado.
 *
 * Regras:
 * - começa com todas as layers visíveis, nenhuma transparente e nenhuma
 *   isolada, na ordem recebida; uma configuração vazia é válida;
 * - IDs repetidos na configuração lançam `DuplicateVisualLayerError`;
 * - operações com ID desconhecido lançam `UnknownVisualLayerError` sem
 *   alterar o estado;
 * - visibilidade, transparência e isolamento são independentes; isolar não
 *   altera visibilidade nem transparência;
 * - operações sem efeito semântico preservam a referência do estado.
 *
 * Controla uma configuração por vez: a da construção ou a última recebida
 * por `applyLayers`. `reset` volta ao estado inicial da configuração atual.
 * Não valida SceneCapability: se a cena permite transparência ou isolamento
 * é política da coordenação da experiência.
 */
export class LayerController {
  #configuration: LayerConfiguration;
  #state: LayerControllerState;

  constructor(layers: readonly VisualLayer[]) {
    this.#configuration = createConfiguration(layers);
    this.#state = this.#configuration.initial;
  }

  /** Snapshot imutável; permanece estável após mudanças posteriores. */
  getState(): LayerControllerState {
    return this.#state;
  }

  /**
   * Substitui a configuração por uma nova, em estado inicial: todas as
   * layers visíveis, nenhuma transparente, sem isolamento. Nenhum estado da
   * configuração anterior é preservado, mesmo para IDs iguais. Sempre produz
   * um novo estado, inclusive quando observavelmente igual ao atual.
   * IDs repetidos lançam `DuplicateVisualLayerError` sem alterar nada.
   */
  applyLayers(layers: readonly VisualLayer[]): void {
    const configuration = createConfiguration(layers);
    this.#configuration = configuration;
    this.#state = configuration.initial;
  }

  setVisibility(layerId: string, visible: boolean): void {
    this.#updateLayer(layerId, "visible", visible);
  }

  setTransparent(layerId: string, transparent: boolean): void {
    this.#updateLayer(layerId, "transparent", transparent);
  }

  isolate(layerId: string): void {
    this.#indexOf(layerId);
    if (this.#state.isolatedLayerId === layerId) {
      return;
    }
    this.#state = Object.freeze({ layers: this.#state.layers, isolatedLayerId: layerId });
  }

  clearIsolation(): void {
    if (this.#state.isolatedLayerId === undefined) {
      return;
    }
    this.#state = Object.freeze({ layers: this.#state.layers });
  }

  /** Volta ao estado inicial da configuração: visíveis, opacas, sem isolamento. */
  reset(): void {
    const { layers, isolatedLayerId } = this.#state;
    const isInitial =
      isolatedLayerId === undefined && layers.every((layer) => layer.visible && !layer.transparent);
    if (!isInitial) {
      this.#state = this.#configuration.initial;
    }
  }

  #updateLayer(layerId: string, key: "visible" | "transparent", value: boolean): void {
    const index = this.#indexOf(layerId);
    const { layers, isolatedLayerId } = this.#state;
    const current = layers[index]!;
    if (current[key] === value) {
      return;
    }
    const updated: LayerState = Object.freeze({ ...current, [key]: value });
    const nextLayers = Object.freeze(layers.map((layer, i) => (i === index ? updated : layer)));
    this.#state = Object.freeze(
      isolatedLayerId === undefined
        ? { layers: nextLayers }
        : { layers: nextLayers, isolatedLayerId },
    );
  }

  #indexOf(layerId: string): number {
    const index = this.#configuration.indexById.get(layerId);
    if (index === undefined) {
      throw new UnknownVisualLayerError(layerId);
    }
    return index;
  }
}

interface LayerConfiguration {
  readonly indexById: ReadonlyMap<string, number>;
  readonly initial: LayerControllerState;
}

/** Valida e copia uma configuração, sem efeitos: falha antes de qualquer troca. */
function createConfiguration(layers: readonly VisualLayer[]): LayerConfiguration {
  const indexById = new Map<string, number>();
  layers.forEach(({ id }, index) => {
    if (indexById.has(id)) {
      throw new DuplicateVisualLayerError(id);
    }
    indexById.set(id, index);
  });
  const initial: LayerControllerState = Object.freeze({
    layers: Object.freeze(
      layers.map(({ id }) => Object.freeze({ layerId: id, visible: true, transparent: false })),
    ),
  });
  return { indexById, initial };
}
