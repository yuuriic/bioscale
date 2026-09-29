import type { BiologicalRelation } from "./biological-relation";
import type { EducationalContent } from "./educational-content";
import type { Scale } from "./scale";

/**
 * Tipos de estrutura agrupados pelo domínio científico a que pertencem
 * (ARCHITECTURE.md §4 e §7).
 */
export const NODE_TYPES_BY_DOMAIN = {
  anatomy: ["body", "system", "organ", "anatomical_structure"],
  histology: ["tissue", "tissue_structure"],
  cellular: ["cell", "cellular_structure", "organelle"],
  molecular: ["chromosome", "dna", "protein", "molecule"],
} as const;

export type BiologicalDomain = keyof typeof NODE_TYPES_BY_DOMAIN;

export type BiologicalNodeType<D extends BiologicalDomain = BiologicalDomain> =
  (typeof NODE_TYPES_BY_DOMAIN)[D][number];

/**
 * Nó do Biological Graph (ARCHITECTURE.md §7).
 *
 * O nó carrega identidade, classificação e relações. Texto científico
 * pertence exclusivamente a `educationalContent`, que exige referências. O
 * nó não referencia representação visual: a composição visual pertence à
 * SceneDefinition.
 */
export interface BiologicalNode {
  /** Identidade científica estável, em slug inglês; usada em URLs e no grafo. */
  readonly id: string;
  /** Rótulo de exibição em um único idioma (atualmente português). */
  readonly name: string;
  readonly scientificName?: string;
  readonly domain: BiologicalDomain;
  readonly type: BiologicalNodeType;
  readonly scale?: Scale;
  readonly educationalContent?: EducationalContent;
  /**
   * Relações declaradas. A lista não é exaustiva: a ausência de uma relação
   * no dataset não significa sua ausência na biologia.
   */
  readonly relations: readonly BiologicalRelation[];
}

export function isNodeTypeOfDomain(
  type: BiologicalNodeType,
  domain: BiologicalDomain,
): boolean {
  return (NODE_TYPES_BY_DOMAIN[domain] as readonly BiologicalNodeType[]).includes(type);
}
