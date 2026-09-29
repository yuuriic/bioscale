import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { createBiologicalGraph } from "@/biology/graph/biological-graph";
import type { BiologicalNode } from "@/biology/graph/biological-node";
import { UnknownBiologicalNodeError } from "@/biology/graph/unknown-biological-node-error";
import { CameraController } from "@/experience/camera/camera-controller";
import { LayerController, UnknownVisualLayerError } from "@/experience/layers/layer-controller";
import {
  InvalidBreadcrumbIndexError,
  NavigationController,
} from "@/experience/navigation/navigation-controller";
import type { CameraPreset, SceneDefinition } from "@/experience/scenes/scene-definition";
import { createSceneRegistry } from "@/experience/scenes/scene-registry";
import { SelectionController } from "@/experience/selection/selection-controller";
import { createExperience, type ExperienceRuntime } from "./create-experience";
import { ExperienceController, SceneNotAvailableError } from "./experience-controller";
import { getExperienceSnapshot } from "./experience-snapshot";

// Grafo e cenas neutros: `a`, `b` e `c` possuem cena; `d` não.
function node(id: string): BiologicalNode {
  return { id, name: id, domain: "cellular", type: "cell", relations: [] };
}

const graph = createBiologicalGraph(["a", "b", "c", "d"].map(node));

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
    scene("a", { position: [0, 0, 10], target: [0, 0, 0] }, ["outer", "inner"]),
    scene("b", { position: [0, 5, 5], target: [0, 1, 0] }, ["core"]),
    scene("c", { position: [3, 0, 3], target: [0, 0, 0] }, []),
  ],
  graph,
);

function createAtA(): ExperienceRuntime {
  return createExperience({ graph, scenes, initialNodeId: "a" });
}

/** Runtime em `a` com um contador de notificações. */
function observed() {
  const runtime = createAtA();
  const counter = { count: 0 };
  const unsubscribe = runtime.subscribe(() => {
    counter.count += 1;
  });
  return { runtime, counter, unsubscribe };
}

/** Quantas notificações uma ação produz. */
function notificationsOf(runtime: ExperienceRuntime, action: () => void): number {
  let count = 0;
  const unsubscribe = runtime.subscribe(() => {
    count += 1;
  });
  try {
    action();
  } finally {
    unsubscribe();
  }
  return count;
}

describe("ExperienceRuntime.subscribe", () => {
  it("registers a listener and returns an unsubscribe function", () => {
    const runtime = createAtA();
    const received: unknown[][] = [];
    const unsubscribe = runtime.subscribe((...args: unknown[]) => {
      received.push(args);
    });

    expect(typeof unsubscribe).toBe("function");
    runtime.selection.select("b");
    expect(received).toEqual([[]]);
  });

  it("does not notify on subscribe or on reads", () => {
    const { runtime, counter } = observed();
    getExperienceSnapshot(runtime);
    runtime.navigation.getBreadcrumbs();
    runtime.navigation.canGoBack();
    runtime.navigation.getCurrentRelations();
    expect(counter.count).toBe(0);
  });
});

