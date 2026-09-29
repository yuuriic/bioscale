import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { createBiologicalGraph } from "@/biology/graph/biological-graph";
import type { BiologicalNode } from "@/biology/graph/biological-node";
import { UnknownBiologicalNodeError } from "@/biology/graph/unknown-biological-node-error";
import { CameraController } from "@/experience/camera/camera-controller";
import { LayerController, UnknownVisualLayerError } from "@/experience/layers/layer-controller";
import type { LayerControllerState } from "@/experience/layers/layer-state";
import {
  InvalidBreadcrumbIndexError,
  NavigationController,
} from "@/experience/navigation/navigation-controller";
import type {
  CameraPreset,
  SceneDefinition,
  VisualLayer,
} from "@/experience/scenes/scene-definition";
import { createSceneRegistry } from "@/experience/scenes/scene-registry";
import { SelectionController } from "@/experience/selection/selection-controller";
import { ExperienceController, SceneNotAvailableError } from "./experience-controller";

// Grafo e cenas neutros: `a`, `b` e `c` possuem cena; `d` existe no grafo
// sem experiência visual.
function node(id: string): BiologicalNode {
  return { id, name: id, domain: "cellular", type: "cell", relations: [] };
}

const graph = createBiologicalGraph(["a", "b", "c", "d"].map(node));

const PRESET_A: CameraPreset = { position: [0, 0, 10], target: [0, 0, 0], fieldOfView: 40 };
const PRESET_B: CameraPreset = { position: [0, 5, 5], target: [0, 1, 0], fieldOfView: 30 };
const PRESET_C: CameraPreset = { position: [3, 0, 3], target: [0, 0, 0] };
const PRESET_C_STATE = { ...PRESET_C, fieldOfView: 50 };

// Layers neutras: `a` e `c` compartilham `outer`; `b` não possui nenhuma
// layer de `a`. `d` não tem cena.
const LAYERS: Readonly<Record<string, readonly VisualLayer[]>> = {
  a: [
    { id: "outer", label: "Externa" },
    { id: "inner", label: "Interna" },
  ],
  b: [
    { id: "frame", label: "Estrutura" },
    { id: "core", label: "Núcleo" },
  ],
  c: [
    { id: "outer", label: "Externa" },
    { id: "detail", label: "Detalhe" },
  ],
};

/** Estado inicial declarado das layers da cena do nó. */
function initialLayers(nodeId: string): LayerControllerState {
  return {
    layers: (LAYERS[nodeId] ?? []).map(({ id }) => ({
      layerId: id,
      visible: true,
      transparent: false,
    })),
  };
}

function scene(nodeId: string, camera: CameraPreset): SceneDefinition {
  return { nodeId, assets: [], camera, layers: LAYERS[nodeId] ?? [], capabilities: [] };
}

const scenes = createSceneRegistry(
  [scene("a", PRESET_A), scene("b", PRESET_B), scene("c", PRESET_C)],
  graph,
);

/**
 * Composição manual, para testar a coordenação isoladamente: navegação em
 * `a`, seleção em `c`, câmera no preset A e layers de A. A composição da
 * aplicação usa `createExperience`.
 */
function compose() {
  const navigation = new NavigationController(graph, { defaultNodeId: "a" });
  const selection = new SelectionController(graph);
  const camera = new CameraController(PRESET_A);
  const layers = new LayerController(LAYERS.a ?? []);
  selection.select("c");
  const experience = new ExperienceController({ navigation, selection, camera, layers, scenes });
  return { navigation, selection, camera, layers, experience };
}

type Controllers = Omit<ReturnType<typeof compose>, "experience">;

function snapshot({ navigation, selection, camera, layers }: Controllers) {
  return {
    navigation: navigation.getState(),
    selection: selection.getState(),
    camera: camera.getState(),
    layers: layers.getState(),
  };
}

