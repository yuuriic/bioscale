import type { BiologicalGraph } from "@/biology/graph/biological-graph";
import type { BiologicalRelation } from "@/biology/graph/biological-relation";
import type { NavigationMode, NavigationState } from "./navigation-state";

export class UnknownBiologicalNodeError extends Error {
  readonly nodeId: string;

  constructor(nodeId: string) {
    super(`Biological node "${nodeId}" does not exist in the graph.`);
    this.name = "UnknownBiologicalNodeError";
    this.nodeId = nodeId;
  }
}

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
 * - toda mudança de `currentNode` limpa `selectedNode`, que pertence à
 *   estrutura anterior;
 * - `mode` é apenas estado nesta etapa.
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
    const breadcrumbCount = history.length + 1;
    if (!Number.isInteger(index) || index < 0 || index >= breadcrumbCount) {
      throw new InvalidBreadcrumbIndexError(index, breadcrumbCount);
    }
    const target = history[index];
    if (target === undefined) {
      return;
    }
    this.#moveTo(target, history.slice(0, index));
  }

  canGoBack(): boolean {
    return this.#state.history.length > 0;
  }

  select(nodeId: string): void {
    this.#assertNodeExists(nodeId);
    this.#state = freezeState({ ...this.#state, selectedNode: nodeId });
  }

  clearSelection(): void {
    const { currentNode, history, mode } = this.#state;
    this.#state = freezeState({ currentNode, history, mode });
  }

  setMode(mode: NavigationMode): void {
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

  /** Muda o nó atual; a seleção pertence à estrutura anterior e é limpa. */
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
