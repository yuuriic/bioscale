import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { CameraPreset, Vec3 } from "@/experience/scenes/scene-definition";
import type { CameraPresetIssue } from "@/experience/scenes/validate-camera-preset";
import {
  CameraController,
  DEFAULT_FIELD_OF_VIEW,
  InvalidCameraStateError,
} from "./camera-controller";

// Presets neutros em Scene Units: não representam cenas do MVP.
const FULL: CameraPreset = { position: [0, 0, 10], target: [0, 0, 0], fieldOfView: 40 };
const WITHOUT_FOV: CameraPreset = { position: [5, 5, 5], target: [1, 0, 0] };
const OTHER: CameraPreset = { position: [0, 3, 6], target: [0, 1, 0], fieldOfView: 30 };

function expectRejected(action: () => void, issues: readonly CameraPresetIssue[]): void {
  let error: unknown;
  try {
    action();
  } catch (caught) {
    error = caught;
  }
  expect(error).toBeInstanceOf(InvalidCameraStateError);
  expect((error as InvalidCameraStateError).issues).toEqual(issues);
}

/** Verifica que a operação falha e que o estado não muda. */
function expectRejectedWithoutChange(
  camera: CameraController,
  action: () => void,
  issues: readonly CameraPresetIssue[],
): void {
  const before = camera.getState();
  expectRejected(action, issues);
  expect(camera.getState()).toBe(before);
}

describe("CameraController initialization", () => {
  it("starts from a complete preset", () => {
    expect(new CameraController(FULL).getState()).toEqual({
      position: [0, 0, 10],
      target: [0, 0, 0],
      fieldOfView: 40,
    });
  });

  it("uses the default field of view when the preset omits it", () => {
    expect(new CameraController(WITHOUT_FOV).getState()).toEqual({
      position: [5, 5, 5],
      target: [1, 0, 0],
      fieldOfView: DEFAULT_FIELD_OF_VIEW,
    });
  });

  it("has a default field of view inside the valid range", () => {
    expect(DEFAULT_FIELD_OF_VIEW).toBe(50);
  });

  it("rejects an invalid initial preset", () => {
    expectRejected(
      () => new CameraController({ position: [1, 1, 1], target: [1, 1, 1] }),
      ["position_equals_target"],
    );
  });

  it("works from a plain preset, without SceneRegistry or BiologicalGraph", () => {
    const camera = new CameraController({ position: [0, 0, 1], target: [0, 0, 0] });
    expect(camera.getState().target).toEqual([0, 0, 0]);
  });
});

describe("CameraController updates", () => {
  it("updates the position only", () => {
    const camera = new CameraController(FULL);
    camera.setPosition([2, 3, 4]);
    expect(camera.getState()).toEqual({ position: [2, 3, 4], target: [0, 0, 0], fieldOfView: 40 });
  });

  it("updates the target only", () => {
    const camera = new CameraController(FULL);
    camera.setTarget([1, 1, 1]);
    expect(camera.getState()).toEqual({ position: [0, 0, 10], target: [1, 1, 1], fieldOfView: 40 });
  });

  it("updates the field of view only", () => {
    const camera = new CameraController(FULL);
    camera.setFieldOfView(75);
    expect(camera.getState()).toEqual({ position: [0, 0, 10], target: [0, 0, 0], fieldOfView: 75 });
  });

  it("applies a new preset", () => {
    const camera = new CameraController(FULL);
    camera.applyPreset(OTHER);
    expect(camera.getState()).toEqual({ position: [0, 3, 6], target: [0, 1, 0], fieldOfView: 30 });
  });

  it("uses the default field of view for a new preset without one", () => {
    const camera = new CameraController(FULL);
    camera.applyPreset(WITHOUT_FOV);
    expect(camera.getState().fieldOfView).toBe(DEFAULT_FIELD_OF_VIEW);
  });
});

describe("CameraController reset", () => {
  it("returns to the construction preset when no other preset was applied", () => {
    const camera = new CameraController(FULL);
    camera.setPosition([9, 9, 9]);
    camera.setTarget([1, 2, 3]);
    camera.setFieldOfView(80);

    camera.reset();

    expect(camera.getState()).toEqual({ position: [0, 0, 10], target: [0, 0, 0], fieldOfView: 40 });
  });

  it("returns to the most recently applied preset, not the construction one", () => {
    const camera = new CameraController(FULL);
    camera.applyPreset(OTHER);
    camera.setPosition([9, 9, 9]);

    camera.reset();

    expect(camera.getState()).toEqual({ position: [0, 3, 6], target: [0, 1, 0], fieldOfView: 30 });
  });

  it("keeps the base unchanged when applying an invalid preset fails", () => {
    const camera = new CameraController(FULL);
    camera.setPosition([9, 9, 9]);

    expectRejectedWithoutChange(
      camera,
      () => camera.applyPreset({ position: [0, 0, 0], target: [0, 0, 0] }),
      ["position_equals_target"],
    );
    camera.reset();

    expect(camera.getState().position).toEqual([0, 0, 10]);
  });
});

