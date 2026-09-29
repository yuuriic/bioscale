import { useState, useSyncExternalStore } from "react";
import type { ExperienceSnapshot } from "@/experience/engine/experience-snapshot";
import { createExperienceSnapshotReader } from "./experience-snapshot-reader";
import { useExperienceRuntime } from "./experience-runtime-provider";

/**
 * Leitura reativa do ExperienceSnapshot (ARCHITECTURE.md §17.3): o
 * componente renderiza de novo quando o runtime notifica uma mudança.
 *
 * - `runtime.subscribe` é a invalidação; é uma função estável do runtime.
 * - O reader, criado uma vez por consumidor, estabiliza a identidade do
 *   snapshot. O runtime vem do Provider e é estável durante a montagem dele;
 *   se o Provider remontar, este consumidor também remonta.
 * - `getServerSnapshot` usa o mesmo reader: no servidor e na hidratação o
 *   runtime acabou de ser criado no estado inicial determinístico, então o
 *   markup do servidor e a primeira leitura do cliente coincidem por valor,
 *   sem depender de identidade entre as duas instâncias.
 *
 * Somente leitura: mutações continuam passando pelos controllers do runtime.
 */
export function useExperienceSnapshot(): ExperienceSnapshot {
  const runtime = useExperienceRuntime();
  const [reader] = useState(() => createExperienceSnapshotReader(runtime));
  return useSyncExternalStore(runtime.subscribe, reader.getSnapshot, reader.getSnapshot);
}