describe("notifications from direct controller operations", () => {
  it("navigation: notifies on change, not on no-op", () => {
    const runtime = createAtA();
    expect(notificationsOf(runtime, () => runtime.navigation.navigate("b"))).toBe(1);
    expect(notificationsOf(runtime, () => runtime.navigation.navigate("b"))).toBe(0);
    expect(notificationsOf(runtime, () => runtime.navigation.back())).toBe(1);
    expect(notificationsOf(runtime, () => runtime.navigation.back())).toBe(0);
    expect(notificationsOf(runtime, () => runtime.navigation.setMode("explore"))).toBe(1);
    expect(notificationsOf(runtime, () => runtime.navigation.setMode("explore"))).toBe(0);
  });

  it("selection: notifies on change, not on repeated selection or clearing when empty", () => {
    const runtime = createAtA();
    expect(notificationsOf(runtime, () => runtime.selection.select("b"))).toBe(1);
    expect(notificationsOf(runtime, () => runtime.selection.select("b"))).toBe(0);
    expect(notificationsOf(runtime, () => runtime.selection.select("c"))).toBe(1);
    expect(notificationsOf(runtime, () => runtime.selection.clearSelection())).toBe(1);
    expect(notificationsOf(runtime, () => runtime.selection.clearSelection())).toBe(0);
  });

  it("camera: notifies on position, target and field of view, not on reset at the base", () => {
    const runtime = createAtA();
    expect(notificationsOf(runtime, () => runtime.camera.reset())).toBe(0);
    expect(notificationsOf(runtime, () => runtime.camera.setPosition([1, 2, 3]))).toBe(1);
    expect(notificationsOf(runtime, () => runtime.camera.setTarget([0, 1, 0]))).toBe(1);
    expect(notificationsOf(runtime, () => runtime.camera.setFieldOfView(70))).toBe(1);
    expect(notificationsOf(runtime, () => runtime.camera.reset())).toBe(1);
  });

  it("layers: notifies on visibility, transparency, isolation and applyLayers, not on no-ops", () => {
    const runtime = createAtA();
    expect(notificationsOf(runtime, () => runtime.layers.clearIsolation())).toBe(0);
    expect(notificationsOf(runtime, () => runtime.layers.reset())).toBe(0);
    expect(notificationsOf(runtime, () => runtime.layers.setVisibility("outer", true))).toBe(0);
    expect(notificationsOf(runtime, () => runtime.layers.setVisibility("outer", false))).toBe(1);
    expect(notificationsOf(runtime, () => runtime.layers.setTransparent("inner", true))).toBe(1);
    expect(notificationsOf(runtime, () => runtime.layers.isolate("inner"))).toBe(1);
    expect(notificationsOf(runtime, () => runtime.layers.isolate("inner"))).toBe(0);
    expect(notificationsOf(runtime, () => runtime.layers.clearIsolation())).toBe(1);
    expect(notificationsOf(runtime, () => runtime.layers.reset())).toBe(1);
    // applyLayers sempre cria um novo estado, mesmo equivalente.
    expect(
      notificationsOf(runtime, () => runtime.layers.applyLayers([{ id: "outer", label: "outer" }])),
    ).toBe(1);
  });
});

describe("camera notifications follow semantic state identity", () => {
  it("does not notify when setters receive the current values", () => {
    const runtime = createAtA();
    const { position, target, fieldOfView } = runtime.camera.getState();
    expect(notificationsOf(runtime, () => runtime.camera.setPosition([...position]))).toBe(0);
    expect(notificationsOf(runtime, () => runtime.camera.setTarget([...target]))).toBe(0);
    expect(notificationsOf(runtime, () => runtime.camera.setFieldOfView(fieldOfView))).toBe(0);
  });

  it("notifies once when setters change a value", () => {
    const runtime = createAtA();
    expect(notificationsOf(runtime, () => runtime.camera.setPosition([0, 0, 11]))).toBe(1);
    expect(notificationsOf(runtime, () => runtime.camera.setTarget([0, 0, 1]))).toBe(1);
    expect(notificationsOf(runtime, () => runtime.camera.setFieldOfView(61))).toBe(1);
  });

  it("notifies reset only when it moves the camera", () => {
    const runtime = createAtA();
    expect(notificationsOf(runtime, () => runtime.camera.reset())).toBe(0);
    runtime.camera.setPosition([1, 1, 1]);
    expect(notificationsOf(runtime, () => runtime.camera.reset())).toBe(1);
    expect(notificationsOf(runtime, () => runtime.camera.reset())).toBe(0);
  });

  it("does not notify applyPreset that only changes the reset base, but keeps the new reset", () => {
    const runtime = createAtA();
    const preset = { position: [4, 4, 4], target: [0, 0, 0], fieldOfView: 50 } as const;
    runtime.camera.setPosition([4, 4, 4]);

    expect(notificationsOf(runtime, () => runtime.camera.applyPreset(preset))).toBe(0);

    runtime.camera.setPosition([7, 7, 7]);
    expect(notificationsOf(runtime, () => runtime.camera.reset())).toBe(1);
    expect(runtime.camera.getState().position).toEqual([4, 4, 4]);
  });

  it("notifies applyPreset that moves the camera, and not a repeated one", () => {
    const runtime = createAtA();
    const preset = { position: [4, 4, 4], target: [0, 0, 0] } as const;
    expect(notificationsOf(runtime, () => runtime.camera.applyPreset(preset))).toBe(1);
    expect(notificationsOf(runtime, () => runtime.camera.applyPreset(preset))).toBe(0);
  });

  it("keeps the camera state while the aggregated snapshot is always new", () => {
    const runtime = createAtA();
    const before = getExperienceSnapshot(runtime);
    let notifications = 0;
    const unsubscribe = runtime.subscribe(() => {
      notifications += 1;
    });

    runtime.camera.setPosition([...before.camera.position]);
    const after = getExperienceSnapshot(runtime);

    expect(after).not.toBe(before);
    expect(after.camera).toBe(before.camera);
    expect(notifications).toBe(0);
    unsubscribe();
  });
});

