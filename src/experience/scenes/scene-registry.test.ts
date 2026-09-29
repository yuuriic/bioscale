import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, expectTypeOf, it } from "vitest";
import { createBiologicalGraph } from "@/biology/graph/biological-graph";
import type { BiologicalNode } from "@/biology/graph/biological-node";
import type { AssetReference } from "@/types/asset-reference";
import type { SceneAsset, SceneDefinition } from "./scene-definition";
import {
  SceneRegistryValidationError,
  createSceneRegistry,
  validateSceneDefinitions,
} from "./scene-registry";

// Grafo e cenas estruturais neutros: não representam dados científicos nem
// decisões visuais do MVP. `c` existe no grafo, mas não possui cena.
function node(id: string): BiologicalNode {
  return { id, name: id, domain: "cellular", type: "cell", relations: [] };
}

const graph = createBiologicalGraph([node("a"), node("b"), node("c")]);

function scene(overrides: Partial<SceneDefinition> & Pick<SceneDefinition, "nodeId">): SceneDefinition {
  return {
    assets: [],
    camera: { position: [0, 0, 10], target: [0, 0, 0] },
    layers: [],
    capabilities: [],
    ...overrides,
  };
}

function fullScene(): SceneDefinition {
  return {
    nodeId: "a",
    assets: [{ assetId: "asset-a" }, { assetId: "asset-a-detail" }],
    camera: { position: [1, 2, 3], target: [0, 0, 0], fieldOfView: 45 },
    layers: [
      { id: "outer", label: "Externa" },
      { id: "inner", label: "Interna" },
    ],
    capabilities: ["rotate", "zoom", "select"],
  };
}

function issuesOf(scenes: readonly SceneDefinition[]) {
  return validateSceneDefinitions(scenes, graph);
}

describe("SceneDefinition contract", () => {
  it("accepts a minimal scene without assets, layers or capabilities", () => {
    const minimal = scene({ nodeId: "a" });
    expect(issuesOf([minimal])).toEqual([]);
    expect(createSceneRegistry([minimal], graph).getScene("a")).toEqual(minimal);
  });

  it("declares an abstract camera with plain vectors and an optional field of view", () => {
    const { camera } = createSceneRegistry([fullScene()], graph).getScene("a")!;
    expect(camera).toEqual({ position: [1, 2, 3], target: [0, 0, 0], fieldOfView: 45 });
    expect(JSON.parse(JSON.stringify(camera))).toEqual(camera);
  });

  it("omits the field of view when it is not declared", () => {
    const { camera } = createSceneRegistry([scene({ nodeId: "a" })], graph).getScene("a")!;
    expect("fieldOfView" in camera).toBe(false);
  });

  it.each([
    ["non-finite coordinate", { position: [0, 0, Number.NaN], target: [0, 0, 0] }],
    ["position equal to target", { position: [1, 1, 1], target: [1, 1, 1] }],
    ["field of view of zero", { position: [0, 0, 1], target: [0, 0, 0], fieldOfView: 0 }],
    ["field of view of 180°", { position: [0, 0, 1], target: [0, 0, 0], fieldOfView: 180 }],
  ] as const)("rejects a camera with %s", (_, camera) => {
    expect(issuesOf([scene({ nodeId: "a", camera })])).toEqual([
      { code: "invalid_camera", nodeId: "a" },
    ]);
  });

  it("references assets only by id", () => {
    const { assets } = createSceneRegistry([fullScene()], graph).getScene("a")!;
    expect(assets).toEqual([{ assetId: "asset-a" }, { assetId: "asset-a-detail" }]);
  });

  it("rejects the same asset declared twice in a scene", () => {
    const assets = [{ assetId: "x" }, { assetId: "x" }];
    expect(issuesOf([scene({ nodeId: "a", assets })])).toEqual([
      { code: "duplicate_asset", nodeId: "a", assetId: "x" },
    ]);
  });

  it("declares the visual layers the scene offers", () => {
    const { layers } = createSceneRegistry([fullScene()], graph).getScene("a")!;
    expect(layers).toEqual([
      { id: "outer", label: "Externa" },
      { id: "inner", label: "Interna" },
    ]);
  });

  it("rejects layer ids repeated within a scene", () => {
    const layers = [
      { id: "outer", label: "A" },
      { id: "outer", label: "B" },
    ];
    expect(issuesOf([scene({ nodeId: "a", layers })])).toEqual([
      { code: "duplicate_layer", nodeId: "a", layerId: "outer" },
    ]);
  });

  it("declares capabilities as a list of known values", () => {
    const { capabilities } = createSceneRegistry([fullScene()], graph).getScene("a")!;
    expect(capabilities).toEqual(["rotate", "zoom", "select"]);
  });

  it("rejects unknown and repeated capabilities", () => {
    const capabilities = ["rotate", "rotate", "fly"] as unknown as SceneDefinition["capabilities"];
    expect(issuesOf([scene({ nodeId: "a", capabilities })])).toEqual([
      { code: "unknown_capability", nodeId: "a", capability: "fly" },
      { code: "duplicate_capability", nodeId: "a", capability: "rotate" },
    ]);
  });

  it("is plain serializable data", () => {
    const registry = createSceneRegistry([fullScene()], graph);
    expect(JSON.parse(JSON.stringify(registry.scenes))).toEqual([fullScene()]);
  });
});

