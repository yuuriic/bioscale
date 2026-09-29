import { createBiologicalGraph } from "@/biology/graph/biological-graph";
import { mvpBiologicalNodes } from "@/content/nodes/mvp-nodes";
import { createExperience, type ExperienceRuntime } from "@/experience/engine/create-experience";
import type { SceneDefinition } from "@/experience/scenes/scene-definition";
import { createSceneRegistry } from "@/experience/scenes/scene-registry";

/** Nó inicial da experiência atual; ainda não derivado da URL. */
export const INITIAL_NODE_ID = "human";

/**
 * Bootstrap técnico temporário: a menor SceneDefinition válida para iniciar
 * o runtime em `human`. Não é uma cena científica: sem assets, sem layers,
 * sem capabilities. A câmera é estado lógico do Engine e ainda não controla
 * a câmera do Canvas. Será substituída pelas cenas reais do MVP.
 */
const BOOTSTRAP_SCENES: readonly SceneDefinition[] = [
  {
    nodeId: INITIAL_NODE_ID,
    assets: [],
    camera: { position: [0, 0, 5], target: [0, 0, 0] },
    layers: [],
    capabilities: [],
  },
];

/**
 * Cria um novo ExperienceRuntime da aplicação a partir do dataset científico
 * existente. Cada chamada produz uma instância independente: não há runtime
 * no escopo do módulo.
 */
export function createApplicationExperience(): ExperienceRuntime {
  const graph = createBiologicalGraph(mvpBiologicalNodes);
  const scenes = createSceneRegistry(BOOTSTRAP_SCENES, graph);
  return createExperience({ graph, scenes, initialNodeId: INITIAL_NODE_ID });
}
