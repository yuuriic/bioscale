"use client";

import { ExperienceCanvas } from "@/rendering/canvas/experience-canvas";
import { useExperienceSnapshot } from "./use-experience-snapshot";

/**
 * Ponte da aplicação para o rendering (ARCHITECTURE.md §17.4): lê o snapshot
 * da experiência e injeta no Canvas somente o estado que ele interpreta. O
 * rendering não conhece a aplicação, o runtime nem o snapshot completo.
 *
 * Usa o snapshot completo, então renderiza de novo quando qualquer parte muda;
 * o Canvas recebe a mesma referência de `layers` enquanto elas não mudam.
 */
export function ExperienceRenderingBridge() {
  const { layers } = useExperienceSnapshot();
  return <ExperienceCanvas layers={layers} />;
}
