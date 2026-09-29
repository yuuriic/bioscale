import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createElement, Fragment } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createBiologicalGraph } from "@/biology/graph/biological-graph";
import type { BiologicalNode } from "@/biology/graph/biological-node";
import { DEFAULT_FIELD_OF_VIEW } from "@/experience/camera/camera-controller";
import { createExperience } from "@/experience/engine/create-experience";
import { getExperienceSnapshot } from "@/experience/engine/experience-snapshot";
import { createSceneRegistry } from "@/experience/scenes/scene-registry";
import { createApplicationExperience } from "./experience-config";
import { ExperienceRuntimeProvider } from "./experience-runtime-provider";
import { createExperienceSnapshotReader } from "./experience-snapshot-reader";
import { useExperienceSnapshot } from "./use-experience-snapshot";

// Ponte React ↔ Experience Engine (ARCHITECTURE.md §17.3). Sem DOM: o reader é
// testado diretamente e o hook por renderização no servidor.
const read = (file: string) =>
  readFileSync(fileURLToPath(new URL(file, import.meta.url)), "utf8");

// Runtime neutro com layers, para cobrir mudanças de layers.
function node(id: string): BiologicalNode {
  return { id, name: id, domain: "cellular", type: "cell", relations: [] };
}
const graph = createBiologicalGraph(["a", "b"].map(node));
const scenes = createSceneRegistry(
  [
    {
      nodeId: "a",
      assets: [],
      camera: { position: [0, 0, 10], target: [0, 0, 0] },
      layers: [{ id: "outer", label: "outer" }],
      capabilities: [],
    },
    {
      nodeId: "b",
      assets: [],
      camera: { position: [0, 5, 5], target: [0, 0, 0] },
      layers: [],
      capabilities: [],
    },
  ],
  graph,
);
const createNeutralRuntime = () => createExperience({ graph, scenes, initialNodeId: "a" });

describe("createExperienceSnapshotReader", () => {
  it("keeps the same snapshot until a part changes, and only the changed part is new", () => {
    const runtime = createApplicationExperience();
    const reader = createExperienceSnapshotReader(runtime);

    const first = reader.getSnapshot();
    const second = reader.getSnapshot();
    expect(second).toBe(first);

    runtime.selection.select("brain");

    const third = reader.getSnapshot();
    expect(third).not.toBe(first);
    expect(third.selection).not.toBe(first.selection);
    expect(third.camera).toBe(first.camera);
    expect(third.navigation).toBe(first.navigation);
    expect(third.layers).toBe(first.layers);

    const fourth = reader.getSnapshot();
    expect(fourth).toBe(third);
  });

  it("returns a complete ExperienceSnapshot while the pure function stays uncached", () => {
    const runtime = createApplicationExperience();
    const reader = createExperienceSnapshotReader(runtime);

    expect(Object.keys(reader.getSnapshot()).sort()).toEqual([
      "camera",
      "layers",
      "navigation",
      "selection",
    ]);
    expect(getExperienceSnapshot(runtime)).not.toBe(getExperienceSnapshot(runtime));
  });

  it.each([
    ["navigation", (r: ReturnType<typeof createNeutralRuntime>) => r.navigation.navigate("b")],
    ["selection", (r: ReturnType<typeof createNeutralRuntime>) => r.selection.select("b")],
    ["camera", (r: ReturnType<typeof createNeutralRuntime>) => r.camera.setPosition([1, 2, 3])],
    ["layers", (r: ReturnType<typeof createNeutralRuntime>) => r.layers.setVisibility("outer", false)],
    [
      "layers (applyLayers, always a new configuration)",
      (r: ReturnType<typeof createNeutralRuntime>) =>
        r.layers.applyLayers([{ id: "outer", label: "outer" }]),
    ],
  ])("invalidates when %s changes", (_, change) => {
    const runtime = createNeutralRuntime();
    const reader = createExperienceSnapshotReader(runtime);
    const before = reader.getSnapshot();

    change(runtime);

    expect(reader.getSnapshot()).not.toBe(before);
  });

  it.each([
    ["navigation", (r: ReturnType<typeof createNeutralRuntime>) => r.navigation.navigate("a")],
    ["selection", (r: ReturnType<typeof createNeutralRuntime>) => r.selection.clearSelection()],
    ["camera", (r: ReturnType<typeof createNeutralRuntime>) => r.camera.setPosition([0, 0, 10])],
    ["layers", (r: ReturnType<typeof createNeutralRuntime>) => r.layers.setVisibility("outer", true)],
  ])("keeps the snapshot on a %s no-op", (_, noOp) => {
    const runtime = createNeutralRuntime();
    const reader = createExperienceSnapshotReader(runtime);
    const before = reader.getSnapshot();

    noOp(runtime);

    expect(reader.getSnapshot()).toBe(before);
  });

  it("leaves earlier snapshots intact", () => {
    const runtime = createNeutralRuntime();
    const reader = createExperienceSnapshotReader(runtime);
    const before = reader.getSnapshot();

    runtime.experience.enter("b");

    expect(before.navigation.currentNode).toBe("a");
    expect(reader.getSnapshot().navigation.currentNode).toBe("b");
  });

  it("gives each reader and each runtime its own cache", () => {
    const runtime = createNeutralRuntime();
    const first = createExperienceSnapshotReader(runtime);
    const second = createExperienceSnapshotReader(runtime);
    expect(first.getSnapshot()).not.toBe(second.getSnapshot());
    expect(first.getSnapshot().navigation).toBe(second.getSnapshot().navigation);

    const other = createNeutralRuntime();
    const otherReader = createExperienceSnapshotReader(other);
    runtime.selection.select("b");
    expect(otherReader.getSnapshot().selection).toEqual({});
    expect(first.getSnapshot().selection).toEqual({ selectedNodeId: "b" });
  });
});

