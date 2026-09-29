import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createElement, type ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { mvpBiologicalNodes } from "@/content/nodes/mvp-nodes";
import { DEFAULT_FIELD_OF_VIEW } from "@/experience/camera/camera-controller";
import type { ExperienceRuntime } from "@/experience/engine/create-experience";
import { SceneNotAvailableError } from "@/experience/engine/experience-controller";
import type { SceneRegistry } from "@/experience/scenes/scene-registry";
import { createApplicationExperience, INITIAL_NODE_ID } from "./experience-config";
import {
  ExperienceRuntimeProvider,
  useExperienceRuntime,
  useExperienceScenes,
} from "./experience-runtime-provider";

// Composição React ↔ Experience Engine (ARCHITECTURE.md §17.2). Sem DOM nem
// WebGL: o Provider e o hook são exercitados por renderização no servidor.
const SRC = fileURLToPath(new URL("..", import.meta.url));

function sourceFiles(directory: string): string[] {
  return readdirSync(`${SRC}${directory}`, { recursive: true, encoding: "utf8" })
    .filter((file) => /\.tsx?$/.test(file))
    .map((file) => `${directory}/${file.replaceAll("\\", "/")}`);
}

const read = (file: string) => readFileSync(`${SRC}${file}`, "utf8");

const importsOf = (file: string) =>
  [...read(file).matchAll(/(?:from|import)\s*["']([^"']+)["']/g)].flatMap((m) => m[1] ?? []);

/** Renderiza consumidores do hook e devolve os runtimes que eles receberam. */
function renderConsumers(count: number, wrap: (children: ReactNode) => ReactNode) {
  const received: ExperienceRuntime[] = [];
  function Consumer() {
    received.push(useExperienceRuntime());
    return null;
  }
  const consumers = Array.from({ length: count }, (_, key) => createElement(Consumer, { key }));
  renderToString(wrap(consumers));
  return received;
}

const withProvider = (children: ReactNode) =>
  createElement(ExperienceRuntimeProvider, null, children);

describe("createApplicationExperience", () => {
  it("returns a frozen composition with only the runtime and the scenes", () => {
    const composition = createApplicationExperience();
    expect(Object.keys(composition).sort()).toEqual(["runtime", "scenes"]);
    expect(Object.isFrozen(composition)).toBe(true);
  });

  it("starts at the initial node with empty history, selection and layers", () => {
    const { runtime } = createApplicationExperience();

    expect(INITIAL_NODE_ID).toBe("human");
    expect(runtime.navigation.getState()).toEqual({
      currentNode: "human",
      history: [],
      mode: "guided",
    });
    expect(runtime.selection.getState()).toEqual({});
    expect(runtime.camera.getState()).toEqual({
      position: [0, 0, 5],
      target: [0, 0, 0],
      fieldOfView: DEFAULT_FIELD_OF_VIEW,
    });
    expect(runtime.layers.getState()).toEqual({ layers: [] });
  });

  it("creates an independent runtime on every call", () => {
    const first = createApplicationExperience();
    const second = createApplicationExperience();

    expect(second).not.toBe(first);
    expect(second.runtime).not.toBe(first.runtime);
    expect(second.scenes).not.toBe(first.scenes);
    first.runtime.selection.select("brain");
    expect(second.runtime.selection.getState()).toEqual({});
  });

  it("exposes the scene of the initial node, always as the same frozen reference", () => {
    const { scenes } = createApplicationExperience();
    const scene = scenes.getScene(INITIAL_NODE_ID);

    expect(scene?.nodeId).toBe("human");
    expect(scenes.getScene(INITIAL_NODE_ID)).toBe(scene);
    expect(Object.isFrozen(scene)).toBe(true);
    expect(scenes.scenes.filter((candidate) => candidate.nodeId === "human")).toEqual([scene]);
  });

  it("keeps the runtime camera and layers coherent with the exposed initial scene", () => {
    const { runtime, scenes } = createApplicationExperience();
    const scene = scenes.getScene(INITIAL_NODE_ID);

    expect(runtime.camera.getState()).toEqual({
      ...scene?.camera,
      fieldOfView: scene?.camera.fieldOfView ?? DEFAULT_FIELD_OF_VIEW,
    });
    expect(runtime.layers.getState().layers.map((layer) => layer.layerId)).toEqual(
      scene?.layers.map((layer) => layer.id),
    );
  });
});

