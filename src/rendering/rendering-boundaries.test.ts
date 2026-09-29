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
      expect(read(file), file).not.toMatch(/\buse(ExperienceSnapshot|ExperienceRuntime)\b/);
    }
  });

  it("depends on the Experience Engine only through the layer state type", () => {
    const engineImports = sourceFiles("rendering")
      .filter((file) => !file.endsWith(".test.ts"))
      .flatMap((file) => importsOf(file).filter((s) => s.startsWith("@/experience")));
    expect([...new Set(engineImports)]).toEqual(["@/experience/layers/layer-state"]);
    for (const file of sourceFiles("rendering").filter((f) => !f.endsWith(".test.ts"))) {
      expect(read(file), file).not.toMatch(/^import\s+(?!type\b).*["']@\/experience/m);
    }
  });

  it("receives only layers and keeps the camera technical, without navigation or selection", () => {
    const canvas = read("rendering/canvas/experience-canvas.tsx");
    expect(canvas).toMatch(
      /export interface ExperienceCanvasProps \{[^}]*readonly layers: LayerControllerState;\s*\}/,
    );
    expect(canvas).toMatch(/camera=\{\{ position: \[2\.5, 2, 3\.5\], fov: 50 \}\}/);
    for (const file of sourceFiles("rendering").filter((f) => !f.endsWith(".test.ts"))) {
      expect(read(file), file).not.toMatch(
        /\b(useFrame|navigation|selection|currentNode|selectedNodeId|CameraState|lookAt|ExperienceSnapshot|ExperienceRuntime)\b/,
      );
    }
  });

  it("keeps the rendering probe free of the engine, animation and asset loading", () => {
    const file = "rendering/debug/rendering-probe.tsx";
    expect(importsOf(file)).toEqual([]);
    expect(read(file)).not.toMatch(/\buseFrame\b|Loader\b|useLoader\b|\.(glb|gltf|png|jpe?g)\b/);
  });
});
