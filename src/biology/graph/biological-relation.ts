/**
 * Aresta do Biological Graph (ARCHITECTURE.md §8).
 *
 * Relações são sempre declaradas explicitamente: nenhuma relação inversa é
 * inferida (ex.: `has_part` não gera `part_of` no nó de destino).
 */
export const BIOLOGICAL_RELATION_TYPES = [
  /** A origem contém o destino em sentido espacial, estrutural ou biológico. */
  "contains",
  /** A origem possui o destino como uma de suas partes constituintes. */
  "has_part",
  /** A origem faz parte do destino (inverso conceitual de `has_part`). */
  "part_of",
  /** A origem é composta por unidades ou componentes da natureza do destino. */
  "composed_of",
  "connected_to",
  "associated_with",
  "transitions_to",
] as const;

export type BiologicalRelationType = (typeof BIOLOGICAL_RELATION_TYPES)[number];

export interface BiologicalRelation {
  readonly source: string;
  readonly target: string;
  readonly type: BiologicalRelationType;
}
