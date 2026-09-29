import type { ExperienceRuntime } from "@/experience/engine/create-experience";
import {
  getExperienceSnapshot,
  type ExperienceSnapshot,
} from "@/experience/engine/experience-snapshot";

/** Leitura estável do snapshot de um runtime, no formato de `getSnapshot`. */
export interface ExperienceSnapshotReader {
  getSnapshot(): ExperienceSnapshot;
}

/**
 * Estabiliza a identidade do ExperienceSnapshot para o `useSyncExternalStore`
 * (ARCHITECTURE.md §17.3), que exige a mesma referência enquanto nada mudou.
 *
 * Guarda apenas o último snapshot devolvido. A cada leitura obtém um snapshot
 * novo e, se suas quatro partes forem as mesmas referências das anteriores,
 * devolve o anterior. A comparação por referência basta porque os controllers
 * preservam a identidade do estado quando nada muda (§11.6). Cada reader é
 * ligado a um runtime e tem cache próprio.
 */
export function createExperienceSnapshotReader(
  runtime: Pick<ExperienceRuntime, "navigation" | "selection" | "camera" | "layers">,
): ExperienceSnapshotReader {
  let last: ExperienceSnapshot | undefined;

  return {
    getSnapshot: () => {
      const next = getExperienceSnapshot(runtime);
      if (last !== undefined && hasSameParts(last, next)) {
        return last;
      }
      last = next;
      return next;
    },
  };
}

function hasSameParts(a: ExperienceSnapshot, b: ExperienceSnapshot): boolean {
  return (
    a.navigation === b.navigation &&
    a.selection === b.selection &&
    a.camera === b.camera &&
    a.layers === b.layers
  );
}
