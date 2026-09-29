import type { BiologicalNode } from "@/biology/graph/biological-node";
import { medlinePlusChromosome } from "@/content/references/medlineplus";
import { openStaxBiologyEukaryoticCells } from "@/content/references/openstax";

export const chromosome: BiologicalNode = {
  id: "chromosome",
  name: "Cromossomo",
  domain: "molecular",
  type: "chromosome",
  educationalContent: {
    summary:
      "No núcleo, o DNA é empacotado em estruturas filamentosas chamadas cromossomos. Cada cromossomo é formado por DNA enrolado muitas vezes ao redor de proteínas chamadas histonas.",
    characteristics: [
      "Cromatina é o material que compõe os cromossomos, tanto condensados quanto descondensados.",
    ],
    sources: [medlinePlusChromosome, openStaxBiologyEukaryoticCells],
    reviewStatus: "pending_review",
  },
  relations: [{ source: "chromosome", target: "dna", type: "composed_of" }],
};
