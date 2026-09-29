import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Complementa o ESLint e o tsconfig.domain.json: o domínio científico e o
// dataset permanecem independentes de frameworks (ARCHITECTURE.md §35).
const SRC = fileURLToPath(new URL("..", import.meta.url));
const DOMAIN_DIRECTORIES = ["biology", "content", "types", "utils"];

const FORBIDDEN_MODULE =
  /^(react|react-dom|next|three|@react-three\/.+|gsap|lenis|zustand)(\/.*)?$/;

const IMPORT_SPECIFIER = /(?:import|export)[^'"]*?from\s*['"]([^'"]+)['"]|import\s*['"]([^'"]+)['"]/g;

function domainSourceFiles(): string[] {
  return DOMAIN_DIRECTORIES.flatMap((directory) =>
    readdirSync(`${SRC}${directory}`, { recursive: true, encoding: "utf8" })
      .filter((file) => /\.tsx?$/.test(file) && !/\.test\.tsx?$/.test(file))
      .map((file) => `${directory}/${file.replaceAll("\\", "/")}`),
  );
}

describe("domain boundaries", () => {
  const files = domainSourceFiles();

  it("finds the domain contracts and dataset to inspect", () => {
    expect(files).toContain("biology/graph/biological-node.ts");
    expect(files).toContain("content/nodes/mvp-nodes.ts");
  });

  it("does not import UI, rendering, animation or state frameworks", () => {
    for (const file of files) {
      const source = readFileSync(`${SRC}${file}`, "utf8");
      const specifiers = [...source.matchAll(IMPORT_SPECIFIER)].map((m) => m[1] ?? m[2]);
      const forbidden = specifiers.filter((s) => s !== undefined && FORBIDDEN_MODULE.test(s));
      expect(forbidden, file).toEqual([]);
    }
  });
});
