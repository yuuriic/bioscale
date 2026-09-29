import type { ScientificReference } from "@/biology/graph/scientific-reference";

const PUBLISHER = "MedlinePlus Genetics. Bethesda (MD): National Library of Medicine (US)";

export const medlinePlusCell: ScientificReference = {
  id: "medlineplus-genetics-cell",
  citation: `${PUBLISHER}. What is a cell? Updated 2021 Feb 22.`,
  url: "https://medlineplus.gov/genetics/understanding/basics/cell/",
  accessedOn: "2026-09-28",
};

export const medlinePlusChromosome: ScientificReference = {
  id: "medlineplus-genetics-chromosome",
  citation: `${PUBLISHER}. What is a chromosome? Updated 2021 Jan 19.`,
  url: "https://medlineplus.gov/genetics/understanding/basics/chromosome/",
  accessedOn: "2026-09-28",
};

export const medlinePlusDna: ScientificReference = {
  id: "medlineplus-genetics-dna",
  citation: `${PUBLISHER}. What is DNA? Updated 2021 Jan 19.`,
  url: "https://medlineplus.gov/genetics/understanding/basics/dna/",
  accessedOn: "2026-09-28",
};