describe("notifications from coordinated operations", () => {
  it("enter produces exactly one notification although four controllers change", () => {
    const runtime = createAtA();
    runtime.selection.select("d");
    expect(notificationsOf(runtime, () => runtime.experience.enter("b"))).toBe(1);
  });

  it("re-entering the current scene produces at most one notification", () => {
    const runtime = createAtA();
    // A câmera e as layers são reaplicadas, então o estado muda: uma notificação.
    expect(notificationsOf(runtime, () => runtime.experience.enter("a"))).toBe(1);
  });

  it("back and returnToBreadcrumb notify once when they move, never when they do not", () => {
    const runtime = createAtA();
    expect(notificationsOf(runtime, () => runtime.experience.back())).toBe(0);
    expect(notificationsOf(runtime, () => runtime.experience.returnToBreadcrumb(0))).toBe(0);

    runtime.experience.enter("b");
    runtime.experience.enter("c");
    expect(notificationsOf(runtime, () => runtime.experience.back())).toBe(1);
    expect(notificationsOf(runtime, () => runtime.experience.returnToBreadcrumb(1))).toBe(0);
    expect(notificationsOf(runtime, () => runtime.experience.returnToBreadcrumb(0))).toBe(1);
  });

  it("does not notify when an operation fails before changing state, preserving the error", () => {
    const runtime = createAtA();
    const failures: [() => void, new (...args: never[]) => Error][] = [
      [() => runtime.experience.enter("d"), SceneNotAvailableError],
      [() => runtime.experience.returnToBreadcrumb(5), InvalidBreadcrumbIndexError],
      [() => runtime.navigation.navigate("missing"), UnknownBiologicalNodeError],
      [() => runtime.layers.setVisibility("missing", false), UnknownVisualLayerError],
    ];
    for (const [action, errorType] of failures) {
      expect(notificationsOf(runtime, () => expect(action).toThrow(errorType))).toBe(0);
    }
  });
});

describe("subscribe and getExperienceSnapshot together", () => {
  it("notifies once and the next snapshot reflects the change, keeping the old one intact", () => {
    const runtime = createAtA();
    const before = getExperienceSnapshot(runtime);
    let notifications = 0;
    const unsubscribe = runtime.subscribe(() => {
      notifications += 1;
    });

    runtime.selection.select("b");
    const after = getExperienceSnapshot(runtime);

    expect(notifications).toBe(1);
    expect(after).not.toBe(before);
    expect(after.selection).not.toBe(before.selection);
    expect(after.selection).toEqual({ selectedNodeId: "b" });
    expect(before.selection).toEqual({});
    expect(after.navigation).toBe(before.navigation);
    expect(getExperienceSnapshot(runtime)).not.toBe(after);
    unsubscribe();
  });

  it("lets a listener read a snapshot that already contains the change", () => {
    const runtime = createAtA();
    const seen: string[] = [];
    runtime.subscribe(() => {
      seen.push(getExperienceSnapshot(runtime).navigation.currentNode);
    });

    runtime.experience.enter("b");

    expect(seen).toEqual(["b"]);
  });
});

