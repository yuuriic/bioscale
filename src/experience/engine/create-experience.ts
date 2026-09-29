import type { BiologicalGraph } from "@/biology/graph/biological-graph";
import { UnknownBiologicalNodeError } from "@/biology/graph/unknown-biological-node-error";
import { CameraController } from "@/experience/camera/camera-controller";
import { LayerController } from "@/experience/layers/layer-controller";
import { NavigationController } from "@/experience/navigation/navigation-controller";
import type { SceneRegistry } from "@/experience/scenes/scene-registry";
import { SelectionController } from "@/experience/selection/selection-controller";
import {
  createExperienceChangeNotifier,
  type ExperienceChangeListener,
} from "./experience-change-notifier";
import { ExperienceController, SceneNotAvailableError } from "./experience-controller";

export interface CreateExperienceOptions {
  readonly graph: BiologicalGraph;
  readonly scenes: SceneRegistry;
  /** Nó da cena inicial; precisa existir no grafo e possuir SceneDefinition. */
  readonly initialNodeId: string;
}

/**
 * Referências aos controllers de uma experiência. Não é estado: cada
 * controller continua sendo a fonte de verdade do que controla.
 *
 * `subscribe` avisa, de forma síncrona e sem payload, quando uma operação
 * feita por qualquer uma dessas referências muda o estado observável
 * (ARCHITECTURE.md §11.6). O estado é lido com `getExperienceSnapshot`.
 */
export interface ExperienceRuntime {
  readonly experience: ExperienceController;
  readonly navigation: NavigationController;
  readonly selection: SelectionController;
  readonly camera: CameraController;
  readonly layers: LayerController;
  subscribe(listener: ExperienceChangeListener): () => void;
}

/**
 * Composição da experiência inicial (ARCHITECTURE.md §11.4): constrói os
 * controllers já coerentes com a cena do nó inicial e os entrega ao
 * ExperienceController, sem mutações posteriores (não chama `enter`).
 *
 * - nó inexistente no grafo: `UnknownBiologicalNodeError`;
 * - nó sem SceneDefinition: `SceneNotAvailableError`, sem fallback.
 *
 * Ambos são verificados antes de construir qualquer controller. O grafo e o
 * registro devem descrever o mesmo conhecimento; garantir isso é
 * responsabilidade de quem os compõe.
 *
 * O ExperienceController recebe os controllers originais; o runtime expõe
 * versões observadas das mesmas instâncias. Assim, uma operação coordenada
 * gera uma única notificação, e mutações diretas nos controllers também são
 * notificadas.
 */
export function createExperience({
  graph,
  scenes,
  initialNodeId,
}: CreateExperienceOptions): ExperienceRuntime {
  if (graph.getNode(initialNodeId) === undefined) {
    throw new UnknownBiologicalNodeError(initialNodeId);
  }
  const scene = scenes.getScene(initialNodeId);
  if (scene === undefined) {
    throw new SceneNotAvailableError(initialNodeId);
  }

  const navigation = new NavigationController(graph, { defaultNodeId: initialNodeId });
  const selection = new SelectionController(graph);
  const camera = new CameraController(scene.camera);
  const layers = new LayerController(scene.layers);
  const experience = new ExperienceController({ navigation, selection, camera, layers, scenes });
  const notifier = createExperienceChangeNotifier([navigation, selection, camera, layers]);

  return Object.freeze({
    experience: notifier.observe(experience),
    navigation: notifier.observe(navigation),
    selection: notifier.observe(selection),
    camera: notifier.observe(camera),
    layers: notifier.observe(layers),
    subscribe: notifier.subscribe,
  });
}
