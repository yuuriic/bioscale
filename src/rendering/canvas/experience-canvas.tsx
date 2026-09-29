"use client";

import { Canvas } from "@react-three/fiber";
import type { LayerControllerState } from "@/experience/layers/layer-state";
import { RenderingProbe } from "@/rendering/debug/rendering-probe";
import { LayerGroups } from "@/rendering/layers/layer-groups";

export interface ExperienceCanvasProps {
  /** Estado lógico das layers da cena ativa, injetado pela aplicação. */
  readonly layers: LayerControllerState;
}

/**
 * Canvas 3D persistente da experiência (ARCHITECTURE.md §17). Existe uma
 * única instância, montada pela aplicação; cenas futuras serão renderizadas
 * dentro dele, sem recriar o contexto WebGL.
 *
 * Recebe apenas o estado que já interpreta (§17.4): as layers. Não conhece o
 * runtime nem o snapshot completo. A câmera é apenas técnica, para tornar o
 * probe visível: ainda não é controlada pelo CameraController.
 */
export function ExperienceCanvas({ layers }: ExperienceCanvasProps) {
  return (
    <div style={{ position: "fixed", inset: 0 }}>
      <Canvas camera={{ position: [2.5, 2, 3.5], fov: 50 }}>
        <RenderingProbe />
        <LayerGroups layers={layers} />
      </Canvas>
    </div>
  );
}
