import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ExperienceCanvasProps } from "@/rendering/canvas/experience-canvas";
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

describe("ExperienceRenderingBridge", () => {
  it("passes only the layers of the experience snapshot to the Canvas", () => {
    received.length = 0;

    renderToString(createElement(ExperienceRuntimeProvider, null, createElement(ExperienceRenderingBridge)));

    expect(received).toHaveLength(1);
    const [props] = received;
    expect(Object.keys(props ?? {})).toEqual(["layers"]);
    expect(props?.layers).toEqual({ layers: [] });
    // É o estado imutável do LayerController, não uma cópia.
    expect(Object.isFrozen(props?.layers)).toBe(true);
  });

  it("requires the ExperienceRuntimeProvider", () => {
    expect(() => renderToString(createElement(ExperienceRenderingBridge))).toThrow(
      "useExperienceRuntime must be used within an ExperienceRuntimeProvider.",
    );
  });
});

describe("rendering bridge structure", () => {
  const source = readFileSync(
    fileURLToPath(new URL("./experience-rendering-bridge.tsx", import.meta.url)),
    "utf8",
  );

  it("lives in the application layer, reads the snapshot and forwards only layers", () => {
    expect(source).toMatch(/^"use client";/);
    expect(source).toMatch(/const \{ layers \} = useExperienceSnapshot\(\);/);
    expect(source).toMatch(/return <ExperienceCanvas layers=\{layers\} \/>;/);
  });

  it("does not connect camera, navigation or selection, nor keep its own state", () => {
    expect(source).not.toMatch(
      /\b(camera|navigation|selection|useState|useEffect|useReducer|useFrame|window)\b/,
    );
  });
});
