/** Fonte bibliográfica que sustenta um conteúdo científico (ARCHITECTURE.md §22–23). */
export interface ScientificReference {
  readonly id: string;
  /** Citação completa em formato legível. */
  readonly citation: string;
  readonly url?: string;
  readonly doi?: string;
}
