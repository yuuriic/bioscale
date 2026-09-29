"use client";

import { Canvas } from "@react-three/fiber";
import type { LayerControllerState } from "@/experience/layers/layer-state";
import type { SceneDefinition } from "@/experience/scenes/scene-definition";
import { RenderingProbe } from "@/rendering/debug/rendering-probe";
import { SceneManager } from "@/rendering/scenes/scene-manager";

export interface ExperienceCanvasProps {
  /** Cena ativa derivada pela aplicação; `undefined` quando não há cena registrada. */
  readonly scene: SceneDefinition | undefined;
  /** Estado lógico das layers da cena ativa, injetado pela aplicação. */
  readonly layers: LayerControllerState;
}

/**
 * Canvas 3D persistente da experiência (ARCHITECTURE.md §17). Existe uma
 * única instância, montada pela aplicação; as cenas são montadas dentro dele
 * pelo SceneManager, sem recriar o contexto WebGL.
 *
 * Recebe apenas o que já interpreta (§17.4): a cena ativa e as layers. Não
 * conhece o runtime, o registry nem o snapshot completo. A câmera é apenas
 * técnica, para tornar o probe visível: ainda não é controlada pelo
 * CameraController.
 */
export function ExperienceCanvas({ scene, layers }: ExperienceCanvasProps) {
  return (
    <div style={{ position: "fixed", inset: 0 }}>
      <Canvas camera={{ position: [2.5, 2, 3.5], fov: 50 }}>
        <RenderingProbe />
        <SceneManager scene={scene} layers={layers} />
      </Canvas>
    </div>
  );
}
