import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { VisualLayer } from "@/experience/scenes/scene-definition";
import {
  DuplicateVisualLayerError,
  LayerController,
  UnknownVisualLayerError,
} from "./layer-controller";
import type { LayerControllerState } from "./layer-state";

// Layers neutras, deliberadamente fora de ordem alfabética: não representam
// camadas anatômicas do MVP.
const LAYERS: readonly VisualLayer[] = [
  { id: "outer", label: "Externa" },
  { id: "middle", label: "Intermediária" },
  { id: "inner", label: "Interna" },
];

const INITIAL: LayerControllerState = {
  layers: [
    { layerId: "outer", visible: true, transparent: false },
    { layerId: "middle", visible: true, transparent: false },
    { layerId: "inner", visible: true, transparent: false },
  ],
};

function layerOf(controller: LayerController, layerId: string) {
  return controller.getState().layers.find((layer) => layer.layerId === layerId);
}

/** Verifica que a operação não altera o estado, preservando a referência. */
function expectNoOp(controller: LayerController, action: () => void): void {
  const before = controller.getState();
  action();
  expect(controller.getState()).toBe(before);
}

describe("LayerController initialization", () => {
  it("starts with every layer visible, none transparent and no isolation, in declared order", () => {
    const controller = new LayerController(LAYERS);
    expect(controller.getState()).toEqual(INITIAL);
    expect("isolatedLayerId" in controller.getState()).toBe(false);
    expect(controller.getState().layers.map((layer) => layer.layerId)).toEqual([
      "outer",
      "middle",
      "inner",
    ]);
  });

  it("accepts an empty configuration", () => {
    const controller = new LayerController([]);
    expect(controller.getState()).toEqual({ layers: [] });
    expectNoOp(controller, () => controller.reset());
    expectNoOp(controller, () => controller.clearIsolation());
    expect(() => controller.setVisibility("any", false)).toThrow(UnknownVisualLayerError);
    expect(() => controller.setTransparent("any", true)).toThrow(UnknownVisualLayerError);
    expect(() => controller.isolate("any")).toThrow(UnknownVisualLayerError);
  });

  it("rejects duplicated layer ids", () => {
    let error: unknown;
    try {
      new LayerController([...LAYERS, { id: "middle", label: "Outra" }]);
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(DuplicateVisualLayerError);
    expect((error as DuplicateVisualLayerError).layerId).toBe("middle");
  });
});

describe("LayerController visibility", () => {
  it("hides and shows a layer without touching the others", () => {
    const controller = new LayerController(LAYERS);

    controller.setVisibility("middle", false);
    expect(controller.getState().layers).toEqual([
      { layerId: "outer", visible: true, transparent: false },
      { layerId: "middle", visible: false, transparent: false },
      { layerId: "inner", visible: true, transparent: false },
    ]);

    controller.setVisibility("middle", true);
    expect(controller.getState()).toEqual(INITIAL);
  });

  it("does not change transparency or isolation", () => {
    const controller = new LayerController(LAYERS);
    controller.setTransparent("middle", true);
    controller.isolate("inner");

    controller.setVisibility("middle", false);

    expect(layerOf(controller, "middle")).toEqual({
      layerId: "middle",
      visible: false,
      transparent: true,
    });
    expect(controller.getState().isolatedLayerId).toBe("inner");
  });

  it("is a no-op when setting the current value", () => {
    const controller = new LayerController(LAYERS);
    expectNoOp(controller, () => controller.setVisibility("outer", true));
    controller.setVisibility("outer", false);
    expectNoOp(controller, () => controller.setVisibility("outer", false));
  });
});

describe("LayerController transparency", () => {
  it("makes a layer transparent and opaque again", () => {
    const controller = new LayerController(LAYERS);

    controller.setTransparent("outer", true);
    expect(layerOf(controller, "outer")).toEqual({
      layerId: "outer",
      visible: true,
      transparent: true,
    });

    controller.setTransparent("outer", false);
    expect(controller.getState()).toEqual(INITIAL);
  });

  it("does not change visibility or isolation, even for a hidden layer", () => {
    const controller = new LayerController(LAYERS);
    controller.setVisibility("outer", false);
    controller.isolate("middle");

    controller.setTransparent("outer", true);

    expect(layerOf(controller, "outer")).toEqual({
      layerId: "outer",
      visible: false,
      transparent: true,
    });
    expect(controller.getState().isolatedLayerId).toBe("middle");
  });

  it("is a no-op when setting the current value", () => {
    const controller = new LayerController(LAYERS);
    expectNoOp(controller, () => controller.setTransparent("inner", false));
    controller.setTransparent("inner", true);
    expectNoOp(controller, () => controller.setTransparent("inner", true));
  });
});

describe("LayerController isolation", () => {
  it("records the isolated layer without changing any layer state", () => {
    const controller = new LayerController(LAYERS);
    controller.setVisibility("outer", false);
    controller.setTransparent("inner", true);
    const layersBefore = controller.getState().layers;

    controller.isolate("middle");

    expect(controller.getState().isolatedLayerId).toBe("middle");
    expect(controller.getState().layers).toBe(layersBefore);
  });

  it("can isolate a hidden layer without making it visible", () => {
    const controller = new LayerController(LAYERS);
    controller.setVisibility("inner", false);
    controller.isolate("inner");
    expect(layerOf(controller, "inner")?.visible).toBe(false);
  });

  it("switches isolation from one layer to another", () => {
    const controller = new LayerController(LAYERS);
    controller.isolate("outer");
    controller.isolate("inner");
    expect(controller.getState().isolatedLayerId).toBe("inner");
  });

  it("is a no-op when isolating the isolated layer", () => {
    const controller = new LayerController(LAYERS);
    controller.isolate("outer");
    expectNoOp(controller, () => controller.isolate("outer"));
  });

  it("clears isolation and preserves every visibility and transparency", () => {
    const controller = new LayerController(LAYERS);
    controller.setVisibility("outer", false);
    controller.setTransparent("inner", true);
    const layersBefore = controller.getState().layers;
    controller.isolate("middle");

    controller.clearIsolation();

    expect("isolatedLayerId" in controller.getState()).toBe(false);
    expect(controller.getState().layers).toBe(layersBefore);
    expect(controller.getState().layers).toEqual([
      { layerId: "outer", visible: false, transparent: false },
      { layerId: "middle", visible: true, transparent: false },
      { layerId: "inner", visible: true, transparent: true },
    ]);
  });

  it("is a no-op when clearing without isolation", () => {
    const controller = new LayerController(LAYERS);
    expectNoOp(controller, () => controller.clearIsolation());
  });
});

describe("LayerController reset", () => {
  it("restores visibility, removes transparency and isolation", () => {
    const controller = new LayerController(LAYERS);
    controller.setVisibility("outer", false);
    controller.setTransparent("middle", true);
    controller.isolate("inner");

    controller.reset();

    expect(controller.getState()).toEqual(INITIAL);
    expect("isolatedLayerId" in controller.getState()).toBe(false);
  });

  it("is a no-op when already in the initial state, including after returning to it", () => {
    const controller = new LayerController(LAYERS);
    expectNoOp(controller, () => controller.reset());

    controller.setVisibility("outer", false);
    controller.setVisibility("outer", true);
    expectNoOp(controller, () => controller.reset());
  });

  it("keeps the same layer configuration", () => {
    const controller = new LayerController(LAYERS);
    controller.setVisibility("inner", false);
    controller.reset();
    expect(controller.getState().layers.map((layer) => layer.layerId)).toEqual([
      "outer",
      "middle",
      "inner",
    ]);
  });
});

describe("LayerController unknown layers", () => {
  it.each([
    ["setVisibility", (controller: LayerController) => controller.setVisibility("missing", false)],
    ["setTransparent", (controller: LayerController) => controller.setTransparent("missing", true)],
    ["isolate", (controller: LayerController) => controller.isolate("missing")],
  ])("%s throws UnknownVisualLayerError with the id and keeps the state", (_, action) => {
    const controller = new LayerController(LAYERS);
    controller.setTransparent("outer", true);
    controller.isolate("middle");
    const before = controller.getState();

    let error: unknown;
    try {
      action(controller);
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(UnknownVisualLayerError);
    expect((error as UnknownVisualLayerError).layerId).toBe("missing");
    expect(controller.getState()).toBe(before);
  });
});

// Segunda configuração neutra: compartilha `outer` com LAYERS e introduz `core`.
const OTHER_LAYERS: readonly VisualLayer[] = [
  { id: "core", label: "Núcleo" },
  { id: "outer", label: "Externa" },
];

const OTHER_INITIAL: LayerControllerState = {
  layers: [
    { layerId: "core", visible: true, transparent: false },
    { layerId: "outer", visible: true, transparent: false },
  ],
};

/** Controller na configuração LAYERS, com visibilidade, transparência e isolamento alterados. */
function modified(): LayerController {
  const controller = new LayerController(LAYERS);
  controller.setVisibility("outer", false);
  controller.setTransparent("outer", true);
  controller.setTransparent("inner", true);
  controller.isolate("middle");
  return controller;
}

describe("LayerController.applyLayers", () => {
  it("replaces the configuration, in declared order and initial state, without isolation", () => {
    const controller = modified();

    controller.applyLayers(OTHER_LAYERS);

    expect(controller.getState()).toEqual(OTHER_INITIAL);
    expect("isolatedLayerId" in controller.getState()).toBe(false);
  });

  it("does not carry state from the previous configuration, even for the same id", () => {
    const controller = modified();
    expect(layerOf(controller, "outer")).toEqual({
      layerId: "outer",
      visible: false,
      transparent: true,
    });

    controller.applyLayers(OTHER_LAYERS);

    expect(layerOf(controller, "outer")).toEqual({
      layerId: "outer",
      visible: true,
      transparent: false,
    });
  });

  it("forgets the previous layers", () => {
    const controller = modified();
    controller.applyLayers(OTHER_LAYERS);

    for (const action of [
      () => controller.setVisibility("middle", false),
      () => controller.setTransparent("inner", true),
      () => controller.isolate("middle"),
    ]) {
      expect(action).toThrow(UnknownVisualLayerError);
    }
    controller.setVisibility("core", false);
    expect(layerOf(controller, "core")?.visible).toBe(false);
  });

  it("accepts an empty configuration", () => {
    const controller = modified();

    controller.applyLayers([]);

    expect(controller.getState()).toEqual({ layers: [] });
    expect(() => controller.setVisibility("outer", false)).toThrow(UnknownVisualLayerError);
  });

  it("rejects duplicated ids without changing anything", () => {
    const controller = modified();
    const before = controller.getState();

    let error: unknown;
    try {
      controller.applyLayers([...OTHER_LAYERS, { id: "core", label: "Repetida" }]);
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(DuplicateVisualLayerError);
    expect((error as DuplicateVisualLayerError).layerId).toBe("core");
    expect(controller.getState()).toBe(before);
    expect(controller.getState().isolatedLayerId).toBe("middle");
    expect(layerOf(controller, "outer")).toEqual({
      layerId: "outer",
      visible: false,
      transparent: true,
    });
    controller.setVisibility("middle", false);
    expect(() => controller.setVisibility("core", false)).toThrow(UnknownVisualLayerError);
  });

  it("makes reset target the new configuration, never the previous one", () => {
    const controller = new LayerController(LAYERS);
    controller.applyLayers(OTHER_LAYERS);
    controller.setVisibility("core", false);
    controller.isolate("outer");

    controller.reset();

    expect(controller.getState()).toEqual(OTHER_INITIAL);
    expect(controller.getState()).not.toEqual(INITIAL);
  });

  it("resets the same configuration when reapplied after changes", () => {
    const controller = modified();

    controller.applyLayers(LAYERS);

    expect(controller.getState()).toEqual(INITIAL);
  });

  it("creates a new state even when reapplying an equivalent configuration", () => {
    const controller = new LayerController(LAYERS);
    const before = controller.getState();

    controller.applyLayers(LAYERS);

    expect(controller.getState()).toEqual(before);
    expect(controller.getState()).not.toBe(before);
  });

  it("keeps the previous snapshot intact", () => {
    const controller = modified();
    const oldState = controller.getState();

    controller.applyLayers(OTHER_LAYERS);

    expect(oldState).toEqual({
      layers: [
        { layerId: "outer", visible: false, transparent: true },
        { layerId: "middle", visible: true, transparent: false },
        { layerId: "inner", visible: true, transparent: true },
      ],
      isolatedLayerId: "middle",
    });
  });

  it("copies the input and freezes the new state", () => {
    const input = OTHER_LAYERS.map((layer) => ({ ...layer }));
    const controller = new LayerController(LAYERS);
    controller.applyLayers(input);

    input.reverse();
    input.push({ id: "late", label: "Tardia" });
    input[0]!.id = "renamed";

    expect(controller.getState()).toEqual(OTHER_INITIAL);
    expect(() => controller.setVisibility("late", false)).toThrow(UnknownVisualLayerError);
    const state = controller.getState();
    expect(() => (state.layers as unknown[]).push({})).toThrow(TypeError);
    expect(() => {
      (state.layers[0] as { visible: boolean }).visible = false;
    }).toThrow(TypeError);
  });

  it("does not add scene or configuration identity to the state", () => {
    const controller = new LayerController(LAYERS);
    controller.isolate("outer");
    controller.applyLayers(OTHER_LAYERS);
    expect(Object.keys(controller.getState())).toEqual(["layers"]);
    controller.isolate("core");
    expect(Object.keys(controller.getState()).sort()).toEqual(["isolatedLayerId", "layers"]);
    expect(Object.keys(controller.getState().layers[0]!).sort()).toEqual([
      "layerId",
      "transparent",
      "visible",
    ]);
    expect(Object.getOwnPropertyNames(LayerController.prototype).sort()).toEqual([
      "applyLayers",
      "clearIsolation",
      "constructor",
      "getState",
      "isolate",
      "reset",
      "setTransparent",
      "setVisibility",
    ]);
  });
});

describe("LayerController immutability", () => {
  it("keeps earlier snapshots unchanged after later operations", () => {
    const controller = new LayerController(LAYERS);
    const before = controller.getState();

    controller.setVisibility("outer", false);
    controller.setTransparent("middle", true);
    controller.isolate("inner");

    expect(before).toEqual(INITIAL);
  });

  it("does not let consumers mutate the returned array or layer objects", () => {
    const controller = new LayerController(LAYERS);
    const state = controller.getState();

    expect(() => (state.layers as unknown[]).push({})).toThrow(TypeError);
    expect(() => (state.layers as unknown[]).reverse()).toThrow(TypeError);
    expect(() => {
      (state.layers[0] as { visible: boolean }).visible = false;
    }).toThrow(TypeError);
    expect(() => {
      (state as { isolatedLayerId?: string }).isolatedLayerId = "outer";
    }).toThrow(TypeError);

    expect(controller.getState()).toEqual(INITIAL);
  });

  it("is not affected by later changes to the constructor input", () => {
    const input = LAYERS.map((layer) => ({ ...layer }));
    const controller = new LayerController(input);

    input.reverse();
    input.push({ id: "late", label: "Tardia" });
    input[0]!.id = "renamed";

    expect(controller.getState()).toEqual(INITIAL);
    expect(() => controller.setVisibility("late", false)).toThrow(UnknownVisualLayerError);
    expect(() => controller.setVisibility("renamed", false)).toThrow(UnknownVisualLayerError);
    controller.setVisibility("inner", false);
    expect(layerOf(controller, "inner")?.visible).toBe(false);
  });
});

describe("layers module boundaries", () => {
  const directory = fileURLToPath(new URL(".", import.meta.url));
  const sources = readdirSync(directory)
    .filter((file) => file.endsWith(".ts") && !file.endsWith(".test.ts"))
    .map((file) => ({ file, source: readFileSync(`${directory}${file}`, "utf8") }));
  const specifiers = (source: string) =>
    [...source.matchAll(/from\s*["']([^"']+)["']/g)].flatMap((match) => match[1] ?? []);
  const code = (source: string) => source.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");

  it("finds the implementation files to inspect", () => {
    expect(sources.map(({ file }) => file).sort()).toEqual(["layer-controller.ts", "layer-state.ts"]);
  });

  it("depends only on the VisualLayer type", () => {
    const allowed = new Set(["@/experience/scenes/scene-definition", "./layer-state"]);
    for (const { file, source } of sources) {
      expect(specifiers(source).filter((s) => !allowed.has(s)), file).toEqual([]);
      expect(source, file).not.toMatch(/import\s+\{[^}]*\}\s+from\s+["']@\/experience\/scenes/);
    }
  });

  it("does not reference the dataset, frameworks, DOM, WebGL, other controllers or capabilities", () => {
    const forbidden =
      /\b(mvpBiologicalNodes|THREE|React|window|document|WebGL\w*|HTMLCanvasElement|SceneRegistry|ExperienceController|SceneCapability|capabilities|opacity|sceneId|nodeId|configurationId|version)\b/;
    for (const { file, source } of sources) {
      expect(code(source), file).not.toMatch(forbidden);
    }
  });
});
