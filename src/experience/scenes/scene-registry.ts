import type { BiologicalGraph } from "@/biology/graph/biological-graph";
import {
  SCENE_CAPABILITIES,
  type SceneCapability,
  type SceneDefinition,
  type Vec3,
} from "./scene-definition";
import { validateCameraPreset } from "./validate-camera-preset";

export type SceneRegistryIssue =
  | { readonly code: "unknown_scene_node"; readonly nodeId: string }
  | { readonly code: "duplicate_scene_node"; readonly nodeId: string }
  | { readonly code: "duplicate_asset"; readonly nodeId: string; readonly assetId: string }
  | { readonly code: "duplicate_layer"; readonly nodeId: string; readonly layerId: string }
  | {
      readonly code: "unknown_asset_layer";
      readonly nodeId: string;
      readonly assetId: string;
      readonly layerId: string;
    }
  | { readonly code: "unknown_capability"; readonly nodeId: string; readonly capability: string }
  | {
      readonly code: "duplicate_capability";
      readonly nodeId: string;
      readonly capability: SceneCapability;
    }
  | { readonly code: "invalid_camera"; readonly nodeId: string };

export class SceneRegistryValidationError extends Error {
  readonly issues: readonly SceneRegistryIssue[];

  constructor(issues: readonly SceneRegistryIssue[]) {
    super(`Scene registry is invalid: ${issues.length} issue(s) found.`);
    this.name = "SceneRegistryValidationError";
    this.issues = issues;
  }
}

/**
 * Cenas declaradas para nós do BiologicalGraph.
 *
 * Nem todo nó precisa de cena: o grafo pode conter conhecimento que ainda
 * não possui experiência visual. `getScene` devolve `undefined` nesse caso.
 */
export interface SceneRegistry {
  readonly scenes: readonly SceneDefinition[];
  getScene(nodeId: string): SceneDefinition | undefined;
}

const KNOWN_CAPABILITIES: ReadonlySet<string> = new Set(SCENE_CAPABILITIES);

/**
 * Verifica a consistência de um conjunto de cenas contra o grafo: cada cena
 * aponta para um nó existente, há no máximo uma cena por nó e os dados
 * declarativos são coerentes, incluindo que cada asset aparece uma única vez
 * e que a layer declarada por um asset existe na cena. Não verifica se os
 * assets existem; isso pertence à camada de assets.
 */
export function validateSceneDefinitions(
  scenes: readonly SceneDefinition[],
  graph: BiologicalGraph,
): SceneRegistryIssue[] {
  const issues: SceneRegistryIssue[] = [];
  const nodeIds = new Set<string>();

  for (const scene of scenes) {
    const { nodeId } = scene;
    if (graph.getNode(nodeId) === undefined) {
      issues.push({ code: "unknown_scene_node", nodeId });
    }
    if (nodeIds.has(nodeId)) {
      issues.push({ code: "duplicate_scene_node", nodeId });
    }
    nodeIds.add(nodeId);

    for (const assetId of duplicates(scene.assets.map((asset) => asset.assetId))) {
      issues.push({ code: "duplicate_asset", nodeId, assetId });
    }
    for (const layerId of duplicates(scene.layers.map((layer) => layer.id))) {
      issues.push({ code: "duplicate_layer", nodeId, layerId });
    }
    const layerIds = new Set(scene.layers.map((layer) => layer.id));
    for (const { assetId, layerId } of scene.assets) {
      if (layerId !== undefined && !layerIds.has(layerId)) {
        issues.push({ code: "unknown_asset_layer", nodeId, assetId, layerId });
      }
    }
    for (const capability of scene.capabilities) {
      if (!KNOWN_CAPABILITIES.has(capability)) {
        issues.push({ code: "unknown_capability", nodeId, capability });
      }
    }
    for (const capability of duplicates(scene.capabilities)) {
      issues.push({ code: "duplicate_capability", nodeId, capability });
    }
    if (validateCameraPreset(scene.camera).length > 0) {
      issues.push({ code: "invalid_camera", nodeId });
    }
  }

  return issues;
}

/**
 * Compõe o registro a partir de cenas explícitas, validadas contra o grafo
 * recebido. As cenas são copiadas e congeladas: mutações posteriores nos
 * objetos do chamador não alcançam o registro, e consumidores não podem
 * alterar o que ele devolve.
 */
export function createSceneRegistry(
  input: readonly SceneDefinition[],
  graph: BiologicalGraph,
): SceneRegistry {
  const scenes = Object.freeze(input.map(freezeScene));
  const issues = validateSceneDefinitions(scenes, graph);
  if (issues.length > 0) {
    throw new SceneRegistryValidationError(issues);
  }

  const scenesByNodeId = new Map(scenes.map((scene) => [scene.nodeId, scene]));

  return Object.freeze({
    scenes,
    getScene: (nodeId: string) => scenesByNodeId.get(nodeId),
  });
}

function duplicates<T>(values: readonly T[]): T[] {
  const seen = new Set<T>();
  const repeated = new Set<T>();
  for (const value of values) {
    if (seen.has(value)) {
      repeated.add(value);
    }
    seen.add(value);
  }
  return [...repeated];
}

function freezeVec3([x, y, z]: Vec3): Vec3 {
  return Object.freeze([x, y, z] as const);
}

function freezeScene(scene: SceneDefinition): SceneDefinition {
  const { position, target, fieldOfView } = scene.camera;
  return Object.freeze({
    nodeId: scene.nodeId,
    assets: Object.freeze(
      scene.assets.map(({ assetId, layerId }) =>
        Object.freeze(layerId === undefined ? { assetId } : { assetId, layerId }),
      ),
    ),
    camera: Object.freeze({
      position: freezeVec3(position),
      target: freezeVec3(target),
      ...(fieldOfView === undefined ? {} : { fieldOfView }),
    }),
    layers: Object.freeze(scene.layers.map(({ id, label }) => Object.freeze({ id, label }))),
    capabilities: Object.freeze([...scene.capabilities]),
  });
}
