# Fundação estrutural

Este documento descreve a organização implementada nesta etapa. A fonte de
verdade arquitetural permanece [ARCHITECTURE.md](./ARCHITECTURE.md), especialmente
as seções 5, 34 e 35.

| Diretório | Responsabilidade |
| --- | --- |
| `src/app` | Rotas, layout e composição da aplicação Next.js. |
| `src/components/ui` | Componentes de apresentação e controles sem conhecimento de renderização. |
| `src/components/experience` | Integração da interface React com a experiência. |
| `src/experience/engine` | Coordenação futura dos controladores da experiência. |
| `src/experience/camera` | Controle futuro da câmera, centralizado nesta camada. |
| `src/experience/navigation` | Navegação, histórico, caminhos e integração de deep links. |
| `src/experience/interaction` | Seleção e associação de interações a identificadores biológicos. |
| `src/experience/transitions` | Coordenação futura das transições entre estruturas e escalas. |
| `src/experience/layers` | Controle futuro das camadas visuais. |
| `src/experience/scenes` | Definições e coordenação futura da cena ativa. |
| `src/biology/graph` | Contratos, validação estrutural e consulta do grafo científico. |
| `src/biology/anatomy`, `histology`, `cellular`, `molecular` | Regras específicas dos quatro domínios, quando necessárias. |
| `src/assets/registry` | Metadados que resolverão identificadores de assets em recursos visuais. |
| `src/assets/loaders` | Carregamento futuro dos recursos visuais. |
| `src/content/nodes` | Instâncias de `BiologicalNode` (dataset), organizadas por domínio, e a composição do MVP. |
| `src/content/references` | Instâncias de `ScientificReference` usadas pelo dataset. |
| `src/store` | Estado da aplicação, separado do conhecimento científico. |
| `src/hooks` | Adaptação de comportamento para componentes React. |
| `src/types` | Contratos compartilhados independentes de plataforma, como `AssetReference`. |
| `src/utils` | Utilitários independentes de plataforma, apenas quando houver uso concreto. |

## Limites desta etapa

Os diretórios ainda sem implementação são preservados por `.gitkeep`. Esses
arquivos não introduzem módulos, APIs vazias ou dependências. Não há barrels.
Os contratos científicos existentes permanecem em `biology/graph`; os dados
concretos deverão ficar em `content`, separados de React.

A referência visual no domínio contém somente `assetId`. Resolução, carregamento
e renderização pertencem a outras camadas. As relações do grafo são explícitas;
consultar relações de entrada não cria relações inversas nem uma árvore rígida.

O único controlador implementado é o `NavigationController`
(`src/experience/navigation`, seção abaixo). Não foram implementados os demais
controladores, cenas, estado global, Three.js, animações ou modelos. As fixtures dos testes de `biology/graph` são
estruturais e não constituem conteúdo educacional.

## Dataset científico inicial

`src/content/nodes` contém os oito nós da jornada do MVP (ARCHITECTURE.md §29):
`human`, `nervous-system`, `brain`, `nervous-tissue`, `neuron`, `nucleus`,
`chromosome` e `dna`, em subdiretórios por domínio. `mvp-nodes.ts` os compõe
explicitamente em `mvpBiologicalNodes`, pronto para `createBiologicalGraph`.
A ordem da jornada pertence à experiência, não ao dataset.

- `brain` é o encéfalo inteiro, não o cerebrum ("cérebro").
- Todo texto científico está em `educationalContent`, com referências verificadas
  e `accessedOn` para fontes web; o nó não possui texto científico próprio.
- Todo o conteúdo está em `pending_review`: fundamentado em fontes, ainda sem
  revisão por especialista (ARCHITECTURE.md §23).
- Apenas `dna` possui `scale` (diâmetro de 2 nm); os demais não têm valor
  sustentado por fonte verificada.
- O grafo é parcial por decisão: glia, histonas, regiões do encéfalo e outras
  estruturas não estão modeladas. Ausência de relação não significa ausência na
  biologia. Não há cardinalidade nem i18n (ARCHITECTURE.md §7–8).

## NavigationController

`src/experience/navigation` contém o `NavigationState` e o `NavigationController`
(ARCHITECTURE.md §11.1), em TypeScript puro. O controller recebe o
`BiologicalGraph` e o nó padrão por injeção; não conhece o dataset do MVP. Os
testes de integração com `mvpBiologicalNodes` ficam em
`navigation-controller.mvp.test.ts`, fora do código do controller.

## Dependências e verificação

O fluxo previsto é `UI → Experience Engine → Domain` e `Rendering → Assets`.
O ESLint existente restringe imports entre camadas, frameworks no domínio,
referências diretas a DOM/WebGL e ciclos. `experience/navigation` segue as
mesmas restrições de plataforma do domínio e não pode importar `content` fora
dos testes. Imports entre diretórios usam `@/`;
imports locais podem usar `./`.

`npm run typecheck` verifica a aplicação e também o domínio (incluindo
`experience/navigation`) com `tsconfig.domain.json`, que herda o modo strict e disponibiliza somente a
biblioteca ES2022, sem tipos globais de DOM ou Node. Essa segunda compilação
complementa o lint; os testes são compilados na configuração principal e
executados em Node pelo Vitest.

Validação da etapa: `npm run typecheck`, `npm run lint`, `npm test` e
`npm run build`. As funcionalidades futuras descritas na arquitetura permanecem
fora do escopo desta fundação.
