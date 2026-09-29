import type { CameraState } from "@/experience/camera/camera-state";
import type { LayerControllerState } from "@/experience/layers/layer-state";
import type { NavigationState } from "@/experience/navigation/navigation-state";
import type { SelectionState } from "@/experience/selection/selection-state";
import type { ExperienceRuntime } from "./create-experience";

/**
 * Fotografia read-only do estado lógico da experiência em um instante
 * (ARCHITECTURE.md §11.5), para consumidores externos como o rendering.
 *
 * Contém apenas os estados públicos dos controllers; não inclui cenas,
 * grafo, assets nem conceitos de rendering.
 */
export interface ExperienceSnapshot {
  readonly navigation: NavigationState;
  readonly selection: SelectionState;
  readonly camera: CameraState;
  readonly layers: LayerControllerState;
}

/**
 * Lê o estado atual dos controllers e produz uma fotografia.
 *
 * Calculada sob demanda e nunca armazenada. Cada chamada cria um novo objeto
 * agregado, congelado; os estados especializados são compartilhados por
 * referência, pois os controllers já os expõem como snapshots imutáveis.
 * Por isso fotografias antigas permanecem válidas após mudanças posteriores.
 */
export function getExperienceSnapshot({
  navigation,
  selection,
  camera,
  layers,
}: Pick<ExperienceRuntime, "navigation" | "selection" | "camera" | "layers">): ExperienceSnapshot {
  return Object.freeze({
    navigation: navigation.getState(),
    selection: selection.getState(),
    camera: camera.getState(),
    layers: layers.getState(),
  });
}