describe("useExperienceSnapshot", () => {
  function renderSnapshots(consumers: number) {
    const received: ReturnType<typeof useExperienceSnapshot>[] = [];
    function Consumer() {
      const snapshot = useExperienceSnapshot();
      received.push(snapshot);
      return createElement("span", null, snapshot.navigation.currentNode);
    }
    const markup = renderToString(
      createElement(
        ExperienceRuntimeProvider,
        null,
        createElement(
          Fragment,
          null,
          Array.from({ length: consumers }, (_, key) => createElement(Consumer, { key })),
        ),
      ),
    );
    return { markup, received };
  }

  it("renders on the server with the initial snapshot of the runtime", () => {
    const { markup, received } = renderSnapshots(1);

    expect(markup).toBe("<span>human</span>");
    expect(received[0]).toEqual({
      navigation: { currentNode: "human", history: [], mode: "guided" },
      selection: {},
      camera: { position: [0, 0, 5], target: [0, 0, 0], fieldOfView: DEFAULT_FIELD_OF_VIEW },
      layers: { layers: [] },
    });
  });

  it("lets several consumers observe the same runtime state without duplicating it", () => {
    const { received } = renderSnapshots(2);
    const [first, second] = received;

    expect(first?.navigation).toBe(second?.navigation);
    expect(first?.camera).toBe(second?.camera);
  });

  it("requires the ExperienceRuntimeProvider", () => {
    function Orphan() {
      useExperienceSnapshot();
      return null;
    }
    expect(() => renderToString(createElement(Orphan))).toThrow(
      "useExperienceRuntime must be used within an ExperienceRuntimeProvider.",
    );
  });

  it("uses a stable runtime.subscribe", () => {
    const runtime = createApplicationExperience();
    expect(runtime.subscribe).toBe(runtime.subscribe);
  });
});

describe("snapshot bridge structure", () => {
  const hook = read("./use-experience-snapshot.ts");
  const reader = read("./experience-snapshot-reader.ts");
  const importsOf = (source: string) =>
    [...source.matchAll(/from\s*["']([^"']+)["']/g)].flatMap((match) => match[1] ?? []);

  it("wires subscribe, a stable reader and the server snapshot into useSyncExternalStore", () => {
    expect(hook).toMatch(/const \[reader\] = useState\(\(\) => createExperienceSnapshotReader\(runtime\)\);/);
    expect(hook).toMatch(
      /useSyncExternalStore\(runtime\.subscribe, reader\.getSnapshot, reader\.getSnapshot\)/,
    );
  });

  it("keeps no React state store, reducer, effect synchronization or global cache", () => {
    for (const source of [hook, reader]) {
      expect(source).not.toMatch(/useReducer|useEffect|setSnapshot|forceUpdate|window|document/);
      expect(source).not.toMatch(/^(export\s+)?(const|let|var)\s+\w+\s*=\s*new\s+(Weak)?Map\b/m);
      expect(source).not.toMatch(/^(let|var)\s/m);
    }
  });

  it("keeps the reader free of React and the hook free of rendering", () => {
    expect(importsOf(reader).sort()).toEqual([
      "@/experience/engine/create-experience",
      "@/experience/engine/experience-snapshot",
    ]);
    expect(importsOf(hook).sort()).toEqual([
      "./experience-runtime-provider",
      "./experience-snapshot-reader",
      "@/experience/engine/experience-snapshot",
      "react",
    ]);
  });
});
