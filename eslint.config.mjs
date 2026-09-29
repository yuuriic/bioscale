import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Regra de dependência (ARCHITECTURE.md §35):
//   UI → Experience Engine → Domain   e   Rendering → Assets
// O domínio científico não pode depender de React, Three.js, GSAP, DOM ou WebGL.

const FRAMEWORKS = [
  "react",
  "react/*",
  "react-dom",
  "react-dom/*",
  "next",
  "next/*",
  "three",
  "three/*",
  "@react-three/*",
  "gsap",
  "gsap/*",
  "lenis",
  "lenis/*",
  "zustand",
  "zustand/*",
];

const layer = (name) => [`@/${name}`, `@/${name}/*`];

const PARENT_RELATIVE = {
  group: ["../*"],
  message: "Use o alias @/ para importar fora do diretório atual.",
};

const restrict = (...groups) => [
  "error",
  { patterns: [PARENT_RELATIVE, ...groups] },
];

const frameworkGroup = {
  group: FRAMEWORKS,
  message: "Esta camada deve permanecer independente de frameworks de UI/renderização.",
};

const layersGroup = (...names) => ({
  group: names.flatMap(layer),
  message: "Viola a regra de dependência entre camadas (ARCHITECTURE.md §35).",
});

const UPPER_LAYERS = ["app", "components", "experience", "rendering", "store", "hooks"];

// Rendering → Experience, nunca o contrário: a experiência não conhece
// renderer nem bibliotecas de renderização.
const renderingLibrariesGroup = {
  group: ["three", "three/*", "@react-three/*"],
  message: "O Experience Engine não pode depender de bibliotecas de renderização.",
};

// O Experience Engine é independente de framework; a composição React vive
// em `app` (ARCHITECTURE.md §17.2).
const uiFrameworksGroup = {
  group: ["react", "react/*", "react-dom", "react-dom/*", "next", "next/*"],
  message: "O Experience Engine não pode depender de React ou Next.js.",
};

// Módulos da experiência em TypeScript puro: estado e contratos declarativos
// que dependem do grafo por injeção, nunca do dataset concreto.
const PURE_EXPERIENCE = [
  "experience/navigation",
  "experience/scenes",
  "experience/camera",
  "experience/selection",
  "experience/engine",
  "experience/layers",
].map((name) => `src/${name}/**/*.{ts,tsx}`);

// Camadas independentes de plataforma: além de imports, não podem tocar
// DOM/WebGL através de globais nem de tipos da lib "dom".
const PLATFORM_FREE = [
  ...["types", "utils", "content", "biology"].map((name) => `src/${name}/**/*.{ts,tsx}`),
  ...PURE_EXPERIENCE,
];

const PLATFORM_GLOBALS = [
  "window",
  "document",
  "navigator",
  "location",
  "localStorage",
  "sessionStorage",
  "requestAnimationFrame",
  "cancelAnimationFrame",
];

const PLATFORM_TYPES = [
  "Window",
  "Document",
  "Element",
  "HTMLElement",
  "HTMLCanvasElement",
  "WebGLRenderingContext",
  "WebGL2RenderingContext",
];

const platformMessage =
  "O domínio não pode depender de DOM/WebGL (ARCHITECTURE.md §35).";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "import/no-cycle": "error",
      "no-restricted-imports": restrict(),
    },
  },
  {
    files: ["src/types/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": restrict(
        frameworkGroup,
        layersGroup(...UPPER_LAYERS, "biology", "content", "assets", "utils"),
      ),
    },
  },
  {
    files: ["src/utils/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": restrict(
        frameworkGroup,
        layersGroup(...UPPER_LAYERS, "biology", "content", "assets"),
      ),
    },
  },
  {
    files: ["src/content/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": restrict(
        frameworkGroup,
        layersGroup(...UPPER_LAYERS, "assets"),
      ),
    },
  },
  {
    files: ["src/biology/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": restrict(
        frameworkGroup,
        layersGroup(...UPPER_LAYERS, "content", "assets"),
      ),
    },
  },
  {
    files: ["src/assets/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": restrict(
        layersGroup(...UPPER_LAYERS, "biology", "content"),
      ),
    },
  },
  {
    files: PLATFORM_FREE,
    rules: {
      "no-restricted-globals": [
        "error",
        ...PLATFORM_GLOBALS.map((name) => ({ name, message: platformMessage })),
      ],
      "@typescript-eslint/no-restricted-types": [
        "error",
        {
          types: Object.fromEntries(
            PLATFORM_TYPES.map((name) => [name, { message: platformMessage }]),
          ),
        },
      ],
    },
  },
  {
    files: ["src/experience/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": restrict(
        renderingLibrariesGroup,
        uiFrameworksGroup,
        layersGroup("app", "components", "rendering"),
      ),
    },
  },
  // O rendering consome a experiência, mas não obtém o runtime da composição
  // da aplicação: app → rendering, nunca rendering → app.
  {
    files: ["src/rendering/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": restrict(layersGroup("app")),
    },
  },
  // Testes de integração podem importar content.
  {
    files: PURE_EXPERIENCE,
    rules: {
      "no-restricted-imports": restrict(
        frameworkGroup,
        layersGroup("app", "components", "rendering", "store", "hooks", "assets"),
      ),
    },
  },
  {
    files: PURE_EXPERIENCE,
    ignores: ["**/*.test.ts"],
    rules: {
      "no-restricted-imports": restrict(
        frameworkGroup,
        layersGroup("app", "components", "rendering", "store", "hooks", "assets", "content"),
      ),
    },
  },
]);
