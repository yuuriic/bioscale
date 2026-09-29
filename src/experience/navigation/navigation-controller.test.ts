import { describe, expect, expectTypeOf, it } from "vitest";
import { createBiologicalGraph } from "@/biology/graph/biological-graph";
import type { BiologicalNode } from "@/biology/graph/biological-node";
import { UnknownBiologicalNodeError } from "@/biology/graph/unknown-biological-node-error";
import {
  InvalidBreadcrumbIndexError,
  NavigationController,
  breadcrumbAt,
} from "./navigation-controller";
import type { NavigationState } from "./navigation-state";

// Grafo estrutural neutro: não representa dados científicos. `d` é
// alcançável por dois caminhos (a → b → d e a → c → d); `e` está isolado.
function node(id: string, targets: readonly string[] = []): BiologicalNode {
  return {
    id,
    name: id,
    domain: "cellular",
    type: "cell",
    relations: targets.map((target) => ({ source: id, target, type: "contains" })),
  };
}

const graph = createBiologicalGraph([
  node("a", ["b", "c"]),
  node("b", ["d"]),
  node("c", ["d"]),
  node("d"),
  node("e"),
]);

function controller(initialNodeId?: string): NavigationController {
  return new NavigationController(graph, {
    defaultNodeId: "a",
    ...(initialNodeId === undefined ? {} : { initialNodeId }),
  });
}

function walk(nav: NavigationController, ...ids: string[]): NavigationController {
  for (const id of ids) {
    nav.navigate(id);
  }
  return nav;
}

describe("NavigationController initialization", () => {
  it("starts at the default node in guided mode, without history", () => {
    const nav = controller();
    expect(nav.getState()).toEqual({ currentNode: "a", history: [], mode: "guided" });
    expect(nav.getBreadcrumbs()).toEqual(["a"]);
    expect(nav.canGoBack()).toBe(false);
  });

  it("starts directly at a deep-linked node without fabricating a path to it", () => {
    const nav = controller("d");
    expect(nav.getState()).toEqual({ currentNode: "d", history: [], mode: "guided" });
    expect(nav.getBreadcrumbs()).toEqual(["d"]);
    expect(nav.canGoBack()).toBe(false);
  });

  it("rejects an unknown initial node", () => {
    expect(() => controller("missing")).toThrow(UnknownBiologicalNodeError);
  });

  it("rejects an unknown default node even when a deep link is given", () => {
    expect(
      () => new NavigationController(graph, { defaultNodeId: "missing", initialNodeId: "a" }),
    ).toThrow(UnknownBiologicalNodeError);
  });
});

