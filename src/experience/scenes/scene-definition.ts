import type { AssetReference } from "@/types/asset-reference";

/**
 * Capacidades de interação que uma cena pode oferecer, derivadas das
 * interações do MVP (ARCHITECTURE.md §30) e dos controles de camadas (§13).
 * Ações narrativas próprias de uma estrutura (ex.: revelar cromatina) não
 * são capacidades genéricas e não pertencem a esta lista.
 */
export const SCENE_CAPABILITIES = [
  "rotate",
  "zoom",
  "select",
  "isolate",
  "transparent",
  "explode",
] as const;

export type SceneCapability = (typeof SCENE_CAPABILITIES)[number];

/** Ponto ou direção no espaço da cena, na convenção de ExplodedView (§14). */
export type Vec3 = readonly [x: number, y: number, z: number];

/**
 * Configuração inicial abstrata de câmera, em unidades do espaço da cena.
 * Interpretada pelo CameraController; não é um objeto de
 * câmera de nenhuma biblioteca.
 */
export interface CameraPreset {
  readonly position: Vec3;
  readonly target: Vec3;
  /** Campo de visão vertical em graus, no intervalo (0, 180). */
  readonly fieldOfView?: number;
}

/** Camada visual oferecida pela cena (§13), sem vínculo com meshes. */
export interface VisualLayer {
  /** Identificador estável da camada, único dentro da cena. */
  readonly id: string;
  /** Rótulo de exibição, no idioma único atual (português). */
  readonly label: string;
}

/**
 * Entrada de um asset na composição visual da cena: a identidade opaca do
 * asset (`AssetReference`) e, opcionalmente, a VisualLayer da cena a que ele
 * pertence. Sem `layerId`, o asset é conteúdo base da cena, fora das layers
 * controláveis. Cada asset pertence a no máximo uma layer da cena.
 */
export interface SceneAsset extends AssetReference {
  /** Layer desta cena que contém o asset; deve existir em `layers`. */
  readonly layerId?: string;
}

/**
 * Como um BiologicalNode participa da experiência (ARCHITECTURE.md §19).
 *
 * Dados declarativos e serializáveis: sem funções, objetos de renderização
 * ou parâmetros de animação. O BiologicalNode continua descrevendo apenas
 * o que a estrutura é.
 */
export interface SceneDefinition {
  /** BiologicalNode representado; no máximo uma cena por nó. */
  readonly nodeId: string;
  /**
   * Composição visual da cena: os assets que dela participam e a layer de
   * cada um. É a autoridade da composição, não uma lista de preload nem um
   * catálogo; resolver cada asset pertence à camada de assets.
   */
  readonly assets: readonly SceneAsset[];
  readonly camera: CameraPreset;
  /** Camadas oferecidas; vazio quando a cena não possui camadas. */
  readonly layers: readonly VisualLayer[];
  readonly capabilities: readonly SceneCapability[];
}
