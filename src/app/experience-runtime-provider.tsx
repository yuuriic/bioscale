"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { ExperienceRuntime } from "@/experience/engine/create-experience";
import type { SceneRegistry } from "@/experience/scenes/scene-registry";
import { createApplicationExperience, type ApplicationExperience } from "./experience-config";

/**
 * Injeção de dependência da composição da experiência: o runtime e o
 * SceneRegistry. Transporta apenas referências: não é store e não contém
 * snapshot. É interno; consumidores usam os acessores abaixo.
 */
const ApplicationExperienceContext = createContext<ApplicationExperience | null>(null);

/**
 * Fronteira de composição entre a aplicação React e o Experience Engine
 * (ARCHITECTURE.md §17.2). Cria a composição uma vez por montagem, com
 * inicialização preguiçosa de `useState`, e mantém as mesmas instâncias em
 * todos os renders. Em Strict Mode o inicializador pode rodar mais de uma vez
 * em desenvolvimento; como `createApplicationExperience` é síncrono e sem
 * efeitos externos, a instância descartada não deixa rastro.
 */
export function ExperienceRuntimeProvider({ children }: { readonly children: ReactNode }) {
  const [experience] = useState(createApplicationExperience);
  return <ApplicationExperienceContext value={experience}>{children}</ApplicationExperienceContext>;
}

/** Runtime da experiência montada acima; lança erro fora do Provider. */
export function useExperienceRuntime(): ExperienceRuntime {
  return useApplicationExperience("useExperienceRuntime").runtime;
}

/**
 * SceneRegistry da experiência montada acima: a mesma instância usada pelo
 * Engine, somente leitura. Lança erro fora do Provider.
 */
export function useExperienceScenes(): SceneRegistry {
  return useApplicationExperience("useExperienceScenes").scenes;
}

function useApplicationExperience(hookName: string): ApplicationExperience {
  const experience = useContext(ApplicationExperienceContext);
  if (experience === null) {
    throw new Error(`${hookName} must be used within an ExperienceRuntimeProvider.`);
  }
  return experience;
}
