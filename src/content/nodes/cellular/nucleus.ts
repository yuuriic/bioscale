import type { BiologicalNode } from "@/biology/graph/biological-node";
import { medlinePlusCell } from "@/content/references/medlineplus";
import { openStaxBiologyEukaryoticCells } from "@/content/references/openstax";

export const nucleus: BiologicalNode = {
  id: "nucleus",
  name: "Núcleo",
  domain: "cellular",
  type: "organelle",
  educationalContent: {
    summary:
      "O núcleo abriga o material hereditário da célula e é delimitado pelo envelope nuclear, que separa o DNA do restante da célula.",
    characteristics: [
      "Em geral, é a organela mais proeminente da célula.",
      "O envelope nuclear é uma membrana dupla formada por duas bicamadas fosfolipídicas.",
    ],
    sources: [medlinePlusCell, openStaxBiologyEukaryoticCells],
    reviewStatus: "pending_review",
  },
  relations: [{ source: "nucleus", target: "chromosome", type: "contains" }],
};
