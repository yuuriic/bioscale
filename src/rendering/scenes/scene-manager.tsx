import type { LayerControllerState } from "@/experience/layers/layer-state";
import type { SceneDefinition } from "@/experience/scenes/scene-definition";
import { LayerGroups } from "@/rendering/layers/layer-groups";

export interface SceneManagerProps {
  /**
   * Cena ativa, derivada pela aplicação. `undefined` significa apenas que não
   * há representação visual registrada para o nó atual; não é carregamento
   * nem erro.
   */
  readonly scene: SceneDefinition | undefined;
  /** Estado lógico atual das layers. */
  readonly layers: LayerControllerState;
}

/**
 * Estrutura da cena ativa dentro do Canvas persistente (ARCHITECTURE.md §18).
 * Sem cena, não monta nada. Com cena, monta um grupo identificado pelo nó,
 * com os grupos de layer. Ainda não interpreta câmera, assets nem
 * capabilities, e não inventa conteúdo visual.
 */
export function SceneManager({ scene, layers }: SceneManagerProps) {
  if (scene === undefined) {
    return null;
  }
  // A key no elemento raiz faz o React remontar a subárvore quando a cena muda.
  return (
    <group key={scene.nodeId} name={`scene:${scene.nodeId}`}>
      <LayerGroups layers={layers} />
    </group>
  );
}
