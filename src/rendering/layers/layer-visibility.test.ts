import { describe, expect, it } from "vitest";
import { isLayerRendered } from "./layer-visibility";

// Estados neutros: não representam camadas científicas.
const visible = { layerId: "outer", visible: true, transparent: false };
const hidden = { layerId: "inner", visible: false, transparent: false };

describe("isLayerRendered", () => {
  it("renders a visible layer when nothing is isolated", () => {
    expect(isLayerRendered(visible, undefined)).toBe(true);
  });

  it("does not render a hidden layer", () => {
    expect(isLayerRendered(hidden, undefined)).toBe(false);
  });

  it("renders only the isolated layer while isolation is active", () => {
    expect(isLayerRendered(visible, "outer")).toBe(true);
    expect(isLayerRendered(visible, "other")).toBe(false);
  });

  it("does not make an isolated hidden layer visible", () => {
    expect(isLayerRendered(hidden, "inner")).toBe(false);
  });

  it("ignores logical transparency for now", () => {
    expect(isLayerRendered({ ...visible, transparent: true }, undefined)).toBe(true);
  });
});
