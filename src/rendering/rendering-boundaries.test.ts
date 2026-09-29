import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Garantias estruturais da fundação de rendering (ARCHITECTURE.md §17).
// WebGL real não é testado aqui: não há ambiente gráfico no Vitest.
const SRC = fileURLToPath(new URL("..", import.meta.url));

function sourceFiles(directory: string): string[] {
  return readdirSync(`${SRC}${directory}`, { recursive: true, encoding: "utf8" })
    .filter((file) => /\.tsx?$/.test(file))
    .map((file) => file.replaceAll("\\", "/"))
    .map((file) => (directory === "" ? file : `${directory}/${file}`));
}

function read(file: string): string {
  return readFileSync(`${SRC}${file}`, "utf8");
}

function importsOf(file: string): string[] {
  return [...read(file).matchAll(/(?:from|import)\s*["']([^"']+)["']/g)].flatMap(
    (match) => match[1] ?? [],
  );
}

const RENDERING_LIBRARY = /^(three|@react-three\/.+)(\/.*)?$/;

describe("rendering layer boundaries", () => {
  it("keeps rendering libraries and the rendering layer out of the engine and the domain", () => {
    for (const directory of ["experience", "biology", "content", "types", "utils"]) {
      for (const file of sourceFiles(directory)) {
        const forbidden = importsOf(file).filter(
          (specifier) => RENDERING_LIBRARY.test(specifier) || specifier.startsWith("@/rendering"),
        );
        expect(forbidden, file).toEqual([]);
      }
    }
  });

  it("keeps rendering out of the DOM-free compilation", () => {
    const { include } = JSON.parse(read("../tsconfig.domain.json")) as { include: string[] };
    expect(include.filter((pattern) => pattern.includes("rendering"))).toEqual([]);
  });

  it("creates the R3F Canvas in a single place, inside the rendering layer", () => {
    const canvasCreators = sourceFiles("")
      .filter((file) => !file.endsWith(".test.ts"))
      .filter((file) => /<Canvas\b/.test(read(file)));
    expect(canvasCreators).toEqual(["rendering/canvas/experience-canvas.tsx"]);
  });

  it("mounts the ExperienceCanvas once, through the application bridge mounted in the layout", () => {
    const mountsOf = (component: string) =>
      sourceFiles("")
        .filter((file) => !file.endsWith(".test.ts"))
        .flatMap((file) =>
          [...read(file).matchAll(new RegExp(`<${component}\\b`, "g"))].map(() => file),
        );
    expect(mountsOf("ExperienceCanvas")).toEqual(["app/experience-rendering-bridge.tsx"]);
    expect(mountsOf("ExperienceRenderingBridge")).toEqual(["app/layout.tsx"]);
  });

  it("never imports the application layer", () => {
    for (const file of sourceFiles("rendering")) {
      expect(importsOf(file).filter((s) => s.startsWith("@/app")), file).toEqual([]);
      expect(read(file), file).not.toMatch(
        /\buse(ExperienceSnapshot|ExperienceRuntime|ExperienceScenes)\b/,
      );
    }
  });

  it("depends on the Experience Engine only through the layer state and scene definition types", () => {
    const productionFiles = sourceFiles("rendering").filter((file) => !file.endsWith(".test.ts"));
    const engineImports = productionFiles.flatMap((file) =>
      importsOf(file).filter((s) => s.startsWith("@/experience") || s.startsWith("@/biology")),
    );
    expect([...new Set(engineImports)].sort()).toEqual([
      "@/experience/layers/layer-state",
      "@/experience/scenes/scene-definition",
    ]);
    for (const file of productionFiles) {
      expect(read(file), file).not.toMatch(/^import\s+(?!type\b).*["']@\/experience/m);
      expect(read(file), file).not.toMatch(
        /\b(SceneRegistry|BiologicalGraph|NavigationController|ApplicationExperience)\b/,
      );
    }
  });

  it("receives only the active scene and the layers, keeping the camera technical", () => {
    const canvas = read("rendering/canvas/experience-canvas.tsx");
    const props = canvas.match(/export interface ExperienceCanvasProps \{([^}]*)\}/)?.[1] ?? "";
    expect([...props.matchAll(/readonly (\w+):/g)].map((m) => m[1])).toEqual(["scene", "layers"]);
    expect(props).toMatch(/readonly scene: SceneDefinition \| undefined;/);
    expect(props).toMatch(/readonly layers: LayerControllerState;/);
    expect(canvas).toMatch(/camera=\{\{ position: \[2\.5, 2, 3\.5\], fov: 50 \}\}/);
    for (const file of sourceFiles("rendering").filter((f) => !f.endsWith(".test.ts"))) {
      expect(read(file), file).not.toMatch(
        /\b(useFrame|navigation|selection|currentNode|selectedNodeId|CameraState|lookAt|ExperienceSnapshot|ExperienceRuntime)\b/,
      );
    }
  });

  it("mounts the probe and the SceneManager inside the Canvas, leaving layer groups to the SceneManager", () => {
    const canvas = read("rendering/canvas/experience-canvas.tsx");
    const inside = canvas.match(/<Canvas[^>]*>([\s\S]*)<\/Canvas>/)?.[1] ?? "";
    expect(inside).toMatch(/<RenderingProbe \/>/);
    expect(inside).toMatch(/<SceneManager scene=\{scene\} layers=\{layers\} \/>/);
    expect(canvas).not.toMatch(/<LayerGroups\b/);
    expect(read("rendering/scenes/scene-manager.tsx")).toMatch(/<LayerGroups layers=\{layers\} \/>/);
  });

  it("keeps the SceneManager structural: no camera, assets, capabilities or invented content", () => {
    const manager = read("rendering/scenes/scene-manager.tsx");
    expect(manager).not.toMatch(
      /\b(useThree|useFrame|useLoader|Suspense|mesh|Material|Geometry|lookAt|scene\.camera|scene\.assets|scene\.capabilities)\b/,
    );
    expect(manager).not.toMatch(/RenderingProbe/);
  });

  it("keeps the rendering probe free of the engine, animation and asset loading", () => {
    const file = "rendering/debug/rendering-probe.tsx";
    expect(importsOf(file)).toEqual([]);
    expect(read(file)).not.toMatch(/\buseFrame\b|Loader\b|useLoader\b|\.(glb|gltf|png|jpe?g)\b/);
  });
});