describe("subscription lifecycle", () => {
  it("stops notifying after unsubscribe, and unsubscribing again is safe", () => {
    const { runtime, counter, unsubscribe } = observed();
    runtime.selection.select("b");
    unsubscribe();
    unsubscribe();
    runtime.selection.select("c");
    expect(counter.count).toBe(1);
  });

  it("notifies every listener", () => {
    const runtime = createAtA();
    const calls: string[] = [];
    runtime.subscribe(() => calls.push("first"));
    runtime.subscribe(() => calls.push("second"));

    runtime.selection.select("b");

    expect(calls).toEqual(["first", "second"]);
  });

  it("treats each subscription of the same listener as independent", () => {
    const runtime = createAtA();
    let count = 0;
    const listener = () => {
      count += 1;
    };
    const unsubscribeFirst = runtime.subscribe(listener);
    runtime.subscribe(listener);

    runtime.selection.select("b");
    expect(count).toBe(2);

    unsubscribeFirst();
    runtime.selection.select("c");
    expect(count).toBe(3);
  });

  it("does not call a subscription removed during the current notification", () => {
    const runtime = createAtA();
    const calls: string[] = [];
    let unsubscribeSecond = () => {};
    runtime.subscribe(() => {
      calls.push("first");
      unsubscribeSecond();
    });
    unsubscribeSecond = runtime.subscribe(() => calls.push("second"));
    runtime.subscribe(() => calls.push("third"));

    runtime.selection.select("b");

    expect(calls).toEqual(["first", "third"]);
  });

  it("does not call a subscription added during the current notification until the next one", () => {
    const runtime = createAtA();
    const calls: string[] = [];
    runtime.subscribe(() => {
      calls.push("first");
      if (calls.length === 1) runtime.subscribe(() => calls.push("late"));
    });

    runtime.selection.select("b");
    expect(calls).toEqual(["first"]);

    runtime.selection.select("c");
    expect(calls).toEqual(["first", "first", "late"]);
  });
});

describe("listener errors", () => {
  it("calls every listener, then rethrows after the state is committed", () => {
    const runtime = createAtA();
    const failure = new Error("listener failure");
    const calls: string[] = [];
    runtime.subscribe(() => {
      calls.push("failing");
      throw failure;
    });
    runtime.subscribe(() => calls.push("healthy"));

    expect(() => runtime.selection.select("b")).toThrow(failure);
    expect(calls).toEqual(["failing", "healthy"]);
    expect(runtime.selection.getState()).toEqual({ selectedNodeId: "b" });

    expect(() => runtime.selection.select("c")).toThrow(failure);
    expect(calls).toEqual(["failing", "healthy", "failing", "healthy"]);
  });

  it("aggregates errors from several listeners", () => {
    const runtime = createAtA();
    runtime.subscribe(() => {
      throw new Error("one");
    });
    runtime.subscribe(() => {
      throw new Error("two");
    });

    let error: unknown;
    try {
      runtime.selection.select("b");
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(AggregateError);
    expect((error as AggregateError).errors.map((e: Error) => e.message)).toEqual(["one", "two"]);
  });
});

describe("reentrant listeners", () => {
  it("treats a mutation inside a listener as a new operation, notified synchronously and nested", () => {
    const runtime = createAtA();
    const log: string[] = [];
    runtime.subscribe(() => {
      log.push(`clearing:${runtime.selection.getState().selectedNodeId ?? "none"}`);
      runtime.selection.clearSelection();
    });
    runtime.subscribe(() => {
      log.push(`observer:${runtime.selection.getState().selectedNodeId ?? "none"}`);
    });

    runtime.selection.select("b");

    expect(log).toEqual(["clearing:b", "clearing:none", "observer:none", "observer:none"]);
    expect(runtime.selection.getState()).toEqual({});
  });
});

describe("change notifier boundaries", () => {
  const source = readFileSync(
    fileURLToPath(new URL("./experience-change-notifier.ts", import.meta.url)),
    "utf8",
  );

  it("has no imports: plain TypeScript, without React, DOM, rendering or libraries", () => {
    expect([...source.matchAll(/(?:from|import)\s*["']([^"']+)["']/g)]).toEqual([]);
  });

  it("keeps the runtime objects recognizable as the original controllers", () => {
    const runtime = createAtA();
    expect(runtime.experience).toBeInstanceOf(ExperienceController);
    expect(runtime.navigation).toBeInstanceOf(NavigationController);
    expect(runtime.selection).toBeInstanceOf(SelectionController);
    expect(runtime.camera).toBeInstanceOf(CameraController);
    expect(runtime.layers).toBeInstanceOf(LayerController);
    expect(Object.isFrozen(runtime)).toBe(true);
  });
});