describe("CameraController validation", () => {
  const invalidCoordinates: readonly [string, Vec3][] = [
    ["NaN", [Number.NaN, 0, 0]],
    ["Infinity", [0, Number.POSITIVE_INFINITY, 0]],
    ["-Infinity", [0, 0, Number.NEGATIVE_INFINITY]],
  ];

  it.each(invalidCoordinates)("rejects a position with %s", (_, position) => {
    const camera = new CameraController(FULL);
    expectRejectedWithoutChange(camera, () => camera.setPosition(position), ["non_finite_position"]);
  });

  it.each(invalidCoordinates)("rejects a target with %s", (_, target) => {
    const camera = new CameraController(FULL);
    expectRejectedWithoutChange(camera, () => camera.setTarget(target), ["non_finite_target"]);
  });

  it("rejects a position equal to the target", () => {
    const camera = new CameraController(FULL);
    expectRejectedWithoutChange(camera, () => camera.setPosition([0, 0, 0]), [
      "position_equals_target",
    ]);
  });

  it("rejects a target equal to the position", () => {
    const camera = new CameraController(FULL);
    expectRejectedWithoutChange(camera, () => camera.setTarget([0, 0, 10]), [
      "position_equals_target",
    ]);
  });

  it.each([
    ["0", 0],
    ["180", 180],
    ["negative", -30],
    ["above 180", 200],
    ["NaN", Number.NaN],
    ["Infinity", Number.POSITIVE_INFINITY],
    ["-Infinity", Number.NEGATIVE_INFINITY],
  ])("rejects a field of view of %s", (_, fieldOfView) => {
    const camera = new CameraController(FULL);
    expectRejectedWithoutChange(camera, () => camera.setFieldOfView(fieldOfView), [
      "invalid_field_of_view",
    ]);
  });

  it("rejects an invalid preset without changing the state", () => {
    const camera = new CameraController(FULL);
    expectRejectedWithoutChange(
      camera,
      () => camera.applyPreset({ position: [0, 0, Number.NaN], target: [0, 0, 0], fieldOfView: 0 }),
      ["non_finite_position", "invalid_field_of_view"],
    );
  });
});

describe("CameraController immutability", () => {
  it("keeps earlier snapshots stable after later changes", () => {
    const camera = new CameraController(FULL);
    const before = camera.getState();

    camera.setPosition([1, 2, 3]);
    camera.setTarget([4, 5, 6]);
    camera.setFieldOfView(70);
    camera.applyPreset(OTHER);

    expect(before).toEqual({ position: [0, 0, 10], target: [0, 0, 0], fieldOfView: 40 });
    expect(camera.getState()).not.toBe(before);
  });

  it("does not let consumers mutate the returned position", () => {
    const camera = new CameraController(FULL);
    expect(() => {
      (camera.getState().position as unknown as number[])[0] = 99;
    }).toThrow(TypeError);
    expect(camera.getState().position).toEqual([0, 0, 10]);
  });

  it("does not let consumers mutate the returned target", () => {
    const camera = new CameraController(FULL);
    expect(() => {
      (camera.getState().target as unknown as number[]).push(1);
    }).toThrow(TypeError);
    expect(() => {
      (camera.getState() as { fieldOfView: number }).fieldOfView = 90;
    }).toThrow(TypeError);
    expect(camera.getState()).toEqual({ position: [0, 0, 10], target: [0, 0, 0], fieldOfView: 40 });
  });

  it("is not affected by later changes to the caller's vectors", () => {
    const position = [0, 0, 10];
    const target = [0, 0, 0];
    const camera = new CameraController({ position: position as unknown as Vec3, target: target as unknown as Vec3 });
    const moved = [3, 3, 3];
    camera.setPosition(moved as unknown as Vec3);

    position[0] = 99;
    target[0] = 99;
    moved[0] = 99;

    expect(camera.getState().position).toEqual([3, 3, 3]);
    expect(camera.getState().target).toEqual([0, 0, 0]);
    camera.reset();
    expect(camera.getState().position).toEqual([0, 0, 10]);
  });
});

