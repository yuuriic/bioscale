import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "BioScale",
  description: "Explore a vida em todas as escalas.",
};

export default function RootLayout({ children }: { readonly children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
