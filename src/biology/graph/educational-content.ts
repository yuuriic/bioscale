import type { ScientificReference } from "./scientific-reference";

/** Conteúdo educacional associado a um nó biológico (ARCHITECTURE.md §22). */
export interface EducationalContent {
  readonly summary: string;
  readonly function?: string;
  readonly characteristics?: readonly string[];
  readonly curiosities?: readonly string[];
  readonly relatedConcepts?: readonly string[];
  /** Todo conteúdo científico deve possuir referências. */
  readonly sources: readonly ScientificReference[];
}
