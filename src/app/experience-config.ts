import { createBiologicalGraph } from "@/biology/graph/biological-graph";
import { mvpBiologicalNodes } from "@/content/nodes/mvp-nodes";
import { createExperience, type ExperienceRuntime } from "@/experience/engine/create-experience";
import type { SceneDefinition } from "@/experience/scenes/scene-definition";
import { createSceneRegistry, type SceneRegistry } from "@/experience/scenes/scene-registry";

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
 * Composição da experiência na aplicação (ARCHITECTURE.md §17.2): o runtime e
 * o SceneRegistry com que ele foi criado. Apenas referências; não é store e
 * não contém snapshot.
 */
export interface ApplicationExperience {
  readonly runtime: ExperienceRuntime;
  /** A mesma instância entregue ao Engine; somente leitura. */
  readonly scenes: SceneRegistry;
}

/**
 * Cria uma nova composição da aplicação a partir do dataset científico
 * existente. O mesmo SceneRegistry é entregue a `createExperience` (e daí ao
 * ExperienceController) e devolvido na composição, de modo que a aplicação e
 * o Engine consultam a mesma autoridade de cenas. Cada chamada produz
 * instâncias independentes: nada fica no escopo do módulo.
 */
export function createApplicationExperience(): ApplicationExperience {
  const graph = createBiologicalGraph(mvpBiologicalNodes);
  const scenes = createSceneRegistry(BOOTSTRAP_SCENES, graph);
  const runtime = createExperience({ graph, scenes, initialNodeId: INITIAL_NODE_ID });
  return Object.freeze({ runtime, scenes });
}
