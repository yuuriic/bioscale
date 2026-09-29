"use client";

import { Canvas } from "@react-three/fiber";
import { RenderingProbe } from "@/rendering/debug/rendering-probe";

/**
 * Canvas 3D persistente da experiência (ARCHITECTURE.md §17). Existe uma
 * única instância, montada no layout raiz; cenas futuras serão renderizadas
 * dentro dele, sem recriar o contexto WebGL.
 *
 * A câmera é apenas técnica, para tornar o probe visível: ainda não é
 * controlada pelo CameraController nem lê o ExperienceSnapshot.
 */
export function ExperienceCanvas() {
  return (
    <div style={{ position: "fixed", inset: 0 }}>
      <Canvas camera={{ position: [2.5, 2, 3.5], fov: 50 }}>
        <RenderingProbe />
      </Canvas>
    </div>
  );
}
