import type { BiologicalGraph } from "@/biology/graph/biological-graph";
import { UnknownBiologicalNodeError } from "@/biology/graph/unknown-biological-node-error";
import type { SelectionState } from "./selection-state";

const NO_SELECTION: SelectionState = Object.freeze({});

/**
 * Qual BiologicalNode está selecionado na experiência (ARCHITECTURE.md §11.3).
 *
 * Recebe IDs já resolvidos: traduzir mesh/objeto → BiologicalNode ID
 * pertence à integração futura com assets e renderização. Valida apenas
 * que o nó existe no grafo; se ele é selecionável na cena atual é decisão
 * futura da cena.
 *
 * Seleção não é navegação: este controller não conhece o
 * NavigationController, e limpar a seleção ao trocar de estrutura cabe
 * ao ExperienceController.
 *
 * Regras:
 * - começa sem seleção;
 * - selecionar um ID inexistente lança `UnknownBiologicalNodeError` e não
 *   altera o estado;
 * - selecionar o nó já selecionado e limpar sem seleção não alteram o estado.
 */
export class SelectionController {
  readonly #graph: BiologicalGraph;
  #state: SelectionState = NO_SELECTION;

  constructor(graph: BiologicalGraph) {
    this.#graph = graph;
  }

  /** Snapshot imutável; permanece estável após mudanças posteriores. */
  getState(): SelectionState {
    return this.#state;
  }

  select(nodeId: string): void {
    if (this.#graph.getNode(nodeId) === undefined) {
      throw new UnknownBiologicalNodeError(nodeId);
    }
    if (this.#state.selectedNodeId !== nodeId) {
      this.#state = Object.freeze({ selectedNodeId: nodeId });
    }
  }

  clearSelection(): void {
    this.#state = NO_SELECTION;
  }
}
