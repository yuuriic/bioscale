import type { BiologicalGraph } from "@/biology/graph/biological-graph";
import type { BiologicalRelation } from "@/biology/graph/biological-relation";
import { UnknownBiologicalNodeError } from "@/biology/graph/unknown-biological-node-error";
import type { NavigationMode, NavigationState } from "./navigation-state";

export class InvalidBreadcrumbIndexError extends Error {
  readonly index: number;

  constructor(index: number, breadcrumbCount: number) {
    super(
      `Breadcrumb index ${index} is invalid: expected an integer from 0 to ${breadcrumbCount - 1}.`,
    );
    this.name = "InvalidBreadcrumbIndexError";
    this.index = index;
  }
}

/**
 * Nó na posição `index` de um percurso de breadcrumbs (`history` seguido de
 * `currentNode`). Uma posição inválida (não inteira, negativa ou além do
 * último breadcrumb) lança `InvalidBreadcrumbIndexError`. Função pura: permite
 * resolver o destino de um retorno antes de qualquer mutação.
 */
export function breadcrumbAt(breadcrumbs: readonly string[], index: number): string {
  const nodeId = Number.isInteger(index) && index >= 0 ? breadcrumbs[index] : undefined;
  if (nodeId === undefined) {
    throw new InvalidBreadcrumbIndexError(index, breadcrumbs.length);
  }
  return nodeId;
}

export interface NavigationControllerOptions {
  /** Ponto de entrada da experiência quando não há deep link. */
  readonly defaultNodeId: string;
  /**
   * Deep link: inicia diretamente neste nó, sem histórico. O percurso até
   * ele não é inventado a partir do grafo.
   */
  readonly initialNodeId?: string;
}

export interface CurrentNodeRelations {
  readonly outgoing: readonly BiologicalRelation[];
  readonly incoming: readonly BiologicalRelation[];
}

/**
 * Estado e regras de navegação da experiência (ARCHITECTURE.md §11.1).
 *
 * O percurso é o caminho que o usuário efetivamente seguiu na sessão, não
 * um caminho derivado do grafo: o BiologicalGraph não é uma árvore e
 * relações científicas não são rotas. Qualquer nó existente é um destino
 * válido; quais destinos a experiência oferece é decisão da cena.
 *
 * Regras:
 * - `navigate` acrescenta uma nova etapa ao percurso, mesmo que o nó já
 *   apareça nele: revisitar uma estrutura é navegação legítima;
 * - `returnToBreadcrumb` é o retorno explícito a uma posição anterior do
 *   percurso, identificada pelo índice (o mesmo nó pode ocorrer várias
 *   vezes), e descarta as etapas posteriores;
 * - IDs inexistentes lançam `UnknownBiologicalNodeError` e índices inválidos
 *   lançam `InvalidBreadcrumbIndexError`, sem alterar o estado;
 * - navegar para o nó atual, ou retornar à posição atual, não altera o
 *   estado;
 * - `back` sem histórico não altera o estado;
 * - `mode` é apenas estado nesta etapa; trocar para o modo atual não altera
 *   o estado.
 *
 * Seleção não pertence à navegação (SelectionController). Limpar a seleção
 * ao trocar de estrutura cabe ao ExperienceController.
 */
export class NavigationController {
  readonly #graph: BiologicalGraph;
  #state: NavigationState;

  constructor(graph: BiologicalGraph, options: NavigationControllerOptions) {
    this.#graph = graph;
    this.#assertNodeExists(options.defaultNodeId);
    const initialNodeId = options.initialNodeId ?? options.defaultNodeId;
    this.#assertNodeExists(initialNodeId);
    this.#state = freezeState({ currentNode: initialNodeId, history: [], mode: "guided" });
  }

  /** Snapshot imutável do estado atual. */
  getState(): NavigationState {
    return this.#state;
  }

  navigate(nodeId: string): void {
    this.#assertNodeExists(nodeId);
    const { currentNode, history } = this.#state;
    if (nodeId === currentNode) {
      return;
    }
    this.#moveTo(nodeId, [...history, currentNode]);
  }

  back(): void {
    const { history } = this.#state;
    const previous = history.at(-1);
    if (previous === undefined) {
      return;
    }
    this.#moveTo(previous, history.slice(0, -1));
  }

  /**
   * Retorna à posição `index` de `getBreadcrumbs()`, descartando as etapas
   * posteriores. A posição atual (último índice) não altera o estado.
   */
  returnToBreadcrumb(index: number): void {
    const { history } = this.#state;
    const target = breadcrumbAt(this.getBreadcrumbs(), index);
    if (index === history.length) {
      return;
    }
    this.#moveTo(target, history.slice(0, index));
  }

  canGoBack(): boolean {
    return this.#state.history.length > 0;
  }

  /** Trocar para o modo atual não altera o estado (mesma referência). */
  setMode(mode: NavigationMode): void {
    if (this.#state.mode === mode) {
      return;
    }
    this.#state = freezeState({ ...this.#state, mode });
  }

  /** Percurso da sessão até o nó atual, inclusive. */
  getBreadcrumbs(): readonly string[] {
    return Object.freeze([...this.#state.history, this.#state.currentNode]);
  }

  /**
   * Relações declaradas do nó atual, consultadas no grafo. São conhecimento
   * científico, não destinos de navegação.
   */
  getCurrentRelations(): CurrentNodeRelations {
    const { currentNode } = this.#state;
    return Object.freeze({
      outgoing: this.#graph.getOutgoingRelations(currentNode),
      incoming: this.#graph.getIncomingRelations(currentNode),
    });
  }

  #moveTo(currentNode: string, history: readonly string[]): void {
    this.#state = freezeState({ currentNode, history, mode: this.#state.mode });
  }

  #assertNodeExists(nodeId: string): void {
    if (this.#graph.getNode(nodeId) === undefined) {
      throw new UnknownBiologicalNodeError(nodeId);
    }
  }
}

function freezeState(state: NavigationState): NavigationState {
  return Object.freeze({ ...state, history: Object.freeze([...state.history]) });
}
