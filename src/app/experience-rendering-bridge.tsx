"use client";

import { ExperienceCanvas } from "@/rendering/canvas/experience-canvas";
import { useExperienceScenes } from "./experience-runtime-provider";
import { useExperienceSnapshot } from "./use-experience-snapshot";

/**
 * Ponte da aplicação para o rendering (ARCHITECTURE.md §17.4): lê o snapshot
 * da experiência, deriva a cena ativa e injeta no Canvas somente o que ele
 * interpreta. O rendering não conhece a aplicação, o runtime, o registry nem
 * o snapshot completo.
 *
 * A cena ativa é `getScene(currentNode)`: a referência congelada do registry,
 * estável enquanto o nó não muda, ou `undefined` se o nó não tem cena. Usa o
 * snapshot completo, então renderiza de novo quando qualquer parte muda; as
 * props `scene` e `layers` mantêm a referência enquanto não mudam.
 */
export function ExperienceRenderingBridge() {
  const { navigation, layers } = useExperienceSnapshot();
  const scene = useExperienceScenes().getScene(navigation.currentNode);
  return <ExperienceCanvas scene={scene} layers={layers} />;
}
