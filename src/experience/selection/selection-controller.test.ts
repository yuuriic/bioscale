import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { createBiologicalGraph } from "@/biology/graph/biological-graph";
import type { BiologicalNode } from "@/biology/graph/biological-node";
import { UnknownBiologicalNodeError } from "@/biology/graph/unknown-biological-node-error";
import { SelectionController } from "./selection-controller";

// Grafo estrutural neutro: não representa dados científicos.
function node(id: string): BiologicalNode {
  return { id, name: id, domain: "cellular", type: "cell", relations: [] };
}

const graph = createBiologicalGraph([node("a"), node("b")]);

describe("SelectionController", () => {
  it("starts without a selection", () => {
    const selection = new SelectionController(graph);
    expect(selection.getState()).toEqual({});
    expect(selection.getState().selectedNodeId).toBeUndefined();
  });

  it("selects an existing node, keeping only its id", () => {
    const selection = new SelectionController(graph);
    selection.select("a");
    expect(selection.getState()).toEqual({ selectedNodeId: "a" });
    expect(Object.keys(selection.getState())).toEqual(["selectedNodeId"]);
  });

  it("replaces the previous selection", () => {
    const selection = new SelectionController(graph);
    selection.select("a");
    selection.select("b");
    expect(selection.getState()).toEqual({ selectedNodeId: "b" });
  });

  it("is idempotent when selecting the selected node again", () => {
    const selection = new SelectionController(graph);
    selection.select("a");
    const before = selection.getState();

    selection.select("a");

    expect(selection.getState()).toBe(before);
  });

  it("rejects an unknown node and keeps the current selection", () => {
    const selection = new SelectionController(graph);
    selection.select("a");
    const before = selection.getState();

    let error: unknown;
    try {
      selection.select("missing");
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(UnknownBiologicalNodeError);
    expect((error as UnknownBiologicalNodeError).nodeId).toBe("missing");
    expect(selection.getState()).toBe(before);
  });

  it("clears the selection", () => {
    const selection = new SelectionController(graph);
    selection.select("a");
    selection.clearSelection();
    expect(selection.getState()).toEqual({});
    expect("selectedNodeId" in selection.getState()).toBe(false);
  });

  it("is idempotent when clearing without a selection", () => {
    const selection = new SelectionController(graph);
    const before = selection.getState();

    expect(() => selection.clearSelection()).not.toThrow();
    expect(selection.getState()).toBe(before);
  });

  it("keeps an earlier snapshot stable after select", () => {
    const selection = new SelectionController(graph);
    selection.select("a");
    const before = selection.getState();

    selection.select("b");

    expect(before).toEqual({ selectedNodeId: "a" });
  });

  it("keeps an earlier snapshot stable after clear", () => {
    const selection = new SelectionController(graph);
    selection.select("a");
    const before = selection.getState();

    selection.clearSelection();

    expect(before).toEqual({ selectedNodeId: "a" });
  });

  it("does not let consumers corrupt the returned state", () => {
    const selection = new SelectionController(graph);
    expect(() => {
      (selection.getState() as { selectedNodeId?: string }).selectedNodeId = "b";
    }).toThrow(TypeError);

    selection.select("a");
    expect(() => {
      (selection.getState() as { selectedNodeId?: string }).selectedNodeId = "b";
    }).toThrow(TypeError);
    expect(selection.getState()).toEqual({ selectedNodeId: "a" });
  });
});

describe("selection module boundaries", () => {
  const directory = fileURLToPath(new URL(".", import.meta.url));
  const sources = readdirSync(directory)
    .filter((file) => file.endsWith(".ts") && !file.endsWith(".test.ts"))
    .map((file) => ({ file, source: readFileSync(`${directory}${file}`, "utf8") }));
  const specifiers = (source: string) =>
    [...source.matchAll(/from\s*["']([^"']+)["']/g)].flatMap((match) => match[1] ?? []);

  it("finds the implementation files to inspect", () => {
    expect(sources.map(({ file }) => file).sort()).toEqual([
      "selection-controller.ts",
      "selection-state.ts",
    ]);
  });

  it("depends only on the biological graph contracts", () => {
    const allowed = new Set([
      "@/biology/graph/biological-graph",
      "@/biology/graph/unknown-biological-node-error",
      "./selection-state",
    ]);
    for (const { file, source } of sources) {
      expect(specifiers(source).filter((s) => !allowed.has(s)), file).toEqual([]);
    }
  });

  it("does not reference the MVP dataset, other controllers, Three.js, DOM or WebGL", () => {
    const forbidden =
      /\b(mvpBiologicalNodes|NavigationController|SceneRegistry|CameraController|THREE|window|document|WebGL\w*|HTMLCanvasElement)\b/;
    for (const { file, source } of sources) {
      const code = source.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
      expect(code, file).not.toMatch(forbidden);
    }
  });
});
