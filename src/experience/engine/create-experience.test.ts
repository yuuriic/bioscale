import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createBiologicalGraph } from "@/biology/graph/biological-graph";
import type { BiologicalNode } from "@/biology/graph/biological-node";
import { UnknownBiologicalNodeError } from "@/biology/graph/unknown-biological-node-error";
import { CameraController, DEFAULT_FIELD_OF_VIEW } from "@/experience/camera/camera-controller";
import { LayerController } from "@/experience/layers/layer-controller";
import type { CameraPreset, SceneDefinition } from "@/experience/scenes/scene-definition";
import { createSceneRegistry } from "@/experience/scenes/scene-registry";
import { createExperience } from "./create-experience";
import { ExperienceController, SceneNotAvailableError } from "./experience-controller";

// Grafo e cenas neutros: `a`, `b` e `e` possuem cena (`e` sem layers e sem
// campo de visão); `c` existe no grafo sem cena.
function node(id: string): BiologicalNode {
  return { id, name: id, domain: "cellular", type: "cell", relations: [] };
}

const graph = createBiologicalGraph(["a", "b", "c", "e"].map(node));

const PRESET_A: CameraPreset = { position: [0, 0, 10], target: [0, 0, 0], fieldOfView: 40 };
const PRESET_B: CameraPreset = { position: [0, 5, 5], target: [0, 1, 0], fieldOfView: 30 };
const PRESET_E: CameraPreset = { position: [1, 1, 1], target: [0, 0, 0] };

const SCENE_A: SceneDefinition = {
  nodeId: "a",
  assets: [],
  camera: PRESET_A,
  layers: [
    { id: "outer", label: "Externa" },
    { id: "inner", label: "Interna" },
  ],
  capabilities: [],
};
const SCENE_B: SceneDefinition = {
  nodeId: "b",
  assets: [],
  camera: PRESET_B,
  layers: [{ id: "core", label: "Núcleo" }],
  capabilities: [],
};
const SCENE_E: SceneDefinition = {
  nodeId: "e",
  assets: [],
  camera: PRESET_E,
  layers: [],
  capabilities: [],
};

const scenes = createSceneRegistry([SCENE_A, SCENE_B, SCENE_E], graph);

const INITIAL_LAYERS_A = {
  layers: [
    { layerId: "outer", visible: true, transparent: false },
    { layerId: "inner", visible: true, transparent: false },
  ],
};
const INITIAL_LAYERS_B = { layers: [{ layerId: "core", visible: true, transparent: false }] };

function createAtA() {
  return createExperience({ graph, scenes, initialNodeId: "a" });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createExperience initial state", () => {
  it("builds every controller coherent with the initial scene", () => {
    const runtime = createAtA();

    expect(runtime.navigation.getState()).toEqual({ currentNode: "a", history: [], mode: "guided" });
    expect(runtime.navigation.getBreadcrumbs()).toEqual(["a"]);
    expect(runtime.selection.getState()).toEqual({});
    expect(runtime.camera.getState()).toEqual(PRESET_A);
    expect(runtime.layers.getState()).toEqual(INITIAL_LAYERS_A);
    expect("isolatedLayerId" in runtime.layers.getState()).toBe(false);
    expect(runtime.experience).toBeInstanceOf(ExperienceController);
  });

  it("builds the state by construction, without entering or applying anything", () => {
    const enter = vi.spyOn(ExperienceController.prototype, "enter");
    const applyPreset = vi.spyOn(CameraController.prototype, "applyPreset");
    const applyLayers = vi.spyOn(LayerController.prototype, "applyLayers");

    const runtime = createAtA();

    expect(enter).not.toHaveBeenCalled();
    expect(applyPreset).not.toHaveBeenCalled();
    expect(applyLayers).not.toHaveBeenCalled();
    expect(runtime.navigation.canGoBack()).toBe(false);
  });

  it("uses the camera default field of view when the scene omits it", () => {
    const runtime = createExperience({ graph, scenes, initialNodeId: "e" });
    expect(runtime.camera.getState()).toEqual({ ...PRESET_E, fieldOfView: DEFAULT_FIELD_OF_VIEW });
  });

  it("accepts an initial scene without layers", () => {
    const runtime = createExperience({ graph, scenes, initialNodeId: "e" });
    expect(runtime.layers.getState()).toEqual({ layers: [] });
  });

  it("returns only controller references and subscribe, frozen", () => {
    const runtime = createAtA();
    expect(Object.keys(runtime).sort()).toEqual([
      "camera",
      "experience",
      "layers",
      "navigation",
      "selection",
      "subscribe",
    ]);
    expect(Object.isFrozen(runtime)).toBe(true);
  });
});

