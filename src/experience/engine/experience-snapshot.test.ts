import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { createBiologicalGraph } from "@/biology/graph/biological-graph";
import type { BiologicalNode } from "@/biology/graph/biological-node";
import type { CameraPreset, SceneDefinition } from "@/experience/scenes/scene-definition";
import { createSceneRegistry } from "@/experience/scenes/scene-registry";
import { createExperience } from "./create-experience";
import * as snapshotModule from "./experience-snapshot";
import { getExperienceSnapshot } from "./experience-snapshot";

// Grafo e cenas neutros: `a`, `b` e `c` possuem cena; `d` não.
function node(id: string): BiologicalNode {
  return { id, name: id, domain: "cellular", type: "cell", relations: [] };
}

const graph = createBiologicalGraph(["a", "b", "c", "d"].map(node));

const PRESET_A: CameraPreset = { position: [0, 0, 10], target: [0, 0, 0], fieldOfView: 40 };
const PRESET_B: CameraPreset = { position: [0, 5, 5], target: [0, 1, 0], fieldOfView: 30 };
const PRESET_C: CameraPreset = { position: [3, 0, 3], target: [0, 0, 0], fieldOfView: 60 };

function scene(nodeId: string, camera: CameraPreset, layerIds: readonly string[]): SceneDefinition {
  return {
    nodeId,
    assets: [],
    camera,
    layers: layerIds.map((id) => ({ id, label: id })),
    capabilities: [],
  };
}

const scenes = createSceneRegistry(
  [
    scene("a", PRESET_A, ["outer", "inner"]),
    scene("b", PRESET_B, ["core"]),
    scene("c", PRESET_C, []),
  ],
  graph,
);

function initialLayers(...layerIds: string[]) {
  return {
    layers: layerIds.map((layerId) => ({ layerId, visible: true, transparent: false })),
  };
}

function createAtA() {
  return createExperience({ graph, scenes, initialNodeId: "a" });
}

describe("getExperienceSnapshot content", () => {
  it("contains exactly navigation, selection, camera and layers", () => {
    const snapshot = getExperienceSnapshot(createAtA());
    expect(Object.keys(snapshot).sort()).toEqual(["camera", "layers", "navigation", "selection"]);
  });

  it("reuses the current immutable state of each controller", () => {
    const runtime = createAtA();
    const snapshot = getExperienceSnapshot(runtime);

    expect(snapshot.navigation).toBe(runtime.navigation.getState());
    expect(snapshot.selection).toBe(runtime.selection.getState());
    expect(snapshot.camera).toBe(runtime.camera.getState());
    expect(snapshot.layers).toBe(runtime.layers.getState());
  });

  it("represents the initial scene", () => {
    expect(getExperienceSnapshot(createAtA())).toEqual({
      navigation: { currentNode: "a", history: [], mode: "guided" },
      selection: {},
      camera: PRESET_A,
      layers: initialLayers("outer", "inner"),
    });
  });

  it("represents the destination after enter, back and returnToBreadcrumb", () => {
    const runtime = createAtA();

    runtime.experience.enter("b");
    expect(getExperienceSnapshot(runtime)).toEqual({
      navigation: { currentNode: "b", history: ["a"], mode: "guided" },
      selection: {},
      camera: PRESET_B,
      layers: initialLayers("core"),
    });

    runtime.experience.enter("c");
    runtime.experience.back();
    expect(getExperienceSnapshot(runtime).navigation).toEqual({
      currentNode: "b",
      history: ["a"],
      mode: "guided",
    });
    expect(getExperienceSnapshot(runtime).camera).toEqual(PRESET_B);

    runtime.experience.returnToBreadcrumb(0);
    expect(getExperienceSnapshot(runtime)).toEqual({
      navigation: { currentNode: "a", history: [], mode: "guided" },
      selection: {},
      camera: PRESET_A,
      layers: initialLayers("outer", "inner"),
    });
  });

  it("reflects selection, camera and layer changes in the next snapshot", () => {
    const runtime = createAtA();

    runtime.selection.select("d");
    expect(getExperienceSnapshot(runtime).selection).toEqual({ selectedNodeId: "d" });
    runtime.selection.clearSelection();
    expect(getExperienceSnapshot(runtime).selection).toEqual({});

    runtime.camera.setPosition([1, 2, 3]);
    expect(getExperienceSnapshot(runtime).camera.position).toEqual([1, 2, 3]);

    runtime.layers.setVisibility("outer", false);
    runtime.layers.setTransparent("inner", true);
    runtime.layers.isolate("inner");
    expect(getExperienceSnapshot(runtime).layers).toEqual({
      layers: [
        { layerId: "outer", visible: false, transparent: false },
        { layerId: "inner", visible: true, transparent: true },
      ],
      isolatedLayerId: "inner",
    });
  });
});