describe("createApplicationExperience scene authority", () => {
  it("lets the ExperienceController enter exactly the nodes the exposed scenes resolve", () => {
    for (const { id } of mvpBiologicalNodes) {
      const { runtime, scenes } = createApplicationExperience();
      if (scenes.getScene(id) === undefined) {
        expect(() => runtime.experience.enter(id), id).toThrow(SceneNotAvailableError);
      } else {
        expect(() => runtime.experience.enter(id), id).not.toThrow();
      }
    }
  });

  it("passes the same registry variable to the Engine and to the composition", () => {
    const body = read("app/experience-config.ts").split("export function createApplicationExperience")[1];
    expect(body?.match(/createSceneRegistry\(/g)).toHaveLength(1);
    expect(body).toMatch(/const scenes = createSceneRegistry\(/);
    expect(body).toMatch(/createExperience\(\{ graph, scenes, initialNodeId: INITIAL_NODE_ID \}\)/);
    expect(body).toMatch(/return Object\.freeze\(\{ runtime, scenes \}\);/);
  });
});

describe("ExperienceRuntimeProvider and useExperienceRuntime", () => {
  it("provides one runtime instance to every descendant", () => {
    const received = renderConsumers(3, withProvider);

    expect(received).toHaveLength(3);
    expect(new Set(received).size).toBe(1);
    expect(received[0]?.navigation.getState().currentNode).toBe("human");
  });

  it("creates a separate runtime for each Provider mount, not a module singleton", () => {
    const [first] = renderConsumers(1, withProvider);
    const [second] = renderConsumers(1, withProvider);
    expect(second).not.toBe(first);
  });

  it("throws a clear error outside the Provider", () => {
    expect(() => renderConsumers(1, (children) => children)).toThrow(
      "useExperienceRuntime must be used within an ExperienceRuntimeProvider.",
    );
  });

  it("keeps the composition in lazy useState, which preserves identity across renders", () => {
    // Re-render real exige DOM, indisponível no Vitest atual: a garantia é a
    // semântica de estado do React, verificada estruturalmente.
    const source = read("app/experience-runtime-provider.tsx");
    expect(source).toMatch(/const \[experience\] = useState\(createApplicationExperience\);/);
    expect(source).not.toMatch(/\buseMemo\b|\buseRef\b|\buseEffect\b/);
  });
});

describe("useExperienceScenes", () => {
  /** Renderiza consumidores que leem runtime e cenas do mesmo Provider. */
  function renderBoth(count: number) {
    const received: { runtime: ExperienceRuntime; scenes: SceneRegistry }[] = [];
    function Consumer() {
      received.push({ runtime: useExperienceRuntime(), scenes: useExperienceScenes() });
      return null;
    }
    renderToString(
      withProvider(Array.from({ length: count }, (_, key) => createElement(Consumer, { key }))),
    );
    return received;
  }

  it("provides the scenes of the same composition as the runtime", () => {
    const received = renderBoth(2);
    const [first, second] = received;

    expect(second?.runtime).toBe(first?.runtime);
    expect(second?.scenes).toBe(first?.scenes);
    expect(first?.scenes.getScene("human")).toBe(second?.scenes.getScene("human"));
    expect(first?.runtime.navigation.getState().currentNode).toBe("human");
    // Autoridade única: o Engine recusa exatamente os nós sem cena nesse registry.
    expect(first?.scenes.getScene("brain")).toBeUndefined();
    expect(() => first?.runtime.experience.enter("brain")).toThrow(SceneNotAvailableError);
  });

  it("gives each Provider mount its own scenes and runtime", () => {
    const [first] = renderBoth(1);
    const [second] = renderBoth(1);
    expect(second?.scenes).not.toBe(first?.scenes);
    expect(second?.runtime).not.toBe(first?.runtime);
  });

  it("throws a clear error outside the Provider", () => {
    function Orphan() {
      useExperienceScenes();
      return null;
    }
    expect(() => renderToString(createElement(Orphan))).toThrow(
      "useExperienceScenes must be used within an ExperienceRuntimeProvider.",
    );
  });
});

describe("client composition boundaries", () => {
  it("places the Provider in the app composition layer", () => {
    expect(sourceFiles("app")).toContain("app/experience-runtime-provider.tsx");
    for (const layer of ["experience", "rendering"]) {
      expect(sourceFiles(layer).some((file) => file.includes("provider")), layer).toBe(false);
    }
  });

  it("keeps the Experience Engine free of React, Next, app and rendering", () => {
    for (const file of sourceFiles("experience")) {
      const forbidden = importsOf(file).filter((specifier) =>
        /^(react|react-dom|next)(\/.*)?$|^@\/(app|rendering)(\/|$)/.test(specifier),
      );
      expect(forbidden, file).toEqual([]);
    }
  });

  it("keeps rendering from importing app or creating the runtime", () => {
    for (const file of sourceFiles("rendering").filter((f) => !f.endsWith(".test.ts"))) {
      expect(importsOf(file).filter((s) => s.startsWith("@/app")), file).toEqual([]);
      expect(read(file), file).not.toMatch(/\bcreate(Application)?Experience\b/);
    }
  });

  it("creates runtimes only inside functions, never at module scope", () => {
    for (const file of ["app/experience-config.ts", "app/experience-runtime-provider.tsx"]) {
      expect(read(file), file).not.toMatch(/^(export\s+)?(const|let|var)\s+\w+\s*=\s*create\w*Experience\(/m);
    }
  });

  it("transports the composition in a single Context, never a snapshot, store or subscription", () => {
    const file = "app/experience-runtime-provider.tsx";
    expect(importsOf(file).sort()).toEqual([
      "./experience-config",
      "@/experience/engine/create-experience",
      "@/experience/scenes/scene-registry",
      "react",
    ]);
    expect(read(file)).toMatch(/createContext<ApplicationExperience \| null>/);
    expect(read(file)).not.toMatch(/useSyncExternalStore|useReducer|getExperienceSnapshot/);
  });

  it("has a single Context and a single Provider in the application layer", () => {
    const appSources = sourceFiles("app").filter((file) => !file.endsWith(".test.ts"));
    const contexts = appSources.flatMap((file) => [...read(file).matchAll(/\bcreateContext\b\s*[<(]/g)]);
    const providers = appSources.flatMap((file) =>
      [...read(file).matchAll(/export function (\w*Provider)\b/g)].map((match) => match[1]),
    );
    expect(contexts).toHaveLength(1);
    expect(providers).toEqual(["ExperienceRuntimeProvider"]);
  });

  it("keeps scenes out of the rendering layer and the runtime", () => {
    for (const file of sourceFiles("rendering").filter((f) => !f.endsWith(".test.ts"))) {
      expect(importsOf(file).filter((s) => s.includes("scene-registry")), file).toEqual([]);
      expect(read(file), file).not.toMatch(/\buseExperienceScenes\b|\bSceneRegistry\b/);
    }
    const { runtime } = createApplicationExperience();
    expect(Object.keys(runtime).sort()).toEqual([
      "camera",
      "experience",
      "layers",
      "navigation",
      "selection",
      "subscribe",
    ]);
  });

  it("mounts the rendering bridge and the DOM content inside the Provider in the root layout", () => {
    expect(read("app/layout.tsx")).toMatch(
      /<ExperienceRuntimeProvider>[\s\S]*<ExperienceRenderingBridge \/>[\s\S]*\{children\}[\s\S]*<\/ExperienceRuntimeProvider>/,
    );
  });

  it("keeps layout and page as Server Components", () => {
    for (const file of ["app/layout.tsx", "app/page.tsx"]) {
      expect(read(file), file).not.toMatch(/^\s*["']use client["']/m);
    }
  });

  it("adds no dependencies beyond the rendering foundation", () => {
    const { dependencies } = JSON.parse(read("../package.json")) as {
      dependencies: Record<string, string>;
    };
    expect(Object.keys(dependencies).sort()).toEqual([
      "@react-three/fiber",
      "next",
      "react",
      "react-dom",
      "three",
    ]);
  });
});