describe("NavigationController navigation", () => {
  it("navigates to an existing node and records the previous one in history", () => {
    const nav = walk(controller(), "b");
    expect(nav.getState()).toEqual({ currentNode: "b", history: ["a"], mode: "guided" });
    expect(nav.canGoBack()).toBe(true);
  });

  it("does not require a declared relation between the current node and the target", () => {
    const nav = walk(controller(), "e");
    expect(nav.getState().currentNode).toBe("e");
  });

  it("throws an explicit error for an unknown node and keeps the state unchanged", () => {
    const nav = walk(controller(), "b");
    const before = nav.getState();

    let error: unknown;
    try {
      nav.navigate("missing");
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(UnknownBiologicalNodeError);
    expect((error as UnknownBiologicalNodeError).nodeId).toBe("missing");
    expect(nav.getState()).toBe(before);
  });

  it("treats navigation to the current node as a no-op", () => {
    const nav = walk(controller(), "b");
    const before = nav.getState();

    nav.navigate("b");

    expect(nav.getState()).toBe(before);
    expect(nav.getState().history).toEqual(["a"]);
  });

  it("keeps the traversed nodes in order, without the current node", () => {
    const nav = walk(controller(), "b", "d");
    expect(nav.getState().history).toEqual(["a", "b"]);
    expect(nav.getState().history).not.toContain("d");
  });

  it("revisits a node already in the history as a new step of the path", () => {
    const nav = walk(controller(), "b", "d", "a");
    expect(nav.getState()).toEqual({ currentNode: "a", history: ["a", "b", "d"], mode: "guided" });
  });
});

describe("NavigationController back", () => {
  it("returns step by step to the previous nodes", () => {
    const nav = walk(controller(), "b", "d");

    nav.back();
    expect(nav.getState()).toEqual({ currentNode: "b", history: ["a"], mode: "guided" });

    nav.back();
    expect(nav.getState()).toEqual({ currentNode: "a", history: [], mode: "guided" });
  });

  it("does nothing when there is no history", () => {
    const nav = controller();
    const before = nav.getState();

    nav.back();

    expect(nav.getState()).toBe(before);
    expect(nav.canGoBack()).toBe(false);
  });

  it("does not go back past a deep-linked starting node", () => {
    const nav = controller("d");
    nav.back();
    expect(nav.getState().currentNode).toBe("d");
  });

  it("steps back one position of a path with repeated nodes", () => {
    const nav = walk(controller(), "b", "a", "c");
    nav.back();
    expect(nav.getBreadcrumbs()).toEqual(["a", "b", "a"]);
  });

  it("discards the abandoned branch when navigating after back", () => {
    const nav = walk(controller(), "b", "d");
    nav.back();
    nav.back();
    nav.navigate("c");

    expect(nav.getState()).toEqual({ currentNode: "c", history: ["a"], mode: "guided" });
    expect(nav.getBreadcrumbs()).toEqual(["a", "c"]);
  });
});

describe("NavigationController breadcrumbs", () => {
  it("reflect the path followed by the user", () => {
    expect(walk(controller(), "b", "d").getBreadcrumbs()).toEqual(["a", "b", "d"]);
  });

  it("reflect whichever path was taken to reach the same node", () => {
    expect(walk(controller(), "b", "d").getBreadcrumbs()).toEqual(["a", "b", "d"]);
    expect(walk(controller(), "c", "d").getBreadcrumbs()).toEqual(["a", "c", "d"]);

    const nav = walk(controller(), "b", "d");
    nav.back();
    nav.back();
    walk(nav, "c", "d");
    expect(nav.getBreadcrumbs()).toEqual(["a", "c", "d"]);
  });

  it("preserve repeated nodes", () => {
    expect(walk(controller(), "b", "d", "a").getBreadcrumbs()).toEqual(["a", "b", "d", "a"]);
  });
});

describe("NavigationController breadcrumb navigation", () => {
  it("returns to an earlier position and discards the rest of the path", () => {
    const nav = walk(controller(), "b", "d", "c");

    nav.returnToBreadcrumb(1);

    expect(nav.getState()).toEqual({ currentNode: "b", history: ["a"], mode: "guided" });
    expect(nav.getBreadcrumbs()).toEqual(["a", "b"]);
  });

  it("identifies a position, not a node id", () => {
    const first = walk(controller(), "b", "a", "c");
    first.returnToBreadcrumb(0);
    expect(first.getState()).toEqual({ currentNode: "a", history: [], mode: "guided" });

    const second = walk(controller(), "b", "a", "c");
    second.returnToBreadcrumb(2);
    expect(second.getState()).toEqual({ currentNode: "a", history: ["a", "b"], mode: "guided" });
  });

  it("treats the current position as a no-op, even when the node repeats earlier", () => {
    const nav = walk(controller(), "b", "a");
    const before = nav.getState();

    nav.returnToBreadcrumb(2);

    expect(nav.getState()).toBe(before);
    expect(nav.getState().history).toEqual(["a", "b"]);
  });

  it.each([
    ["negative", -1],
    ["past the last breadcrumb", 3],
    ["not an integer", 0.5],
    ["NaN", Number.NaN],
    ["infinite", Number.POSITIVE_INFINITY],
  ])("rejects an index that is %s and keeps the state intact", (_, index) => {
    const nav = walk(controller(), "b", "d");
    const before = nav.getState();

    let error: unknown;
    try {
      nav.returnToBreadcrumb(index);
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(InvalidBreadcrumbIndexError);
    expect((error as InvalidBreadcrumbIndexError).index).toBe(index);
    expect(nav.getState()).toBe(before);
    expect(nav.getBreadcrumbs()).toEqual(["a", "b", "d"]);
  });

  it("only accepts the current position after a deep link", () => {
    const nav = controller("d");
    nav.returnToBreadcrumb(0);
    expect(nav.getState()).toEqual({ currentNode: "d", history: [], mode: "guided" });
    expect(() => nav.returnToBreadcrumb(1)).toThrow(InvalidBreadcrumbIndexError);
  });
});

describe("breadcrumbAt", () => {
  it("resolves a position without mutating anything, rejecting the same indexes", () => {
    const nav = walk(controller(), "b", "a", "c");
    const breadcrumbs = nav.getBreadcrumbs();
    const before = nav.getState();

    expect(breadcrumbAt(breadcrumbs, 0)).toBe("a");
    expect(breadcrumbAt(breadcrumbs, 2)).toBe("a");
    expect(breadcrumbAt(breadcrumbs, 3)).toBe("c");
    for (const index of [-1, 4, 0.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => breadcrumbAt(breadcrumbs, index)).toThrow(InvalidBreadcrumbIndexError);
      expect(() => nav.returnToBreadcrumb(index)).toThrow(InvalidBreadcrumbIndexError);
    }
    expect(nav.getState()).toBe(before);
  });
});

describe("NavigationController responsibility", () => {
  it("does not hold selection state; selection belongs to SelectionController", () => {
    expectTypeOf<NavigationState>().not.toHaveProperty("selectedNode");

    const nav = controller();
    expect("select" in nav).toBe(false);
    expect("clearSelection" in nav).toBe(false);

    walk(nav, "b", "d");
    nav.back();
    nav.returnToBreadcrumb(0);
    nav.setMode("explore");
    expect(Object.keys(nav.getState()).sort()).toEqual(["currentNode", "history", "mode"]);
  });
});

describe("NavigationController mode", () => {
  it("switches from guided to explore", () => {
    const nav = walk(controller(), "b");
    nav.setMode("explore");
    expect(nav.getState()).toEqual({ currentNode: "b", history: ["a"], mode: "explore" });
  });

  it("switches from explore to guided", () => {
    const nav = controller();
    nav.setMode("explore");
    nav.setMode("guided");
    expect(nav.getState().mode).toBe("guided");
  });
});

describe("NavigationController encapsulation", () => {
  it("does not let external code corrupt the history", () => {
    const nav = walk(controller(), "b", "d");
    const state = nav.getState();

    expect(() => (state.history as string[]).push("e")).toThrow(TypeError);
    expect(() => (state.history as string[]).splice(0)).toThrow(TypeError);
    expect(() => {
      (state as { currentNode: string }).currentNode = "e";
    }).toThrow(TypeError);
    expect(() => (nav.getBreadcrumbs() as string[]).pop()).toThrow(TypeError);

    expect(nav.getState()).toEqual({ currentNode: "d", history: ["a", "b"], mode: "guided" });
    nav.back();
    expect(nav.getState().currentNode).toBe("b");
  });

  it("returns snapshots that do not change after later navigation", () => {
    const nav = walk(controller(), "b");
    const snapshot = nav.getState();

    walk(nav, "d");

    expect(snapshot).toEqual({ currentNode: "b", history: ["a"], mode: "guided" });
  });
});

describe("NavigationController relations", () => {
  it("exposes the declared relations of the current node from the graph", () => {
    const nav = walk(controller(), "b");
    expect(nav.getCurrentRelations()).toEqual({
      outgoing: graph.getOutgoingRelations("b"),
      incoming: graph.getIncomingRelations("b"),
    });
  });

  it("does not restrict navigation to those relations", () => {
    const nav = walk(controller(), "b");
    const targets = nav.getCurrentRelations().outgoing.map((relation) => relation.target);

    expect(targets).toEqual(["d"]);
    nav.navigate("c");
    expect(nav.getState().currentNode).toBe("c");
  });
});
