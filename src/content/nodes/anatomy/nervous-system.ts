import type { BiologicalNode } from "@/biology/graph/biological-node";
import { openStaxAnatomyNervousSystem } from "@/content/references/openstax";

export const nervousSystem: BiologicalNode = {
  id: "nervous-system",
  name: "Sistema nervoso",
  domain: "anatomy",
  type: "system",
  educationalContent: {
    summary:
      "O sistema nervoso central é formado pelo encéfalo e pela medula espinal; o sistema nervoso periférico compreende todo o restante do sistema.",
    function: "Suas funções básicas são sensação, integração e resposta.",
    sources: [openStaxAnatomyNervousSystem],
    reviewStatus: "pending_review",
  },
  relations: [{ source: "nervous-system", target: "brain", type: "has_part" }],
};
