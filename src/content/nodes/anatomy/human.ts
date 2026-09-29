import type { BiologicalNode } from "@/biology/graph/biological-node";
import { openStaxAnatomyStructuralOrganization } from "@/content/references/openstax";

export const human: BiologicalNode = {
  id: "human",
  name: "Corpo humano",
  domain: "anatomy",
  type: "body",
  educationalContent: {
    summary:
      "O corpo humano se organiza em níveis estruturais: moléculas, organelas, células, tecidos, órgãos e sistemas de órgãos, que em conjunto formam o organismo.",
    sources: [openStaxAnatomyStructuralOrganization],
    reviewStatus: "pending_review",
  },
  relations: [{ source: "human", target: "nervous-system", type: "has_part" }],
};