describe("getExperienceSnapshot as a photograph", () => {
  it("keeps an earlier snapshot unchanged after enter, selection, camera and layer changes", () => {
    const runtime = createAtA();
    runtime.selection.select("d");
    const earlier = getExperienceSnapshot(runtime);
    const expected = structuredClone(earlier);

    runtime.selection.select("c");
    runtime.camera.setTarget([4, 4, 4]);
    runtime.layers.setTransparent("outer", true);
    runtime.layers.isolate("outer");
    runtime.experience.enter("b");

    expect(earlier).toEqual(expected);
    expect(earlier.navigation.currentNode).toBe("a");
    expect(earlier.selection).toEqual({ selectedNodeId: "d" });
    expect(earlier.camera).toEqual(PRESET_A);
    expect(earlier.layers).toEqual(initialLayers("outer", "inner"));
  });

  it("creates a new aggregated object on every call, even without changes", () => {
    const runtime = createAtA();
    const first = getExperienceSnapshot(runtime);
    const second = getExperienceSnapshot(runtime);

    expect(second).not.toBe(first);
    expect(second).toEqual(first);
    expect(second.navigation).toBe(first.navigation);
    expect(second.layers).toBe(first.layers);
  });

  it("is frozen, so replacing its parts does not affect the experience", () => {
    const runtime = createAtA();
    const snapshot = getExperienceSnapshot(runtime);

    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(() => {
      (snapshot as { camera: unknown }).camera = PRESET_B;
    }).toThrow(TypeError);
    expect(() => {
      (snapshot as { layers: unknown }).layers = initialLayers("core");
    }).toThrow(TypeError);

    expect(runtime.camera.getState()).toEqual(PRESET_A);
    expect(getExperienceSnapshot(runtime).layers).toEqual(initialLayers("outer", "inner"));
  });

  it("is not stored in the runtime", () => {
    const runtime = createAtA();
    getExperienceSnapshot(runtime);
    expect(Object.keys(runtime).sort()).toEqual([
      "camera",
      "experience",
      "layers",
      "navigation",
      "selection",
      "subscribe",
    ]);
  });
});

describe("experience snapshot module boundaries", () => {
  const source = readFileSync(
    fileURLToPath(new URL("./experience-snapshot.ts", import.meta.url)),
    "utf8",
  );
  const imports = [...source.matchAll(/^import\s+(type\s+)?.*?from\s*["']([^"']+)["'];?$/gms)].map(
    (match) => ({ typeOnly: match[1] !== undefined, specifier: match[2] }),
  );

  it("exports only getExperienceSnapshot at runtime", () => {
    expect(Object.keys(snapshotModule)).toEqual(["getExperienceSnapshot"]);
  });

  it("imports only type contracts of the experience controllers and runtime", () => {
    expect(imports.map(({ specifier }) => specifier).sort()).toEqual([
      "./create-experience",
      "@/experience/camera/camera-state",
      "@/experience/layers/layer-state",
      "@/experience/navigation/navigation-state",
      "@/experience/selection/selection-state",
    ]);
    expect(imports.every(({ typeOnly }) => typeOnly)).toBe(true);
  });
});
