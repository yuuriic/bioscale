import { describe, expect, it } from "vitest";
import type { BiologicalNode } from "./biological-node";
import type { EducationalContent } from "./educational-content";
import { isScaleRange, type Scale } from "./scale";
import {
  BiologicalGraphValidationError,
  createBiologicalGraph,
} from "./biological-graph";
import { validateBiologicalNodes } from "./validate-biological-nodes";

// Fixtures estruturais neutras: não representam dados científicos.
function node(overrides: Partial<BiologicalNode> & Pick<BiologicalNode, "id">): BiologicalNode {
  return {
    name: overrides.id,
    domain: "cellular",
    type: "cell",
    relations: [],
    ...overrides,
  };
}

describe("validateBiologicalNodes", () => {
  it("accepts a consistent node set", () => {
    const nodes = [
      node({ id: "a", relations: [{ source: "a", target: "b", type: "contains" }] }),
      node({ id: "b", type: "organelle" }),
    ];
    expect(validateBiologicalNodes(nodes)).toEqual([]);
  });

  it("reports duplicate ids", () => {
    expect(validateBiologicalNodes([node({ id: "a" }), node({ id: "a" })])).toContainEqual({
      code: "duplicate_node_id",
      nodeId: "a",
    });
  });

  it("reports a type that does not belong to the node domain", () => {
    expect(validateBiologicalNodes([node({ id: "a", domain: "anatomy", type: "dna" })])).toEqual([
      { code: "domain_type_mismatch", nodeId: "a" },
    ]);
  });

  it("reports relations whose source is not the owning node", () => {
    const nodes = [
      node({ id: "a", relations: [{ source: "b", target: "b", type: "contains" }] }),
      node({ id: "b" }),
    ];
    expect(validateBiologicalNodes(nodes)).toEqual([
      { code: "relation_source_mismatch", nodeId: "a", source: "b" },
    ]);
  });

  it("reports relations pointing to unknown nodes", () => {
    const nodes = [node({ id: "a", relations: [{ source: "a", target: "x", type: "part_of" }] })];
    expect(validateBiologicalNodes(nodes)).toEqual([
      { code: "unknown_relation_target", nodeId: "a", target: "x" },
    ]);
  });

  it("accepts has_part as a relation type", () => {
    const nodes = [
      node({ id: "whole", relations: [{ source: "whole", target: "part", type: "has_part" }] }),
      node({ id: "part", type: "cellular_structure" }),
    ];
    expect(validateBiologicalNodes(nodes)).toEqual([]);
  });

  it("reports a node related to itself", () => {
    const nodes = [node({ id: "a", relations: [{ source: "a", target: "a", type: "contains" }] })];
    expect(validateBiologicalNodes(nodes)).toEqual([{ code: "self_relation", nodeId: "a" }]);
  });

  it("reports the same relation declared twice", () => {
    const relation = { source: "a", target: "b", type: "has_part" } as const;
    const nodes = [node({ id: "a", relations: [relation, relation] }), node({ id: "b" })];
    expect(validateBiologicalNodes(nodes)).toEqual([
      { code: "duplicate_relation", nodeId: "a", relation },
    ]);
  });

  it("allows different relation types between the same pair of nodes", () => {
    const nodes = [
      node({
        id: "a",
        relations: [
          { source: "a", target: "b", type: "contains" },
          { source: "a", target: "b", type: "associated_with" },
        ],
      }),
      node({ id: "b" }),
    ];
    expect(validateBiologicalNodes(nodes)).toEqual([]);
  });

  it("reports educational content without references", () => {
    expect(
      validateBiologicalNodes([
        node({
          id: "a",
          educationalContent: { summary: "fixture", sources: [], reviewStatus: "draft" },
        }),
      ]),
    ).toEqual([{ code: "missing_references", nodeId: "a" }]);
  });
});

describe("createBiologicalGraph", () => {
  const graph = createBiologicalGraph([
    node({ id: "p1", relations: [{ source: "p1", target: "shared", type: "contains" }] }),
    node({ id: "p2", relations: [{ source: "p2", target: "shared", type: "contains" }] }),
    node({ id: "shared", type: "organelle" }),
  ]);

  it("looks up nodes by id", () => {
    expect(graph.getNode("shared")?.type).toBe("organelle");
    expect(graph.getNode("missing")).toBeUndefined();
  });

  it("exposes outgoing relations", () => {
    expect(graph.getOutgoingRelations("p1")).toEqual([
      { source: "p1", target: "shared", type: "contains" },
    ]);
    expect(graph.getOutgoingRelations("missing")).toEqual([]);
  });

  it("indexes incoming relations so shared structures are reachable from every parent", () => {
    expect(graph.getIncomingRelations("shared").map((r) => r.source)).toEqual(["p1", "p2"]);
    expect(graph.getIncomingRelations("p1")).toEqual([]);
  });

  it("refuses to build an invalid graph and exposes the issues", () => {
    try {
      createBiologicalGraph([node({ id: "a" }), node({ id: "a" })]);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(BiologicalGraphValidationError);
      expect((error as BiologicalGraphValidationError).issues).toEqual([
        { code: "duplicate_node_id", nodeId: "a" },
      ]);
    }
  });

  it("is not affected by later mutation of the input array", () => {
    const input = [node({ id: "a" })];
    const isolated = createBiologicalGraph(input);
    input.push(node({ id: "b" }));
    expect(isolated.nodes.map((n) => n.id)).toEqual(["a"]);
    expect(Object.isFrozen(isolated.nodes)).toBe(true);
  });
});

