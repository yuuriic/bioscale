import type { LayerControllerState } from "@/experience/layers/layer-state";
import { isLayerRendered } from "./layer-visibility";

/**
 * Um grupo de cena por VisualLayer, na ordem declarada, com a visibilidade
 * derivada do estado lógico. Os grupos ainda estão vazios: o conteúdo virá
 * dos assets de cada layer.
 */
export function LayerGroups({ layers }: { readonly layers: LayerControllerState }) {
  return (
    <>
      {layers.layers.map((layer) => (
        <group
          key={layer.layerId}
          name={layer.layerId}
          visible={isLayerRendered(layer, layers.isolatedLayerId)}
        />
      ))}
    </>
  );
}
