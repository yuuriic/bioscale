import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ExperienceRenderingBridge } from "./experience-rendering-bridge";
import { ExperienceRuntimeProvider } from "./experience-runtime-provider";

export const metadata: Metadata = {
  title: "BioScale",
  description: "Explore a vida em todas as escalas.",
};

export default function RootLayout({ children }: { readonly children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0 }}>
        <ExperienceRuntimeProvider>
          {/* Canvas único e persistente: o layout raiz não é remontado entre páginas. */}
          <ExperienceRenderingBridge />
          <div style={{ position: "relative" }}>{children}</div>
        </ExperienceRuntimeProvider>
      </body>
    </html>
  );
}