describe("relation direction", () => {
  const graph = createBiologicalGraph([
    node({
      id: "whole",
      relations: [
        { source: "whole", target: "part", type: "has_part" },
        { source: "whole", target: "inner", type: "contains" },
      ],
    }),
    node({ id: "part", type: "cellular_structure" }),
    node({ id: "inner", type: "organelle" }),
  ]);

  it("queries has_part in both directions", () => {
    expect(graph.getOutgoingRelations("whole")).toContainEqual({
      source: "whole",
      target: "part",
      type: "has_part",
    });
    expect(graph.getIncomingRelations("part")).toEqual([
      { source: "whole", target: "part", type: "has_part" },
    ]);
  });

  it("queries contains in both directions", () => {
    expect(graph.getIncomingRelations("inner")).toEqual([
      { source: "whole", target: "inner", type: "contains" },
    ]);
  });

  it("does not infer part_of from has_part or contains", () => {
    expect(graph.getOutgoingRelations("part")).toEqual([]);
    expect(graph.getOutgoingRelations("inner")).toEqual([]);
    const all = graph.nodes.flatMap((n) => graph.getOutgoingRelations(n.id));
    expect(all.some((r) => r.type === "part_of")).toBe(false);
  });
});

describe("scale", () => {
  const issuesFor = (scale: Scale) => validateBiologicalNodes([node({ id: "a", scale })]);

  it("accepts a single value", () => {
    expect(issuesFor({ dimension: "diameter", value: 2, unit: "nm" })).toEqual([]);
  });

  it("accepts a valid range", () => {
    expect(issuesFor({ dimension: "length", min: 1, max: 20, unit: "µm" })).toEqual([]);
  });

  it.each([
    ["inverted", { dimension: "length", min: 20, max: 1, unit: "µm" }],
    ["degenerate", { dimension: "length", min: 5, max: 5, unit: "µm" }],
    ["non-positive", { dimension: "length", min: 0, max: 5, unit: "µm" }],
  ] as const)("rejects a %s range", (_, scale) => {
    expect(issuesFor(scale)).toEqual([{ code: "invalid_scale", nodeId: "a" }]);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])("rejects the value %s", (value) => {
    expect(issuesFor({ dimension: "width", value, unit: "mm" })).toEqual([
      { code: "invalid_scale", nodeId: "a" },
    ]);
  });

  it("preserves the measured dimension, so equal numbers stay distinguishable", () => {
    const diameter: Scale = { dimension: "diameter", value: 2, unit: "nm" };
    const length: Scale = { dimension: "length", value: 2, unit: "nm" };
    const graph = createBiologicalGraph([
      node({ id: "d", scale: diameter }),
      node({ id: "l", scale: length }),
    ]);
    expect(graph.getNode("d")?.scale?.dimension).toBe("diameter");
    expect(graph.getNode("l")?.scale?.dimension).toBe("length");
    expect(isScaleRange(diameter)).toBe(false);
    expect(isScaleRange({ dimension: "length", min: 1, max: 2, unit: "nm" })).toBe(true);
  });

  it("does not allow a single value and a range at the same time", () => {
    // @ts-expect-error value e intervalo são mutuamente exclusivos
    const mixed: Scale = { dimension: "length", value: 2, min: 1, max: 3, unit: "nm" };
    expect(mixed).toBeDefined();
  });
});

describe("scientific references", () => {
  const withReference = (accessedOn: string) =>
    node({
      id: "a",
      educationalContent: {
        summary: "fixture",
        reviewStatus: "draft",
        sources: [{ id: "ref", citation: "fixture", url: "https://example.org", accessedOn }],
      },
    });

  it("accepts an ISO 8601 access date", () => {
    expect(validateBiologicalNodes([withReference("2024-02-29")])).toEqual([]);
  });

  it.each(["2023-02-29", "2024-13-01", "29/02/2024", "2024-2-9", "2024-02-29T00:00:00Z"])(
    "rejects the access date %s",
    (accessedOn) => {
      expect(validateBiologicalNodes([withReference(accessedOn)])).toEqual([
        { code: "invalid_reference_access_date", nodeId: "a", referenceId: "ref" },
      ]);
    },
  );
});

describe("contracts", () => {
  it("keeps scientific text out of BiologicalNode", () => {
    // @ts-expect-error texto científico pertence a EducationalContent
    const withDescription: BiologicalNode = { ...node({ id: "a" }), description: "text" };
    expect(withDescription).toBeDefined();
  });

  it("requires a review status on educational content", () => {
    // @ts-expect-error reviewStatus é obrigatório
    const content: EducationalContent = { summary: "fixture", sources: [] };
    expect(content).toBeDefined();
  });
});
