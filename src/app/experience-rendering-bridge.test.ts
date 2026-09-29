import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SceneNotAvailableError } from "@/experience/engine/experience-controller";
import type { ExperienceCanvasProps } from "@/rendering/canvas/experience-canvas";
import type { ApplicationExperience } from "./experience-config";
import { ExperienceRenderingBridge } from "./experience-rendering-bridge";
import { ExperienceRuntimeProvider } from "./experience-runtime-provider";

// O Canvas R3F real exige WebGL; aqui ele é substituído por um componente que
// apenas registra as props recebidas (ARCHITECTURE.md §17.4).
const received = vi.hoisted(() => [] as ExperienceCanvasProps[]);
vi.mock("@/rendering/canvas/experience-canvas", () => ({
  ExperienceCanvas: (props: ExperienceCanvasProps) => {
    received.push(props);
    return null;
  },
}));

// A composição real, opcionalmente levada a um nó por navegação direta, o
// caminho real pelo qual `currentNode` pode ficar sem cena.
const composition = vi.hoisted(() => ({
  navigateTo: undefined as string | undefined,
  last: undefined as ApplicationExperience | undefined,
}));
vi.mock("./experience-config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./experience-config")>();
  return {
    ...actual,
    createApplicationExperience: () => {
      const experience = actual.createApplicationExperience();
      if (composition.navigateTo !== undefined) {
        experience.runtime.navigation.navigate(composition.navigateTo);
      }
      composition.last = experience;
      return experience;
    },
  };
});

function renderBridge(): ExperienceCanvasProps | undefined {
  renderToString(createElement(ExperienceRuntimeProvider, null, createElement(ExperienceRenderingBridge)));
  expect(received).toHaveLength(1);
  return received[0];
}

beforeEach(() => {
  received.length = 0;
  composition.navigateTo = undefined;
  composition.last = undefined;
});

describe("ExperienceRenderingBridge", () => {
  it("passes the active scene and the layers, exactly as the registry and the snapshot hold them", () => {
    const props = renderBridge();
    const experience = composition.last!;

    expect(Object.keys(props ?? {}).sort()).toEqual(["layers", "scene"]);
    expect(props?.scene?.nodeId).toBe("human");
    // A mesma referência do registry: sem cópia, view nem memoização.
    expect(props?.scene).toBe(experience.scenes.getScene("human"));
    expect(Object.isFrozen(props?.scene)).toBe(true);
    // O estado imutável do LayerController, não uma cópia.
    expect(props?.layers).toBe(experience.runtime.layers.getState());
    expect(props?.layers).toEqual({ layers: [] });
  });

  it("passes an undefined scene, without throwing, when the current node has no scene", () => {
    composition.navigateTo = "brain";

    let props: ExperienceCanvasProps | undefined;
    expect(() => {
      props = renderBridge();
    }).not.toThrow();
    const experience = composition.last!;

    expect(experience.runtime.navigation.getState().currentNode).toBe("brain");
    expect(experience.scenes.getScene("brain")).toBeUndefined();
    expect(() => experience.runtime.experience.enter("brain")).toThrow(SceneNotAvailableError);
    expect("scene" in (props ?? {})).toBe(true);
    expect(props?.scene).toBeUndefined();
    expect(props?.layers).toBe(experience.runtime.layers.getState());
  });

  it("requires the ExperienceRuntimeProvider", () => {
    expect(() => renderToString(createElement(ExperienceRenderingBridge))).toThrow(
      /must be used within an ExperienceRuntimeProvider/,
    );
  });
});

describe("rendering bridge structure", () => {
  const source = readFileSync(
    fileURLToPath(new URL("./experience-rendering-bridge.tsx", import.meta.url)),
    "utf8",
  );

  it("lives in the application layer and derives the active scene directly", () => {
    expect(source).toMatch(/^"use client";/);
    expect(source).toMatch(/const \{ navigation, layers \} = useExperienceSnapshot\(\);/);
    expect(source).toMatch(
      /const scene = useExperienceScenes\(\)\.getScene\(navigation\.currentNode\);/,
    );
    expect(source).toMatch(/return <ExperienceCanvas scene=\{scene\} layers=\{layers\} \/>;/);
  });

  it("does not connect camera or selection, nor keep state, memoize or synchronize", () => {
    expect(source).not.toMatch(
      /\b(camera|selection|useState|useEffect|useReducer|useMemo|useCallback|useFrame|window)\b/,
    );
  });
});
