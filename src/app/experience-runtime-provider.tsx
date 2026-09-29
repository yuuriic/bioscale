"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { ExperienceRuntime } from "@/experience/engine/create-experience";
import { createApplicationExperience } from "./experience-config";

/**
 * Injeção de dependência da instância do ExperienceRuntime. Transporta apenas
 * a referência ao runtime: não é store e não contém snapshot.
 */
const ExperienceRuntimeContext = createContext<ExperienceRuntime | null>(null);

/**
 * Fronteira de composição entre a aplicação React e o Experience Engine
 * (ARCHITECTURE.md §17.2). Cria o runtime uma vez por montagem, com
 * inicialização preguiçosa de `useState`, e mantém a mesma instância em todos
 * os renders. Em Strict Mode o inicializador pode rodar mais de uma vez em
 * desenvolvimento; como `createApplicationExperience` é síncrono e sem
 * efeitos externos, a instância descartada não deixa rastro.
 */
export function ExperienceRuntimeProvider({ children }: { readonly children: ReactNode }) {
  const [runtime] = useState(createApplicationExperience);
  return <ExperienceRuntimeContext value={runtime}>{children}</ExperienceRuntimeContext>;
}

/** Runtime da experiência montada acima; lança erro fora do Provider. */
export function useExperienceRuntime(): ExperienceRuntime {
  const runtime = useContext(ExperienceRuntimeContext);
  if (runtime === null) {
    throw new Error("useExperienceRuntime must be used within an ExperienceRuntimeProvider.");
  }
  return runtime;
}