describe("createExperience shared instances", () => {
  it("coordinates the exposed navigation and selection", () => {
    const runtime = createAtA();
    runtime.selection.select("c");

    runtime.experience.enter("b");

    expect(runtime.navigation.getBreadcrumbs()).toEqual(["a", "b"]);
    expect(runtime.selection.getState()).toEqual({});
  });

  it("coordinates the exposed camera and layers", () => {
    const runtime = createAtA();
    runtime.camera.setPosition([9, 9, 9]);
    runtime.layers.setVisibility("outer", false);

    runtime.experience.enter("b");

    expect(runtime.camera.getState()).toEqual(PRESET_B);
    expect(runtime.layers.getState()).toEqual(INITIAL_LAYERS_B);
  });

  it("goes back to the initial scene with its camera and layers", () => {
    const runtime = createAtA();
    runtime.experience.enter("b");
    runtime.layers.isolate("core");

    runtime.experience.back();

    expect(runtime.navigation.getState()).toEqual({ currentNode: "a", history: [], mode: "guided" });
    expect(runtime.selection.getState()).toEqual({});
    expect(runtime.camera.getState()).toEqual(PRESET_A);
    expect(runtime.layers.getState()).toEqual(INITIAL_LAYERS_A);
  });
});

describe("createExperience failures", () => {
  function failure(initialNodeId: string, registry = scenes) {
    let runtime: unknown;
    let error: unknown;
    try {
      runtime = createExperience({ graph, scenes: registry, initialNodeId });
    } catch (caught) {
      error = caught;
    }
    return { runtime, error };
  }

  it("rejects a node that does not exist in the graph", () => {
    const { runtime, error } = failure("missing");
    expect(runtime).toBeUndefined();
    expect(error).toBeInstanceOf(UnknownBiologicalNodeError);
    expect((error as UnknownBiologicalNodeError).nodeId).toBe("missing");
  });

  it("rejects an existing node without a scene, without any fallback", () => {
    const { runtime, error } = failure("c");
    expect(runtime).toBeUndefined();
    expect(error).toBeInstanceOf(SceneNotAvailableError);
    expect(error).not.toBeInstanceOf(UnknownBiologicalNodeError);
    expect((error as SceneNotAvailableError).nodeId).toBe("c");
  });

  it("rejects an existing node when the registry is empty", () => {
    const { runtime, error } = failure("a", createSceneRegistry([], graph));
    expect(runtime).toBeUndefined();
    expect(error).toBeInstanceOf(SceneNotAvailableError);
  });
});

describe("createExperience module boundaries", () => {
  const source = readFileSync(
    fileURLToPath(new URL("./create-experience.ts", import.meta.url)),
    "utf8",
  );
  const code = source.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
  const specifiers = [...source.matchAll(/from\s*["']([^"']+)["']/g)].flatMap(
    (match) => match[1] ?? [],
  );

  it("depends only on the graph contracts, the experience controllers and scenes", () => {
    const allowed = new Set([
      "@/biology/graph/biological-graph",
      "@/biology/graph/unknown-biological-node-error",
      "@/experience/camera/camera-controller",
      "@/experience/layers/layer-controller",
      "@/experience/navigation/navigation-controller",
      "@/experience/scenes/scene-registry",
      "@/experience/selection/selection-controller",
      "./experience-change-notifier",
      "./experience-controller",
    ]);
    expect(specifiers.filter((s) => !allowed.has(s))).toEqual([]);
  });

  it("does not duplicate controller rules or bootstrap through mutations", () => {
    expect(code).not.toMatch(/\b(DEFAULT_FIELD_OF_VIEW|applyPreset|applyLayers|enter|select)\b\s*\(?/);
    expect(code).not.toMatch(/\bfieldOfView\b/);
  });

  it("has no aggregated state, store, singleton, events, I/O or platform access", () => {
    // `subscribe` é o contrato de notificação do runtime (§11.6), não um event bus.
    const forbidden =
      /\b(ExperienceState|getState|store|Store|zustand|singleton|instance|emit|fetch|window|document|WebGL\w*|HTMLCanvasElement|THREE|React|mvpBiologicalNodes)\b/;
    expect(code).not.toMatch(forbidden);
    expect(code).not.toMatch(/^let\s|^\s*static\s/m);
  });
});