describe("CameraController semantic state identity", () => {
  it("keeps the same state when setters receive the current values in new arrays", () => {
    const camera = new CameraController(FULL);
    const before = camera.getState();

    camera.setPosition([0, 0, 10]);
    camera.setTarget([0, 0, 0]);
    camera.setFieldOfView(40);

    expect(camera.getState()).toBe(before);
  });

  it("creates a new state when a setter changes a value", () => {
    const camera = new CameraController(FULL);

    const initial = camera.getState();
    camera.setPosition([0, 0, 11]);
    const afterPosition = camera.getState();
    camera.setTarget([0, 0, 1]);
    const afterTarget = camera.getState();
    camera.setFieldOfView(41);

    expect(afterPosition).not.toBe(initial);
    expect(afterTarget).not.toBe(afterPosition);
    expect(camera.getState()).not.toBe(afterTarget);
  });

  it("compares vectors component by component", () => {
    const camera = new CameraController(FULL);
    const before = camera.getState();

    camera.setPosition([0, 0.5, 10]);
    expect(camera.getState()).not.toBe(before);
    expect(camera.getState().position).toEqual([0, 0.5, 10]);
  });

  it("keeps the same state on reset when already at the reset base", () => {
    const camera = new CameraController(FULL);
    const initial = camera.getState();
    camera.reset();
    expect(camera.getState()).toBe(initial);

    // Voltar manualmente aos valores da base também não é mudança para reset.
    camera.setPosition([1, 1, 1]);
    camera.setPosition([0, 0, 10]);
    const returned = camera.getState();
    camera.reset();
    expect(camera.getState()).toBe(returned);
  });

  it("creates a new state on reset after a change", () => {
    const camera = new CameraController(FULL);
    camera.setFieldOfView(70);
    const changed = camera.getState();

    camera.reset();

    expect(camera.getState()).not.toBe(changed);
    expect(camera.getState()).toEqual(FULL);
  });

  it("treats applyPreset as a no-op when the current state and the reset base already match it", () => {
    const camera = new CameraController(FULL);
    const before = camera.getState();

    camera.applyPreset({ position: [0, 0, 10], target: [0, 0, 0], fieldOfView: 40 });
    expect(camera.getState()).toBe(before);

    camera.setPosition([2, 2, 2]);
    camera.reset();
    expect(camera.getState()).toBe(before);
  });

  it("updates the reset base even when the current camera already shows the new preset", () => {
    const camera = new CameraController(FULL);
    camera.setPosition([0, 3, 6]);
    camera.setTarget([0, 1, 0]);
    camera.setFieldOfView(30);
    const showingOther = camera.getState();

    camera.applyPreset(OTHER);

    // O estado observável não mudou: mesma referência.
    expect(camera.getState()).toBe(showingOther);
    // Mas o reset agora volta a OTHER, não a FULL.
    camera.setPosition([9, 9, 9]);
    camera.reset();
    expect(camera.getState()).toEqual(OTHER);
  });

  it("applies the preset when only the current state differs from it", () => {
    const camera = new CameraController(FULL);
    camera.setPosition([4, 4, 4]);
    const moved = camera.getState();

    camera.applyPreset(FULL);

    expect(camera.getState()).not.toBe(moved);
    expect(camera.getState()).toEqual(FULL);
  });

  it("still validates inputs that look like the current values", () => {
    const camera = new CameraController(FULL);
    expectRejectedWithoutChange(camera, () => camera.setTarget([0, 0, 10]), [
      "position_equals_target",
    ]);
    expectRejectedWithoutChange(camera, () => camera.setFieldOfView(Number.NaN), [
      "invalid_field_of_view",
    ]);
    expectRejectedWithoutChange(
      camera,
      () => camera.applyPreset({ position: [0, 0, 10], target: [0, 0, 10], fieldOfView: 40 }),
      ["position_equals_target"],
    );
    camera.setPosition([1, 1, 1]);
    camera.reset();
    expect(camera.getState()).toEqual(FULL);
  });
});

describe("camera module boundaries", () => {
  const directory = fileURLToPath(new URL(".", import.meta.url));
  const sources = readdirSync(directory)
    .filter((file) => file.endsWith(".ts") && !file.endsWith(".test.ts"))
    .map((file) => ({ file, source: readFileSync(`${directory}${file}`, "utf8") }));
  const specifiers = (source: string) =>
    [...source.matchAll(/from\s*["']([^"']+)["']/g)].flatMap((match) => match[1] ?? []);

  it("finds the implementation files to inspect", () => {
    expect(sources.map(({ file }) => file).sort()).toEqual([
      "camera-controller.ts",
      "camera-state.ts",
    ]);
  });

  it("does not depend on Three.js, UI frameworks, DOM or WebGL", () => {
    const forbidden = /^(three|@react-three\/.+|react|react-dom|next|gsap|lenis|zustand)(\/.*)?$/;
    for (const { file, source } of sources) {
      expect(specifiers(source).filter((s) => forbidden.test(s)), file).toEqual([]);
      expect(source, file).not.toMatch(/\b(window|document|WebGL\w*|HTMLCanvasElement)\b/);
    }
  });

  it("does not depend on the MVP dataset, the graph, the scene registry or navigation", () => {
    const allowed = new Set([
      "@/experience/scenes/scene-definition",
      "@/experience/scenes/validate-camera-preset",
      "./camera-state",
    ]);
    for (const { file, source } of sources) {
      expect(specifiers(source).filter((s) => !allowed.has(s)), file).toEqual([]);
    }
  });
});
