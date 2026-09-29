import { describe, expect, it } from "vitest";
import { createBiologicalGraph } from "@/biology/graph/biological-graph";
import {
  NODE_TYPES_BY_DOMAIN,
  isNodeTypeOfDomain,
  type BiologicalNode,
} from "@/biology/graph/biological-node";
import type { BiologicalRelationType } from "@/biology/graph/biological-relation";
import {
  isIsoCalendarDate,
  type ScientificReference,
} from "@/biology/graph/scientific-reference";
import { validateBiologicalNodes } from "@/biology/graph/validate-biological-nodes";
import { mvpBiologicalNodes } from "./mvp-nodes";

// Jornada educacional do MVP (ARCHITECTURE.md §29).
const MVP_JOURNEY = [
  "human",
  "nervous-system",
  "brain",
  "nervous-tissue",
  "neuron",
  "nucleus",
  "chromosome",
  "dna",
] as const;

// Relações que descem um nível de organização biológica.
const STRUCTURAL_RELATIONS: readonly BiologicalRelationType[] = [
  "contains",
  "has_part",
  "composed_of",
];

const ids = mvpBiologicalNodes.map((node) => node.id);
const graph = createBiologicalGraph(mvpBiologicalNodes);

describe("MVP biological dataset", () => {
  it("contains exactly the eight structures of the MVP journey", () => {
    expect([...ids].sort()).toEqual([...MVP_JOURNEY].sort());
  });

  it("has unique ids", () => {
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("is accepted by the BiologicalGraph without validation issues", () => {
    expect(validateBiologicalNodes(mvpBiologicalNodes)).toEqual([]);
    expect(graph.nodes).toHaveLength(MVP_JOURNEY.length);
  });

  it("only declares relations to nodes that exist in the graph", () => {
    for (const node of graph.nodes) {
      for (const relation of graph.getOutgoingRelations(node.id)) {
        expect(graph.getNode(relation.target), `${node.id} → ${relation.target}`).toBeDefined();
      }
    }
  });

  it("classifies every node with a known domain and a type of that domain", () => {
    for (const node of mvpBiologicalNodes) {
      expect(Object.keys(NODE_TYPES_BY_DOMAIN)).toContain(node.domain);
      expect(isNodeTypeOfDomain(node.type, node.domain), node.id).toBe(true);
    }
  });

  it("covers the four scientific domains in journey order", () => {
    const domains = MVP_JOURNEY.map((id) => graph.getNode(id)?.domain);
    expect([...new Set(domains)]).toEqual(["anatomy", "histology", "cellular", "molecular"]);
  });
});

describe("MVP journey", () => {
  it("can be walked through declared structural relations, one step at a time", () => {
    for (let i = 0; i < MVP_JOURNEY.length - 1; i++) {
      const from = MVP_JOURNEY[i]!;
      const to = MVP_JOURNEY[i + 1]!;
      const step = graph
        .getOutgoingRelations(from)
        .find((r) => r.target === to && STRUCTURAL_RELATIONS.includes(r.type));
      expect(step, `${from} → ${to}`).toBeDefined();
    }
  });

  it("can be walked backwards through incoming relations without inferred inverses", () => {
    for (let i = MVP_JOURNEY.length - 1; i > 0; i--) {
      const sources = graph.getIncomingRelations(MVP_JOURNEY[i]!).map((r) => r.source);
      expect(sources).toContain(MVP_JOURNEY[i - 1]);
    }
    const declared = graph.nodes.flatMap((n) => graph.getOutgoingRelations(n.id));
    expect(declared.some((r) => r.type === "part_of")).toBe(false);
  });

  it("does not encode interface navigation as biological transitions", () => {
    const declared = graph.nodes.flatMap((n) => graph.getOutgoingRelations(n.id));
    expect(declared.some((r) => r.type === "transitions_to")).toBe(false);
  });
});

describe("shared structures", () => {
  // Estrutura neutra de teste: apenas prova que outro caminho pode reutilizar
  // os nós compartilhados. Não representa um tipo celular real.
  const otherPath: BiologicalNode = {
    id: "other-structure",
    name: "fixture",
    domain: "cellular",
    type: "cell",
    relations: [
      { source: "other-structure", target: "nucleus", type: "contains" },
      { source: "other-structure", target: "chromosome", type: "contains" },
      { source: "other-structure", target: "dna", type: "contains" },
    ],
  };
  const extended = createBiologicalGraph([...mvpBiologicalNodes, otherPath]);

  it.each([
    ["nucleus", "organelle"],
    ["chromosome", "chromosome"],
    ["dna", "dna"],
  ] as const)("%s exists as a single node of its type", (id, type) => {
    expect(mvpBiologicalNodes.filter((n) => n.type === type).map((n) => n.id)).toEqual([id]);
  });

  it.each(["nucleus", "chromosome", "dna"])(
    "%s can be reached from another path without being duplicated",
    (id) => {
      const sources = extended.getIncomingRelations(id).map((r) => r.source);
      expect(sources).toContain("other-structure");
      expect(extended.nodes.filter((n) => n.id === id)).toHaveLength(1);
    },
  );

  it("keeps shared nodes free of references to the path that reaches them", () => {
    const upstream = new Set(["human", "nervous-system", "brain", "nervous-tissue", "neuron"]);
    for (const id of ["nucleus", "chromosome", "dna"]) {
      const targets = graph.getOutgoingRelations(id).map((r) => r.target);
      expect(targets.filter((t) => upstream.has(t)), id).toEqual([]);
    }
  });
});

describe("node ids", () => {
  it("are URL-safe, readable slugs", () => {
    for (const id of ids) {
      expect(id).toMatch(/^[a-z]+(?:-[a-z]+)*$/);
    }
  });

  it("are not composed from other node ids (e.g. neuron-nucleus)", () => {
    for (const id of ids) {
      const segments = id.split("-");
      const embedded = ids.filter((other) => other !== id && segments.includes(other));
      expect(embedded, id).toEqual([]);
    }
  });
});

describe("educational content", () => {
  const withContent = mvpBiologicalNodes.filter((n) => n.educationalContent);
  const references = withContent.flatMap((n) => n.educationalContent?.sources ?? []);

  it("cites at least one scientific reference wherever content exists", () => {
    for (const node of withContent) {
      expect(node.educationalContent?.sources.length, node.id).toBeGreaterThan(0);
    }
  });

  it("uses references that are traceable through an https url or a doi", () => {
    for (const reference of references) {
      expect(reference.id).not.toBe("");
      expect(reference.citation.trim()).not.toBe("");
      const traceable =
        reference.url?.startsWith("https://") === true || (reference.doi ?? "") !== "";
      expect(traceable, reference.id).toBe(true);
    }
  });

  it("uses each reference id for a single, consistent reference", () => {
    const byId = new Map<string, ScientificReference>();
    for (const reference of references) {
      const known = byId.get(reference.id);
      if (known) {
        expect(reference).toEqual(known);
      }
      byId.set(reference.id, reference);
    }
  });
});

describe("brain identity", () => {
  // O nó representa o encéfalo inteiro, não o cerebrum ("cérebro").
  const brain = graph.getNode("brain");

  it("is the whole encephalon: an organ that is part of the nervous system", () => {
    expect(brain?.type).toBe("organ");
    expect(graph.getIncomingRelations("brain")).toContainEqual({
      source: "nervous-system",
      target: "brain",
      type: "has_part",
    });
  });

  it("is not labelled as the cerebrum", () => {
    expect(brain?.name).toBe("Encéfalo");
    expect(ids).not.toContain("cerebrum");
  });
});

describe("scale", () => {
  it("states that DNA measures 2 nm in diameter", () => {
    expect(graph.getNode("dna")?.scale).toEqual({ dimension: "diameter", value: 2, unit: "nm" });
  });
});

describe("scientific review", () => {
  it("gives every educational content a review status", () => {
    for (const node of mvpBiologicalNodes) {
      expect(node.educationalContent?.reviewStatus, node.id).toBeDefined();
    }
  });

  it("does not mark content as approved before specialist review", () => {
    for (const node of mvpBiologicalNodes) {
      expect(node.educationalContent?.reviewStatus, node.id).not.toBe("approved");
    }
  });
});

describe("provenance", () => {
  // Campos do nó que não são texto científico: identidade, classificação,
  // metadados e relações. Qualquer outro campo textual quebraria a regra de
  // que texto científico vive em EducationalContent, com fontes.
  const NON_SCIENTIFIC_TEXT_FIELDS = new Set([
    "id",
    "name",
    "scientificName",
    "domain",
    "type",
    "scale",
    "model",
    "relations",
    "educationalContent",
  ]);

  it("keeps all scientific text inside referenced educational content", () => {
    for (const node of mvpBiologicalNodes) {
      const extraFields = Object.keys(node).filter((key) => !NON_SCIENTIFIC_TEXT_FIELDS.has(key));
      expect(extraFields, node.id).toEqual([]);
      expect(node.educationalContent?.sources.length ?? 0, node.id).toBeGreaterThan(0);
    }
  });

  it("records a valid ISO 8601 access date for every web reference", () => {
    const references = mvpBiologicalNodes.flatMap((n) => n.educationalContent?.sources ?? []);
    for (const reference of references.filter((r) => r.url)) {
      expect(isIsoCalendarDate(reference.accessedOn ?? ""), reference.id).toBe(true);
    }
  });
});
