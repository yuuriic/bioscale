import type { ScientificReference } from "./scientific-reference";

/**
 * Estado do conteúdo no fluxo de validação científica (ARCHITECTURE.md §23).
 *
 * - `draft`: em elaboração;
 * - `pending_review`: fundamentado em fontes, aguardando revisão biológica;
 * - `approved`: revisado e aprovado para produção.
 */
export const REVIEW_STATUSES = ["draft", "pending_review", "approved"] as const;

export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

/**
 * Conteúdo educacional associado a um nó biológico (ARCHITECTURE.md §22).
 *
 * É a única fonte de texto científico do nó: todo texto aqui é sustentado
 * por `sources`. O idioma é único (atualmente português); internacionalização
 * deverá ser tratada antes de oferecer múltiplos idiomas.
 */
export interface EducationalContent {
  readonly summary: string;
  readonly function?: string;
  readonly characteristics?: readonly string[];
  readonly curiosities?: readonly string[];
  readonly relatedConcepts?: readonly string[];
  /** Todo conteúdo científico deve possuir referências. */
  readonly sources: readonly ScientificReference[];
  readonly reviewStatus: ReviewStatus;
}
