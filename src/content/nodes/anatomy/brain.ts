import type { BiologicalNode } from "@/biology/graph/biological-node";
import {
  openStaxAnatomyCentralNervousSystem,
  openStaxAnatomyNervousSystem,
} from "@/content/references/openstax";

// Identidade: o encéfalo inteiro (cérebro, diencéfalo, tronco encefálico e
// cerebelo). Em inglês científico, "brain" designa exatamente essa estrutura;
// "cerebrum" — o "cérebro" em português — é apenas uma de suas regiões e, se
// modelado no futuro, será um nó próprio (`cerebrum`) ligado a este.
export const brain: BiologicalNode = {
  id: "brain",
  name: "Encéfalo",
  domain: "anatomy",
  type: "organ",
  educationalContent: {
    summary:
      "O encéfalo e a medula espinal formam o sistema nervoso central. No adulto, o encéfalo é descrito em quatro grandes regiões: cérebro, diencéfalo, tronco encefálico e cerebelo.",
    characteristics: [
      "Substância cinzenta: regiões com muitos corpos celulares e dendritos.",
      "Substância branca: regiões com muitos axônios, isolados por mielina.",
    ],
    sources: [openStaxAnatomyCentralNervousSystem, openStaxAnatomyNervousSystem],
    reviewStatus: "pending_review",
  },
  relations: [{ source: "brain", target: "nervous-tissue", type: "composed_of" }],
};
