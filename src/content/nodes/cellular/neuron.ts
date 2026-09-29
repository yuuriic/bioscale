import type { BiologicalNode } from "@/biology/graph/biological-node";
import { openStaxAnatomyNervousTissue } from "@/content/references/openstax";

export const neuron: BiologicalNode = {
  id: "neuron",
  name: "Neurônio",
  domain: "cellular",
  type: "cell",
  educationalContent: {
    summary:
      "O neurônio possui um corpo celular, que contém o núcleo e a maior parte das organelas, dendritos e um axônio.",
    function: "Responsável por computação e comunicação por meio de sinais elétricos.",
    characteristics: [
      "Dendritos recebem informação de outros neurônios em regiões especializadas de contato chamadas sinapses.",
      "O axônio emerge do corpo celular e se projeta até as células-alvo, ramificando-se em terminais axonais.",
    ],
    sources: [openStaxAnatomyNervousTissue],
    reviewStatus: "pending_review",
  },
  relations: [{ source: "neuron", target: "nucleus", type: "contains" }],
};
