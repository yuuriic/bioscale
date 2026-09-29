import { describe, expect, it } from "vitest";
import { createBiologicalGraph } from "@/biology/graph/biological-graph";
import { mvpBiologicalNodes } from "@/content/nodes/mvp-nodes";
import { NavigationController } from "./navigation/navigation-controller";
import { SelectionController } from "./selection/selection-controller";

// Garantia arquitetural, não integração: navegação e seleção são estados
// independentes sobre o mesmo grafo. A coordenação entre eles pertence ao
// orquestrador futuro do Experience Engine.
const graph = createBiologicalGraph(mvpBiologicalNodes);

describe("NavigationController and SelectionController", () => {
  it("keep independent state over the same graph", () => {
    const navigation = new NavigationController(graph, { defaultNodeId: "human" });
    const selection = new SelectionController(graph);

    navigation.navigate("nervous-system");
    navigation.navigate("brain");
    selection.select("neuron");

    expect(navigation.getState().currentNode).toBe("brain");
    expect(selection.getState()).toEqual({ selectedNodeId: "neuron" });
  });

  it("do not change each other", () => {
    const navigation = new NavigationController(graph, { defaultNodeId: "human" });
    const selection = new SelectionController(graph);
    navigation.navigate("brain");
    selection.select("neuron");

    const navigationBefore = navigation.getState();
    selection.select("nucleus");
    selection.clearSelection();
    expect(navigation.getState()).toBe(navigationBefore);

    const selectionBefore = selection.getState();
    navigation.navigate("neuron");
    navigation.back();
    expect(selection.getState()).toBe(selectionBefore);
  });
});
