import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createElement, type ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DEFAULT_FIELD_OF_VIEW } from "@/experience/camera/camera-controller";
import type { ExperienceRuntime } from "@/experience/engine/create-experience";
import { createApplicationExperience, INITIAL_NODE_ID } from "./experience-config";
import { ExperienceRuntimeProvider, useExperienceRuntime } from "./experience-runtime-provider";

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
  it("starts at the initial node with empty history, selection and layers", () => {
    const runtime = createApplicationExperience();

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
    first.selection.select("brain");
    expect(second.selection.getState()).toEqual({});
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

  it("keeps the runtime in lazy useState, which preserves identity across renders", () => {
    // Re-render real exige DOM, indisponível no Vitest atual: a garantia é a
    // semântica de estado do React, verificada estruturalmente.
    const source = read("app/experience-runtime-provider.tsx");
    expect(source).toMatch(/const \[runtime\] = useState\(createApplicationExperience\);/);
    expect(source).not.toMatch(/\buseMemo\b|\buseRef\b/);
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

  it("transports the runtime in Context, never a snapshot, store or subscription", () => {
    const file = "app/experience-runtime-provider.tsx";
    expect(importsOf(file).sort()).toEqual([
      "./experience-config",
      "@/experience/engine/create-experience",
      "react",
    ]);
    expect(read(file)).toMatch(/createContext<ExperienceRuntime \| null>/);
    expect(read(file)).not.toMatch(/useSyncExternalStore|useReducer|getExperienceSnapshot/);
  });

  it("mounts the ExperienceCanvas inside the Provider in the root layout", () => {
    expect(read("app/layout.tsx")).toMatch(
      /<ExperienceRuntimeProvider>[\s\S]*<ExperienceCanvas \/>[\s\S]*<\/ExperienceRuntimeProvider>/,
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
