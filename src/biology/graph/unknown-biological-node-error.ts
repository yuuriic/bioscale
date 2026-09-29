/**
 * Um ID não corresponde a nenhum BiologicalNode do grafo consultado.
 *
 * `BiologicalGraph.getNode` devolve `undefined` para IDs desconhecidos;
 * consumidores que exigem um nó existente lançam este erro.
 */
export class UnknownBiologicalNodeError extends Error {
  readonly nodeId: string;

  constructor(nodeId: string) {
    super(`Biological node "${nodeId}" does not exist in the graph.`);
    this.name = "UnknownBiologicalNodeError";
    this.nodeId = nodeId;
  }
}
