/**
 * Estado lógico de seleção da experiência (ARCHITECTURE.md §11.3).
 *
 * Contém apenas a identidade do BiologicalNode selecionado; ausente quando
 * não há seleção. Os snapshots expostos são congelados.
 */
export interface SelectionState {
  readonly selectedNodeId?: string;
}
