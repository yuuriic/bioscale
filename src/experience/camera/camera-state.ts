import type { CameraPreset } from "@/experience/scenes/scene-definition";

/**
 * Estado lógico da câmera da experiência (ARCHITECTURE.md §11.2).
 *
 * `position` e `target` estão em Scene Units (SU), a unidade abstrata do
 * espaço 3D da experiência. Diferente de `CameraPreset`, o estado é sempre
 * completo: `fieldOfView` (graus, vertical) nunca está ausente. Não é uma
 * câmera de nenhuma biblioteca; a Rendering Layer o aplicará à câmera real.
 */
export interface CameraState extends CameraPreset {
  readonly fieldOfView: number;
}
