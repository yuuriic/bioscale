import type { CameraController } from "@/experience/camera/camera-controller";
import {
  breadcrumbAt,
  type NavigationController,
} from "@/experience/navigation/navigation-controller";
import type { SceneDefinition } from "@/experience/scenes/scene-definition";
import type { SceneRegistry } from "@/experience/scenes/scene-registry";
import type { SelectionController } from "@/experience/selection/selection-controller";

/**
 * Não há SceneDefinition para o ID: não existe experiência visual
 * disponível. O ID pode ou não ser um BiologicalNode; o ExperienceController
 * não consulta o grafo para distinguir.
 */
export class SceneNotAvailableError extends Error {
  readonly nodeId: string;

  constructor(nodeId: string) {
    super(`No scene is available for "${nodeId}".`);
    this.name = "SceneNotAvailableError";
    this.nodeId = nodeId;
  }
}

export interface ExperienceControllerDependencies {
  readonly navigation: NavigationController;
  readonly selection: SelectionController;
  readonly camera: CameraController;
  readonly scenes: SceneRegistry;
}

/**
 * Coordenação mínima do Experience Engine (ARCHITECTURE.md §11.4): mantém
 * consistentes os controllers quando a experiência muda de cena, seja por
 * entrada, por `back` ou por retorno a um breadcrumb.
 *
 * Não possui estado próprio nem histórico: o NavigationController é a única
 * fonte do percurso, e os controllers seguem utilizáveis diretamente (o
 * percurso pode conter nós sem cena). A construção não altera nenhum deles.
 * Mudanças são lógicas e imediatas: transições visuais ainda não existem.
 *
 * Toda mudança de cena resolve o destino e sua SceneDefinition antes de
 * alterar qualquer controller, e então navega, limpa a seleção e aplica o
 * preset de câmera da cena, que passa a ser a base de reset. Sem rollback,
 * pelas invariantes:
 * - a navegação é a primeira mutação e falha antes de alterar estado;
 * - `clearSelection` não falha;
 * - `applyPreset` não falha para cenas de `createSceneRegistry`, que as
 *   valida com a mesma regra usada pelo CameraController. Outra
 *   implementação de SceneRegistry precisa preservar essa invariante.
 */
export class ExperienceController {
  readonly #navigation: NavigationController;
  readonly #selection: SelectionController;
  readonly #camera: CameraController;
  readonly #scenes: SceneRegistry;

  constructor({ navigation, selection, camera, scenes }: ExperienceControllerDependencies) {
    this.#navigation = navigation;
    this.#selection = selection;
    this.#camera = camera;
    this.#scenes = scenes;
  }

  /**
   * Entra na experiência visual do nó. Reentrar na cena atual é explícito:
   * não adiciona etapa ao percurso, mas limpa a seleção e reaplica o preset.
   */
  enter(nodeId: string): void {
    const scene = this.#requireScene(nodeId);
    this.#navigation.navigate(nodeId);
    this.#enterScene(scene);
  }

  /** Volta uma etapa do percurso. Sem histórico, não altera nada. */
  back(): void {
    const destination = this.#navigation.getState().history.at(-1);
    if (destination === undefined) {
      return;
    }
    const scene = this.#requireScene(destination);
    this.#navigation.back();
    this.#enterScene(scene);
  }

  /**
   * Retorna à posição `index` dos breadcrumbs, identificada pela posição e
   * não pelo ID. Índice inválido lança `InvalidBreadcrumbIndexError`; a
   * posição atual não altera nada.
   */
  returnToBreadcrumb(index: number): void {
    const breadcrumbs = this.#navigation.getBreadcrumbs();
    const destination = breadcrumbAt(breadcrumbs, index);
    if (index === breadcrumbs.length - 1) {
      return;
    }
    const scene = this.#requireScene(destination);
    this.#navigation.returnToBreadcrumb(index);
    this.#enterScene(scene);
  }

  #requireScene(nodeId: string): SceneDefinition {
    const scene = this.#scenes.getScene(nodeId);
    if (scene === undefined) {
      throw new SceneNotAvailableError(nodeId);
    }
    return scene;
  }

  /** Estado visual após a navegação: sem seleção, câmera no preset da cena. */
  #enterScene(scene: SceneDefinition): void {
    this.#selection.clearSelection();
    this.#camera.applyPreset(scene.camera);
  }
}