function expectUnchanged(controllers: Controllers, before: ReturnType<typeof snapshot>): void {
  const after = snapshot(controllers);
  expect(after.navigation).toBe(before.navigation);
  expect(after.selection).toBe(before.selection);
  expect(after.camera).toBe(before.camera);
  expect(after.layers).toBe(before.layers);
}

/** Altera visibilidade, transparência e isolamento de todas as layers atuais. */
function alterLayers(layers: LayerController): void {
  const [first, ...rest] = layers.getState().layers.map((layer) => layer.layerId);
  if (first === undefined) return;
  layers.setVisibility(first, false);
  layers.setTransparent(first, true);
  for (const layerId of rest) layers.setTransparent(layerId, true);
  layers.isolate(rest[0] ?? first);
}

describe("ExperienceController construction", () => {
  it("does not change any controller", () => {
    const navigation = new NavigationController(graph, { defaultNodeId: "a" });
    const selection = new SelectionController(graph);
    const camera = new CameraController(PRESET_A);
    const layers = new LayerController(LAYERS.b ?? []);
    selection.select("c");
    alterLayers(layers);
    const before = snapshot({ navigation, selection, camera, layers });

    new ExperienceController({ navigation, selection, camera, layers, scenes });

    expectUnchanged({ navigation, selection, camera, layers }, before);
  });
});

describe("ExperienceController.enter", () => {
  it("navigates, clears the selection and applies the scene camera", () => {
    const { navigation, selection, camera, experience } = compose();

    experience.enter("b");

    expect(navigation.getState().currentNode).toBe("b");
    expect(selection.getState()).toEqual({});
    expect(camera.getState()).toEqual(PRESET_B);
  });

  it("makes the scene camera the new reset base", () => {
    const { camera, experience } = compose();
    experience.enter("b");

    camera.setPosition([9, 9, 9]);
    camera.reset();

    expect(camera.getState()).toEqual(PRESET_B);
  });

  it("adds a step to the path when entering another node", () => {
    const { navigation, experience } = compose();

    experience.enter("b");
    experience.enter("a");

    expect(navigation.getBreadcrumbs()).toEqual(["a", "b", "a"]);
  });

  it("clears the selection even when it matches the destination", () => {
    const { selection, experience } = compose();
    selection.select("b");

    experience.enter("b");

    expect(selection.getState()).toEqual({});
  });

  it("follows the full flow from scene A to scene B", () => {
    const { navigation, selection, camera, experience } = compose();
    expect(navigation.getState().currentNode).toBe("a");
    expect(selection.getState()).toEqual({ selectedNodeId: "c" });
    expect(camera.getState()).toEqual(PRESET_A);

    experience.enter("b");

    expect(navigation.getState().currentNode).toBe("b");
    expect(selection.getState()).toEqual({});
    expect(camera.getState()).toEqual(PRESET_B);

    camera.setPosition([1, 2, 3]);
    camera.reset();
    expect(camera.getState()).toEqual(PRESET_B);
  });
});

describe("ExperienceController re-entering the current scene", () => {
  it("does not add a breadcrumb", () => {
    const { navigation, experience } = compose();
    const before = navigation.getState();

    experience.enter("a");

    expect(navigation.getState()).toBe(before);
    expect(navigation.getBreadcrumbs()).toEqual(["a"]);
  });

  it("clears the selection", () => {
    const { selection, experience } = compose();
    experience.enter("a");
    expect(selection.getState()).toEqual({});
  });

  it("reapplies the scene camera", () => {
    const { camera, experience } = compose();
    camera.setPosition([7, 7, 7]);
    camera.setFieldOfView(80);

    experience.enter("a");

    expect(camera.getState()).toEqual(PRESET_A);
  });
});

