import type { LayerState } from "@/experience/layers/layer-state";

/**
 * Se uma layer deve ser renderizada, segundo o estado lógico (ARCHITECTURE.md
 * §17.4): precisa estar visível e, havendo isolamento, ser a layer isolada.
 * Isolar uma layer oculta não a torna visível. A transparência lógica ainda
 * não é interpretada pelo rendering.
 */
export function isLayerRendered(layer: LayerState, isolatedLayerId: string | undefined): boolean {
  return layer.visible && (isolatedLayerId === undefined || isolatedLayerId === layer.layerId);
}
