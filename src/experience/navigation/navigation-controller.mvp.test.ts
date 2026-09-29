import { describe, expect, it } from "vitest";
import { createBiologicalGraph } from "@/biology/graph/biological-graph";
import { mvpBiologicalNodes } from "@/content/nodes/mvp-nodes";
import { NavigationController } from "./navigation-controller";

// Integração com o dataset do MVP (ARCHITECTURE.md §29). O dataset é
// injetado aqui pelo teste; o controller não depende dele.
const MVP_JOURNEY = [
  "human",
  "nervous-system",
  "brain",
  "nervous-tissue",
  "neuron",
  "nucleus",
  "chromosome",
  "dna",
] as const;

const graph = createBiologicalGraph(mvpBiologicalNodes);

function journeyController(): NavigationController {
  return new NavigationController(graph, { defaultNodeId: "human" });
}

describe("NavigationController with the MVP dataset", () => {
  it("follows the MVP journey from human to dna", () => {
    const nav = journeyController();
    for (const id of MVP_JOURNEY.slice(1)) {
      nav.navigate(id);
    }

    expect(nav.getState()).toEqual({
      currentNode: "dna",
      history: MVP_JOURNEY.slice(0, -1),
      mode: "guided",
    });
    expect(nav.getBreadcrumbs()).toEqual(MVP_JOURNEY);
  });

  it("returns from dna to human through back()", () => {
    const nav = journeyController();
    for (const id of MVP_JOURNEY.slice(1)) {
      nav.navigate(id);
    }

    const visited = [nav.getState().currentNode];
    while (nav.canGoBack()) {
      nav.back();
      visited.push(nav.getState().currentNode);
    }

    expect(visited).toEqual([...MVP_JOURNEY].reverse());
    expect(nav.getBreadcrumbs()).toEqual(["human"]);
  });

  it("keeps a revisited structure in the breadcrumbs and returns to a chosen occurrence", () => {
    const nav = journeyController();
    for (const id of ["nervous-system", "brain", "nervous-system"]) {
      nav.navigate(id);
    }
    expect(nav.getBreadcrumbs()).toEqual(["human", "nervous-system", "brain", "nervous-system"]);

    nav.returnToBreadcrumb(1);
    expect(nav.getBreadcrumbs()).toEqual(["human", "nervous-system"]);
  });

  it("deep links to neuron without inventing the path from human", () => {
    const nav = new NavigationController(graph, { defaultNodeId: "human", initialNodeId: "neuron" });
    expect(nav.getState().history).toEqual([]);
    expect(nav.getBreadcrumbs()).toEqual(["neuron"]);
  });
});