describe("ExperienceController without an available scene", () => {
  it.each([
    ["an existing node without a scene", "d"],
    ["an id that is not a node", "missing"],
  ])("fails for %s without changing any controller", (_, nodeId) => {
    const controllers = compose();
    alterLayers(controllers.layers);
    const before = snapshot(controllers);

    let error: unknown;
    try {
      controllers.experience.enter(nodeId);
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(SceneNotAvailableError);
    expect(error).not.toBeInstanceOf(UnknownBiologicalNodeError);
    expect((error as SceneNotAvailableError).nodeId).toBe(nodeId);
    expectUnchanged(controllers, before);
  });

  it("changes nothing when navigation rejects the node, since it is the first mutation", () => {
    // Registro validado contra outro grafo: a cena existe, mas o nó não
    // existe no grafo da navegação.
    const otherGraph = createBiologicalGraph(["a", "z"].map(node));
    const otherScenes = createSceneRegistry([scene("z", PRESET_B)], otherGraph);
    const navigation = new NavigationController(graph, { defaultNodeId: "a" });
    const selection = new SelectionController(graph);
    const camera = new CameraController(PRESET_A);
    const layers = new LayerController(LAYERS.a ?? []);
    selection.select("c");
    alterLayers(layers);
    const controllers = {
      navigation,
      selection,
      camera,
      layers,
      experience: new ExperienceController({
        navigation,
        selection,
        camera,
        layers,
        scenes: otherScenes,
      }),
    };
    const before = snapshot(controllers);

    expect(() => controllers.experience.enter("z")).toThrow(UnknownBiologicalNodeError);
    expectUnchanged(controllers, before);
  });
});

/**
 * Estado esperado após uma mudança de cena: nó, sem seleção, câmera da cena e
 * layers da cena em estado inicial.
 */
function expectInScene(
  { navigation, selection, camera, layers }: Controllers,
  nodeId: string,
  cameraState: object,
): void {
  expect(navigation.getState().currentNode).toBe(nodeId);
  expect(selection.getState()).toEqual({});
  expect(camera.getState()).toEqual(cameraState);
  expect(layers.getState()).toEqual(initialLayers(nodeId));
}

describe("ExperienceController.back", () => {
  function atC() {
    const controllers = compose();
    controllers.experience.enter("b");
    controllers.experience.enter("c");
    controllers.selection.select("d");
    controllers.camera.setPosition([9, 9, 9]);
    return controllers;
  }

  it("goes back one step, clears the selection and applies the previous scene camera", () => {
    const controllers = atC();

    controllers.experience.back();

    expectInScene(controllers, "b", PRESET_B);
    expect(controllers.navigation.getBreadcrumbs()).toEqual(["a", "b"]);
  });

  it("makes the previous scene camera the new reset base", () => {
    const { camera, experience } = atC();
    experience.back();

    camera.setPosition([1, 2, 3]);
    camera.reset();

    expect(camera.getState()).toEqual(PRESET_B);
  });

  it("is a complete no-op without history, keeping selection, camera and layers", () => {
    const controllers = compose();
    controllers.camera.setPosition([9, 9, 9]);
    alterLayers(controllers.layers);
    const before = snapshot(controllers);

    controllers.experience.back();

    expectUnchanged(controllers, before);
    expect(controllers.selection.getState()).toEqual({ selectedNodeId: "c" });
  });

  it("fails for a destination without a scene, without changing any controller", () => {
    // Percurso a → d → b criado diretamente pela navegação: `d` não tem cena.
    const controllers = compose();
    controllers.navigation.navigate("d");
    controllers.navigation.navigate("b");
    alterLayers(controllers.layers);
    const before = snapshot(controllers);

    let error: unknown;
    try {
      controllers.experience.back();
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(SceneNotAvailableError);
    expect((error as SceneNotAvailableError).nodeId).toBe("d");
    expectUnchanged(controllers, before);
  });
});

describe("ExperienceController.returnToBreadcrumb", () => {
  it("returns to an earlier position, clears the selection and applies its scene camera", () => {
    const controllers = compose();
    controllers.experience.enter("b");
    controllers.experience.enter("c");
    controllers.selection.select("d");

    controllers.experience.returnToBreadcrumb(1);

    expectInScene(controllers, "b", PRESET_B);
    expect(controllers.navigation.getBreadcrumbs()).toEqual(["a", "b"]);

    controllers.camera.setTarget([5, 5, 5]);
    controllers.camera.reset();
    expect(controllers.camera.getState()).toEqual(PRESET_B);
  });

  it("identifies the occurrence by position when a node repeats", () => {
    const first = compose();
    for (const id of ["b", "a", "c"]) first.experience.enter(id);
    first.experience.returnToBreadcrumb(0);
    expect(first.navigation.getState()).toEqual({ currentNode: "a", history: [], mode: "guided" });

    const second = compose();
    for (const id of ["b", "a", "c"]) second.experience.enter(id);
    second.experience.returnToBreadcrumb(2);
    expect(second.navigation.getState()).toEqual({
      currentNode: "a",
      history: ["a", "b"],
      mode: "guided",
    });
    expectInScene(second, "a", PRESET_A);
  });

  it("is a complete no-op for the current position, keeping selection, camera and layers", () => {
    const controllers = compose();
    controllers.experience.enter("b");
    controllers.selection.select("c");
    controllers.camera.setFieldOfView(80);
    alterLayers(controllers.layers);
    const before = snapshot(controllers);

    controllers.experience.returnToBreadcrumb(1);

    expectUnchanged(controllers, before);
    expect(controllers.selection.getState()).toEqual({ selectedNodeId: "c" });
  });

  it.each([
    ["negative", -1],
    ["past the last breadcrumb", 2],
    ["fractional", 0.5],
    ["NaN", Number.NaN],
    ["Infinity", Number.POSITIVE_INFINITY],
  ])("rejects a %s index without changing any controller", (_, index) => {
    const controllers = compose();
    controllers.experience.enter("b");
    controllers.selection.select("c");
    alterLayers(controllers.layers);
    const before = snapshot(controllers);

    let error: unknown;
    try {
      controllers.experience.returnToBreadcrumb(index);
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(InvalidBreadcrumbIndexError);
    expect((error as InvalidBreadcrumbIndexError).index).toBe(index);
    expectUnchanged(controllers, before);
  });

  it("fails for a valid position without a scene, without changing any controller", () => {
    const controllers = compose();
    controllers.navigation.navigate("d");
    controllers.navigation.navigate("b");
    alterLayers(controllers.layers);
    const before = snapshot(controllers);

    expect(() => controllers.experience.returnToBreadcrumb(1)).toThrow(SceneNotAvailableError);
    expectUnchanged(controllers, before);
  });
});

describe("ExperienceController re-entry and no-ops", () => {
  it("distinguishes enter(current) from back without history and the current breadcrumb", () => {
    const reentry = compose();
    reentry.camera.setPosition([9, 9, 9]);
    alterLayers(reentry.layers);
    reentry.experience.enter("a");
    expectInScene(reentry, "a", PRESET_A);

    const noOps = [
      (controllers: ReturnType<typeof compose>) => controllers.experience.back(),
      (controllers: ReturnType<typeof compose>) => controllers.experience.returnToBreadcrumb(0),
    ];
    for (const action of noOps) {
      const controllers = compose();
      controllers.camera.setPosition([9, 9, 9]);
      alterLayers(controllers.layers);
      const before = snapshot(controllers);
      action(controllers);
      expectUnchanged(controllers, before);
    }
  });
});

describe("ExperienceController and LayerController", () => {
  it("enter replaces the layer configuration with the scene layers in initial state", () => {
    const { layers, experience } = compose();
    alterLayers(layers);

    experience.enter("b");

    expect(layers.getState()).toEqual(initialLayers("b"));
    expect("isolatedLayerId" in layers.getState()).toBe(false);
  });

  it("forgets layers of the previous scene that the new scene does not declare", () => {
    const { layers, experience } = compose();
    experience.enter("b");
    expect(() => layers.setVisibility("outer", false)).toThrow(UnknownVisualLayerError);
    expect(() => layers.isolate("inner")).toThrow(UnknownVisualLayerError);
  });

  it("does not carry state for a layer id shared by the next scene", () => {
    const { layers, experience } = compose();
    alterLayers(layers);
    expect(layers.getState().layers[0]).toEqual({
      layerId: "outer",
      visible: false,
      transparent: true,
    });

    experience.enter("c");

    expect(layers.getState()).toEqual(initialLayers("c"));
  });

  it("re-entering the current scene reapplies its layers, discarding changes", () => {
    const { layers, experience } = compose();
    alterLayers(layers);
    const altered = layers.getState();

    experience.enter("a");

    expect(layers.getState()).toEqual(initialLayers("a"));
    expect(altered.isolatedLayerId).toBe("inner");
  });

  it("back applies the declared initial layers of the destination, not its previous state", () => {
    const { layers, experience } = compose();
    alterLayers(layers);
    experience.enter("b");

    experience.back();

    expect(layers.getState()).toEqual(initialLayers("a"));
  });

  it("returnToBreadcrumb applies the declared initial layers of the destination", () => {
    const { layers, experience } = compose();
    experience.enter("b");
    alterLayers(layers);
    experience.enter("c");

    experience.returnToBreadcrumb(1);

    expect(layers.getState()).toEqual(initialLayers("b"));
  });

  it("resolves the layers of the scene of the chosen breadcrumb occurrence", () => {
    const { layers, experience } = compose();
    for (const id of ["b", "a", "c"]) experience.enter(id);
    alterLayers(layers);

    experience.returnToBreadcrumb(2);

    expect(layers.getState()).toEqual(initialLayers("a"));
  });

  it("keeps earlier layer snapshots immutable across scene changes", () => {
    const { layers, experience } = compose();
    alterLayers(layers);
    const before = layers.getState();
    const beforeCopy = structuredClone(before);

    experience.enter("b");
    experience.back();

    expect(before).toEqual(beforeCopy);
    expect(Object.isFrozen(before)).toBe(true);
  });
});

describe("ExperienceController full flow", () => {
  it("keeps navigation, selection, camera and layers coherent across enter, back and breadcrumb", () => {
    const controllers = compose();
    const { experience, selection } = controllers;

    const { layers } = controllers;

    experience.enter("a");
    expectInScene(controllers, "a", PRESET_A);

    alterLayers(layers);
    selection.select("d");
    experience.enter("b");
    expectInScene(controllers, "b", PRESET_B);

    alterLayers(layers);
    selection.select("d");
    experience.enter("c");
    expectInScene(controllers, "c", PRESET_C_STATE);
    expect(controllers.navigation.getBreadcrumbs()).toEqual(["a", "b", "c"]);

    alterLayers(layers);
    selection.select("d");
    experience.back();
    expectInScene(controllers, "b", PRESET_B);
    expect(controllers.navigation.getBreadcrumbs()).toEqual(["a", "b"]);

    alterLayers(layers);
    selection.select("d");
    experience.returnToBreadcrumb(0);
    expectInScene(controllers, "a", PRESET_A);
    expect(controllers.navigation.getBreadcrumbs()).toEqual(["a"]);
  });
});

describe("ExperienceController and controller state", () => {
  it("keeps earlier controller snapshots immutable", () => {
    const controllers = compose();
    const before = snapshot(controllers);

    controllers.experience.enter("b");

    expect(before.navigation).toEqual({ currentNode: "a", history: [], mode: "guided" });
    expect(before.selection).toEqual({ selectedNodeId: "c" });
    expect(before.camera).toEqual(PRESET_A);
    expect(before.layers).toEqual(initialLayers("a"));
  });

  it("does not hold or expose a copy of the controllers' state", () => {
    const { experience } = compose();
    expect(Object.keys(experience)).toEqual([]);
    expect(Object.getOwnPropertyNames(ExperienceController.prototype).sort()).toEqual([
      "back",
      "constructor",
      "enter",
      "returnToBreadcrumb",
    ]);
  });

  it("leaves the controllers usable directly", () => {
    const { navigation, layers, experience } = compose();
    experience.enter("b");
    navigation.navigate("c");
    expect(navigation.getBreadcrumbs()).toEqual(["a", "b", "c"]);

    layers.applyLayers(LAYERS.c ?? []);
    layers.setVisibility("detail", false);
    expect(layers.getState().layers.map((layer) => layer.layerId)).toEqual(["outer", "detail"]);
  });
});

describe("engine module boundaries", () => {
  const directory = fileURLToPath(new URL(".", import.meta.url));
  const sources = readdirSync(directory)
    .filter((file) => file.endsWith(".ts") && !file.endsWith(".test.ts"))
    .map((file) => ({ file, source: readFileSync(`${directory}${file}`, "utf8") }))
    // create-experience.ts e experience-snapshot.ts têm fronteiras próprias.
    .filter(({ file }) => file === "experience-controller.ts");
  const specifiers = (source: string) =>
    [...source.matchAll(/from\s*["']([^"']+)["']/g)].flatMap((match) => match[1] ?? []);
  const code = (source: string) => source.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");

  it("finds the implementation files to inspect", () => {
    expect(sources.map(({ file }) => file)).toEqual(["experience-controller.ts"]);
    expect(readdirSync(directory).filter((file) => !file.endsWith(".test.ts")).sort()).toEqual([
      "create-experience.ts",
      "experience-controller.ts",
      "experience-snapshot.ts",
    ]);
  });

  it("depends only on the experience controllers and scene registry", () => {
    const allowed = new Set([
      "@/experience/camera/camera-controller",
      "@/experience/layers/layer-controller",
      "@/experience/navigation/navigation-controller",
      "@/experience/scenes/scene-definition",
      "@/experience/scenes/scene-registry",
      "@/experience/selection/selection-controller",
    ]);
    for (const { file, source } of sources) {
      expect(specifiers(source).filter((s) => !allowed.has(s)), file).toEqual([]);
    }
  });

  it("keeps no history, breadcrumbs or scene of its own", () => {
    const ownState = /#(history|breadcrumbs|currentScene\w*|previousScene\w*|state)\b|ExperienceState/;
    for (const { file, source } of sources) {
      expect(code(source), file).not.toMatch(ownState);
    }
  });

  it("is not imported by the navigation or layers modules, so there is no cycle", () => {
    for (const moduleName of ["navigation", "layers"]) {
      const moduleDirectory = fileURLToPath(new URL(`../${moduleName}/`, import.meta.url));
      for (const file of readdirSync(moduleDirectory)) {
        const source = readFileSync(`${moduleDirectory}${file}`, "utf8");
        expect(specifiers(source).filter((s) => s.includes("engine")), file).toEqual([]);
      }
    }
  });

  it("keeps no per-scene cache, layer history or capability policy", () => {
    const forbidden =
      /\b(Map|WeakMap|cache\w*|restore\w*|snapshot\w*|capabilities|SceneCapability|LayerState)\b/;
    for (const { file, source } of sources) {
      expect(code(source), file).not.toMatch(forbidden);
    }
  });

  it("does not reference the MVP dataset, Three.js, DOM or WebGL", () => {
    const forbidden = /\b(mvpBiologicalNodes|THREE|window|document|WebGL\w*|HTMLCanvasElement)\b/;
    for (const { file, source } of sources) {
      expect(code(source), file).not.toMatch(forbidden);
    }
  });

  it("does not implement an event bus or a transition controller", () => {
    const forbidden =
      /\b(subscribe|emit|dispatch|listener\w*|observer\w*|EventEmitter|on[A-Z]\w*|TransitionController)\b/;
    for (const { file, source } of sources) {
      expect(code(source), file).not.toMatch(forbidden);
      expect(specifiers(source).filter((s) => s.includes("transitions")), file).toEqual([]);
    }
  });
});
