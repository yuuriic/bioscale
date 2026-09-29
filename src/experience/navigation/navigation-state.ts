export type NavigationMode = "guided" | "explore";

/**
 * Estado de navegação da experiência (ARCHITECTURE.md §11.1).
 *
 * Contém apenas IDs do BiologicalGraph: o conhecimento científico é
 * resolvido no grafo, não duplicado aqui. Os snapshots expostos são
 * congelados; uma mudança de estado produz um novo snapshot.
 */
export interface NavigationState {
  readonly currentNode: string;
  /**
   * Nós percorridos antes de `currentNode`, do mais antigo ao mais recente.
   * Não inclui `currentNode`; `history` seguido de `currentNode` é o
   * percurso da sessão (breadcrumbs).
   */
  readonly history: readonly string[];
  /** Seleção dentro da estrutura atual; limpa sempre que `currentNode` muda. */
  readonly selectedNode?: string;
  readonly mode: NavigationMode;
}
