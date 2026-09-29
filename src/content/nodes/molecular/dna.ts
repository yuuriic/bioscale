import type { BiologicalNode } from "@/biology/graph/biological-node";
import { medlinePlusDna } from "@/content/references/medlineplus";
import { openStaxBiologyDnaStructure } from "@/content/references/openstax";

export const dna: BiologicalNode = {
  id: "dna",
  name: "DNA",
  scientificName: "Ácido desoxirribonucleico",
  domain: "molecular",
  type: "dna",
  scale: { dimension: "diameter", value: 2, unit: "nm" },
  educationalContent: {
    summary:
      "O DNA é o material hereditário dos seres humanos e de quase todos os outros organismos. É formado por duas longas fitas de nucleotídeos dispostas em dupla hélice, e sua informação é codificada por quatro bases: adenina (A), guanina (G), citosina (C) e timina (T).",
    characteristics: [
      "A maior parte do DNA está no núcleo (DNA nuclear); uma pequena quantidade está nas mitocôndrias (DNA mitocondrial).",
      "A dupla hélice tem diâmetro uniforme de 2 nm.",
    ],
    sources: [medlinePlusDna, openStaxBiologyDnaStructure],
    reviewStatus: "pending_review",
  },
  relations: [],
};
