import type { BiologicalNode } from "@/biology/graph/biological-node";
import {
  openStaxAnatomyNervousSystem,
  openStaxAnatomyNervousTissue,
} from "@/content/references/openstax";

export const nervousTissue: BiologicalNode = {
  id: "nervous-tissue",
  name: "Tecido nervoso",
  domain: "histology",
  type: "tissue",
  educationalContent: {
    summary: "O tecido nervoso é composto por dois tipos de células: neurônios e células da glia.",
    characteristics: ["Está presente tanto no sistema nervoso central quanto no periférico."],
    sources: [openStaxAnatomyNervousTissue, openStaxAnatomyNervousSystem],
    reviewStatus: "pending_review",
  },
  relations: [{ source: "nervous-tissue", target: "neuron", type: "composed_of" }],
};
