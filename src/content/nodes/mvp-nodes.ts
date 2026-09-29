import type { BiologicalNode } from "@/biology/graph/biological-node";
import { brain } from "./anatomy/brain";
import { human } from "./anatomy/human";
import { nervousSystem } from "./anatomy/nervous-system";
import { neuron } from "./cellular/neuron";
import { nucleus } from "./cellular/nucleus";
import { nervousTissue } from "./histology/nervous-tissue";
import { chromosome } from "./molecular/chromosome";
import { dna } from "./molecular/dna";

/**
 * Nós biológicos do MVP (ARCHITECTURE.md §29), prontos para
 * `createBiologicalGraph`. A ordem da jornada educacional pertence à
 * experiência; aqui há apenas o conjunto de nós e suas relações declaradas.
 */
export const mvpBiologicalNodes: readonly BiologicalNode[] = [
  human,
  nervousSystem,
  brain,
  nervousTissue,
  neuron,
  nucleus,
  chromosome,
  dna,
];
