import { isValidElement, type ReactElement } from "react";
import { describe, expect, it } from "vitest";
import type { LayerControllerState } from "@/experience/layers/layer-state";
import type { SceneDefinition } from "@/experience/scenes/scene-definition";
import { LayerGroups } from "@/rendering/layers/layer-groups";
import { SceneManager } from "./scene-manager";

// Sem WebGL: o SceneManager é uma função pura de props, e o elemento que ele
// devolve é inspecionado diretamente. Cena e layers neutras.
const scene: SceneDefinition = {
  nodeId: "a",
  assets: [],
  camera: { position: [0, 0, 10], target: [0, 0, 0] },
  layers: [{ id: "outer", label: "outer" }],
  capabilities: [],
};
const layers: LayerControllerState = Object.freeze({
  layers: [{ layerId: "outer", visible: true, transparent: false }],
});

describe("SceneManager", () => {
  it("mounts nothing when there is no registered scene", () => {
    expect(SceneManager({ scene: undefined, layers })).toBeNull();
  });

  it("mounts a scene group identified by the node, containing the layer groups", () => {
    const element = SceneManager({ scene, layers }) as ReactElement<{
      name: string;
      children: ReactElement<{ layers: LayerControllerState }>;
    }>;

    expect(isValidElement(element)).toBe(true);
    expect(element.type).toBe("group");
    expect(element.key).toBe("a");
    expect(element.props.name).toBe("scene:a");

    const child = element.props.children;
    expect(child.type).toBe(LayerGroups);
    expect(child.props.layers).toBe(layers);
  });

  it("changes the scene identity when the node changes", () => {
    const other = SceneManager({ scene: { ...scene, nodeId: "b" }, layers }) as ReactElement;
    expect(other.key).toBe("b");
  });

  it("does not interpret camera, assets or capabilities", () => {
    const withExtras = SceneManager({
      scene: {
        ...scene,
        camera: { position: [9, 9, 9], target: [1, 1, 1], fieldOfView: 20 },
        assets: [{ assetId: "asset-a" }],
        capabilities: ["rotate", "explode"],
      },
      layers,
    });
    expect(withExtras).toEqual(SceneManager({ scene, layers }));
  });
});
