import type { BiologicalNode } from "./biological-node";
import type { BiologicalRelation } from "./biological-relation";
import {
  validateBiologicalNodes,
  type BiologicalGraphIssue,
} from "./validate-biological-nodes";

/**
 * Grafo imutável de estruturas biológicas (ARCHITECTURE.md §6).
 *
 * As relações são armazenadas no nó de origem; o índice de relações de
 * entrada permite descobrir estruturas compartilhadas (um mesmo nó
 * alcançável a partir de vários pais). Nenhuma relação inversa é inferida:
 * `getIncomingRelations` devolve as relações declaradas, com `source`
 * original, e não relações sintéticas como `part_of`.
 */
export interface BiologicalGraph {
  readonly nodes: readonly BiologicalNode[];
  getNode(id: string): BiologicalNode | undefined;
  getOutgoingRelations(id: string): readonly BiologicalRelation[];
  getIncomingRelations(id: string): readonly BiologicalRelation[];
}

export class BiologicalGraphValidationError extends Error {
  readonly issues: readonly BiologicalGraphIssue[];

  constructor(issues: readonly BiologicalGraphIssue[]) {
    super(`Biological graph is invalid: ${issues.length} issue(s) found.`);
    this.name = "BiologicalGraphValidationError";
    this.issues = issues;
  }
}

const NO_RELATIONS: readonly BiologicalRelation[] = [];

export function createBiologicalGraph(
  input: readonly BiologicalNode[],
): BiologicalGraph {
  // Cópia própria: mutações posteriores no array do chamador não podem
  // dessincronizar o conjunto validado dos índices abaixo.
  const nodes = Object.freeze([...input]);
  const issues = validateBiologicalNodes(nodes);
  if (issues.length > 0) {
    throw new BiologicalGraphValidationError(issues);
  }

  const nodesById = new Map<string, BiologicalNode>();
  const incoming = new Map<string, BiologicalRelation[]>();

  for (const node of nodes) {
    nodesById.set(node.id, node);
    for (const relation of node.relations) {
      const list = incoming.get(relation.target);
      if (list) {
        list.push(relation);
      } else {
        incoming.set(relation.target, [relation]);
      }
    }
  }

  return {
    nodes,
    getNode: (id) => nodesById.get(id),
    getOutgoingRelations: (id) => nodesById.get(id)?.relations ?? NO_RELATIONS,
    getIncomingRelations: (id) => incoming.get(id) ?? NO_RELATIONS,
  };
}