describe("SceneRegistry", () => {
  it("finds a scene by BiologicalNode id", () => {
    const registry = createSceneRegistry([fullScene(), scene({ nodeId: "b" })], graph);
    expect(registry.getScene("a")?.nodeId).toBe("a");
    expect(registry.getScene("b")?.nodeId).toBe("b");
    expect(registry.scenes.map((s) => s.nodeId)).toEqual(["a", "b"]);
  });

  it("rejects a scene for a node that does not exist in the graph", () => {
    let error: unknown;
    try {
      createSceneRegistry([scene({ nodeId: "missing" })], graph);
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(SceneRegistryValidationError);
    expect((error as SceneRegistryValidationError).issues).toEqual([
      { code: "unknown_scene_node", nodeId: "missing" },
    ]);
  });

  it("rejects two scenes for the same node", () => {
    expect(() => createSceneRegistry([scene({ nodeId: "a" }), scene({ nodeId: "a" })], graph))
      .toThrow(SceneRegistryValidationError);
    expect(issuesOf([scene({ nodeId: "a" }), scene({ nodeId: "a" })])).toEqual([
      { code: "duplicate_scene_node", nodeId: "a" },
    ]);
  });

  it("returns undefined for a node without a scene or an unknown id", () => {
    const registry = createSceneRegistry([fullScene()], graph);
    expect(registry.getScene("missing")).toBeUndefined();
  });

  it("does not require every node of the graph to have a scene", () => {
    const registry = createSceneRegistry([fullScene()], graph);
    expect(graph.getNode("c")).toBeDefined();
    expect(registry.getScene("c")).toBeUndefined();
  });

  it("accepts an empty set of scenes", () => {
    expect(createSceneRegistry([], graph).scenes).toEqual([]);
  });
});

describe("scene asset composition", () => {
  const withLayers = (assets: readonly SceneAsset[]) =>
    scene({
      nodeId: "a",
      assets,
      layers: [
        { id: "outer", label: "Externa" },
        { id: "inner", label: "Interna" },
      ],
    });

  it("accepts an asset without a layer as base content", () => {
    expect(issuesOf([withLayers([{ assetId: "base" }])])).toEqual([]);
  });

  it("accepts an asset in an existing layer", () => {
    expect(issuesOf([withLayers([{ assetId: "skin", layerId: "outer" }])])).toEqual([]);
  });

  it("accepts several assets in the same layer and different assets in different layers", () => {
    const assets = [
      { assetId: "one", layerId: "outer" },
      { assetId: "two", layerId: "outer" },
      { assetId: "three", layerId: "inner" },
      { assetId: "four" },
    ];
    expect(issuesOf([withLayers(assets)])).toEqual([]);
  });

  it("rejects an asset whose layer does not exist in the scene", () => {
    expect(issuesOf([withLayers([{ assetId: "skin", layerId: "missing" }])])).toEqual([
      { code: "unknown_asset_layer", nodeId: "a", assetId: "skin", layerId: "missing" },
    ]);
    expect(() => createSceneRegistry([withLayers([{ assetId: "skin", layerId: "missing" }])], graph))
      .toThrow(SceneRegistryValidationError);
  });

  it("rejects the same asset twice, with or without layers, even in different layers", () => {
    for (const assets of [
      [{ assetId: "x" }, { assetId: "x" }],
      [{ assetId: "x", layerId: "outer" }, { assetId: "x", layerId: "outer" }],
      [{ assetId: "x", layerId: "outer" }, { assetId: "x", layerId: "inner" }],
      [{ assetId: "x" }, { assetId: "x", layerId: "inner" }],
    ]) {
      expect(issuesOf([withLayers(assets)])).toEqual([
        { code: "duplicate_asset", nodeId: "a", assetId: "x" },
      ]);
    }
  });

  it("reports duplicate assets before unknown asset layers, in scene order", () => {
    const assets = [
      { assetId: "x", layerId: "missing" },
      { assetId: "x", layerId: "outer" },
    ];
    expect(issuesOf([withLayers(assets)])).toEqual([
      { code: "duplicate_asset", nodeId: "a", assetId: "x" },
      { code: "unknown_asset_layer", nodeId: "a", assetId: "x", layerId: "missing" },
    ]);
  });

  it("keeps AssetReference as an opaque identity and the layer only in the scene entry", () => {
    expectTypeOf<keyof AssetReference>().toEqualTypeOf<"assetId">();
    expectTypeOf<keyof SceneAsset>().toEqualTypeOf<"assetId" | "layerId">();
    expectTypeOf<SceneAsset>().toMatchTypeOf<AssetReference>();
  });
});

describe("SceneRegistry immutability", () => {
  it("is not affected by later changes to the caller's assets", () => {
    const input = fullScene();
    const assets = input.assets as { assetId: string }[];
    const registry = createSceneRegistry([input], graph);

    assets.push({ assetId: "late" });
    assets[0]!.assetId = "changed";

    expect(registry.getScene("a")!.assets).toEqual(fullScene().assets);
  });

  it("is not affected by later changes to the caller's layers", () => {
    const input = fullScene();
    const layers = input.layers as { id: string; label: string }[];
    const registry = createSceneRegistry([input], graph);

    layers.pop();
    layers[0]!.label = "changed";

    expect(registry.getScene("a")!.layers).toEqual(fullScene().layers);
  });

  it("is not affected by later changes to the caller's capabilities", () => {
    const input = fullScene();
    const registry = createSceneRegistry([input], graph);

    (input.capabilities as string[]).push("explode");

    expect(registry.getScene("a")!.capabilities).toEqual(fullScene().capabilities);
  });

  it("is not affected by later changes to the caller's camera", () => {
    const input = fullScene();
    const camera = input.camera as unknown as { position: number[]; fieldOfView: number };
    const registry = createSceneRegistry([input], graph);

    camera.position[0] = 99;
    camera.fieldOfView = 90;

    expect(registry.getScene("a")!.camera).toEqual(fullScene().camera);
  });

  it("is not affected by later changes to the caller's scene list", () => {
    const input = [fullScene()];
    const registry = createSceneRegistry(input, graph);

    input.push(scene({ nodeId: "b" }));

    expect(registry.scenes).toHaveLength(1);
    expect(registry.getScene("b")).toBeUndefined();
  });

  it("freezes each asset entry, including its layer, and keeps the scene identity", () => {
    const input = scene({
      nodeId: "a",
      assets: [{ assetId: "skin", layerId: "outer" }, { assetId: "base" }],
      layers: [{ id: "outer", label: "Externa" }],
    });
    const registry = createSceneRegistry([input], graph);
    const returned = registry.getScene("a")!;

    expect(Object.isFrozen(returned)).toBe(true);
    expect(Object.isFrozen(returned.assets)).toBe(true);
    expect(Object.isFrozen(returned.layers)).toBe(true);
    for (const entry of returned.assets) {
      expect(Object.isFrozen(entry)).toBe(true);
    }
    expect(() => {
      (returned.assets[0] as { layerId?: string }).layerId = "other";
    }).toThrow(TypeError);
    expect(returned.assets).toEqual([{ assetId: "skin", layerId: "outer" }, { assetId: "base" }]);
    expect("layerId" in (returned.assets[1] ?? {})).toBe(false);
    expect(registry.getScene("a")).toBe(returned);

    (input.assets as { assetId: string; layerId?: string }[])[0]!.layerId = "changed";
    expect(registry.getScene("a")?.assets[0]).toEqual({ assetId: "skin", layerId: "outer" });
  });

  it("does not let consumers change the scenes it returns", () => {
    const registry = createSceneRegistry([fullScene()], graph);
    const returned = registry.getScene("a")!;

    expect(() => (returned.assets as unknown[]).push({ assetId: "x" })).toThrow(TypeError);
    expect(() => {
      (returned.assets[0] as { assetId: string }).assetId = "x";
    }).toThrow(TypeError);
    expect(() => (returned.layers as unknown[]).pop()).toThrow(TypeError);
    expect(() => {
      (returned.layers[0] as { label: string }).label = "x";
    }).toThrow(TypeError);
    expect(() => (returned.capabilities as string[]).push("explode")).toThrow(TypeError);
    expect(() => {
      (returned.camera.position as unknown as number[])[0] = 99;
    }).toThrow(TypeError);
    expect(() => {
      (returned.camera as { fieldOfView: number }).fieldOfView = 90;
    }).toThrow(TypeError);
    expect(() => {
      (returned as { nodeId: string }).nodeId = "b";
    }).toThrow(TypeError);
    expect(() => (registry.scenes as SceneDefinition[]).pop()).toThrow(TypeError);

    expect(registry.getScene("a")).toEqual(fullScene());
  });
});

describe("scene module boundaries", () => {
  const directory = fileURLToPath(new URL(".", import.meta.url));
  const sources = readdirSync(directory)
    .filter((file) => file.endsWith(".ts") && !file.endsWith(".test.ts"))
    .map((file) => ({ file, source: readFileSync(`${directory}${file}`, "utf8") }));
  const specifiers = (source: string) =>
    [...source.matchAll(/from\s*["']([^"']+)["']/g)].map((match) => match[1]);

  it("finds the implementation files to inspect", () => {
    expect(sources.map(({ file }) => file).sort()).toEqual([
      "scene-definition.ts",
      "scene-registry.ts",
      "validate-camera-preset.ts",
    ]);
  });

  it("does not depend on Three.js or other rendering and UI frameworks", () => {
    const forbidden = /^(three|@react-three\/.+|react|react-dom|next|gsap|lenis|zustand)(\/.*)?$/;
    for (const { file, source } of sources) {
      expect(specifiers(source).filter((s) => s !== undefined && forbidden.test(s)), file).toEqual([]);
    }
  });

  it("does not depend on the MVP dataset or any content module", () => {
    for (const { file, source } of sources) {
      expect(specifiers(source).filter((s) => s?.startsWith("@/content")), file).toEqual([]);
    }
  });
});
