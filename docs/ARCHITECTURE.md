# BioScale — Arquitetura

> **Explore a vida em todas as escalas.**

---

## 1. Visão do Produto

O **BioScale** é uma plataforma web educacional de exploração biológica interativa em 3D.

O objetivo é permitir que o usuário percorra diferentes níveis de organização do corpo humano, partindo de estruturas macroscópicas e avançando progressivamente até estruturas celulares e moleculares.

A experiência combina:

- visualização 3D;
- exploração livre por clique;
- navegação por escala;
- animações orientadas por scroll;
- isolamento de estruturas;
- visualizações em camadas;
- conteúdo científico contextualizado;
- transições contínuas entre diferentes níveis biológicos.

Uma jornada poderá assumir a seguinte forma:

```text
Corpo Humano
     ↓
Sistema Nervoso
     ↓
Encéfalo
     ↓
Tecido Nervoso
     ↓
Neurônio
     ↓
Núcleo
     ↓
Cromossomo
     ↓
DNA
```

Entretanto, o BioScale não deve possuir uma sequência única ou obrigatória.

Cada estrutura poderá oferecer diferentes caminhos de exploração.

---

# 2. Proposta Central

O BioScale deverá responder visualmente à pergunta:

> **O que existe se continuarmos olhando mais de perto?**

A experiência é construída ao redor da mudança de escala.

```text
MACROSCÓPICO

      ↓

ANATOMIA

      ↓

HISTOLOGIA

      ↓

BIOLOGIA CELULAR

      ↓

BIOLOGIA MOLECULAR
```

A mudança de escala não representa simplesmente uma troca de página.

Sempre que possível, deverá ser percebida como uma **transição espacial contínua**.

---

# 3. Referência Conceitual

## Human Atlas

https://github.com/slorksmo/Human-Atlas

O projeto Human Atlas é uma das principais referências de interação para o domínio anatômico do BioScale.

Elementos conceituais relevantes:

- corpo humano 3D;
- estruturas selecionáveis;
- sistemas anatômicos;
- isolamento de estruturas;
- ocultação;
- transparência;
- visualização em camadas;
- exploded view;
- navegação espacial.

O BioScale não tem como objetivo reproduzir o Human Atlas.

A proposta é expandir esse paradigma para escalas menores:

```text
Human Atlas

Body
 ↓
System
 ↓
Organ
 ↓
Anatomical Structure


BioScale

Body
 ↓
System
 ↓
Organ
 ↓
Tissue
 ↓
Cell
 ↓
Cellular Structure
 ↓
Organelle
 ↓
Molecular Structure
 ↓
Molecule
```

---

# 4. Domínios Científicos

A aplicação será dividida conceitualmente em quatro grandes domínios.

```text
┌─────────────────────────────┐
│          ANATOMY            │
│                             │
│ Body                        │
│ System                      │
│ Organ                       │
│ Anatomical Structure        │
└──────────────┬──────────────┘
               │
               │ zoom
               ▼
┌─────────────────────────────┐
│         HISTOLOGY           │
│                             │
│ Tissue                      │
│ Tissue Structure            │
└──────────────┬──────────────┘
               │
               │ zoom
               ▼
┌─────────────────────────────┐
│      CELLULAR BIOLOGY       │
│                             │
│ Cell                        │
│ Cellular Structure          │
│ Organelle                   │
└──────────────┬──────────────┘
               │
               │ zoom
               ▼
┌─────────────────────────────┐
│     MOLECULAR BIOLOGY       │
│                             │
│ Chromosome                  │
│ DNA                         │
│ Protein                     │
│ Molecule                    │
└─────────────────────────────┘
```

Esses domínios organizam o conteúdo, mas não impõem uma hierarquia rígida.

---

# 5. Princípio Arquitetural Fundamental

O BioScale deverá separar quatro responsabilidades:

```text
SCIENTIFIC KNOWLEDGE
        │
        ▼
BIOLOGICAL GRAPH

        +

3D ASSETS
        │
        ▼
VISUALIZATION ENGINE

        +

INTERACTION
        │
        ▼
EXPERIENCE ENGINE

        +

PRESENTATION
        │
        ▼
USER INTERFACE
```

Portanto:

```text
BioScale
│
├── Scientific Layer
├── Asset Layer
├── Experience Layer
├── Rendering Layer
└── Interface Layer
```

Essa separação deverá permitir adicionar novas estruturas biológicas sem reconstruir o motor da aplicação.

---

# 6. Biological Knowledge Graph

A biologia não será representada internamente como uma árvore rígida.

Será utilizada uma estrutura conceitual de **grafo**.

Cada estrutura biológica será um nó.

```text
BiologicalNode
```

E cada relação será uma aresta.

```text
BiologicalRelation
```

Exemplo:

```text
Heart
  │
  │ contains
  ▼
Myocardium
  │
  │ composed_of
  ▼
Cardiomyocyte
  │
  │ contains
  ▼
Nucleus
  │
  │ contains
  ▼
Chromosome
  │
  │ composed_of
  ▼
DNA
```

Outro caminho:

```text
Neuron
 ├── contains → Nucleus
 ├── has_part → Axon
 ├── has_part → Dendrites
 └── has_part → Synaptic Terminal
```

Isso permite reutilizar estruturas compartilhadas.

```text
Neuron ─────────┐
                │
Cardiomyocyte ──┼──→ Nucleus → Chromosome → DNA
                │
Keratinocyte ───┘
```

---

# 7. BiologicalNode

Representação conceitual:

```ts
interface BiologicalNode {
  id: string

  name: string

  scientificName?: string

  domain:
    | "anatomy"
    | "histology"
    | "cellular"
    | "molecular"

  type:
    | "body"
    | "system"
    | "organ"
    | "anatomical_structure"
    | "tissue"
    | "tissue_structure"
    | "cell"
    | "cellular_structure"
    | "organelle"
    | "chromosome"
    | "dna"
    | "protein"
    | "molecule"

  scale?: Scale

  model?: AssetReference

  educationalContent?: EducationalContent

  relations: BiologicalRelation[]
}
```

O nó representa identidade, classificação e relações.

Não possui texto científico próprio: todo texto científico pertence a `EducationalContent` (§22), que exige referências. Assim existe uma única fonte de verdade rastreável.

`id` é a identidade científica estável da estrutura, em slug inglês (`nervous-system`, `brain`), usada em URLs, no grafo e em futuras referências de cena e assets.

`name` e o conteúdo textual representam atualmente um único idioma (português). Internacionalização deverá ser tratada antes de oferecer múltiplos idiomas.

---

# 8. BiologicalRelation

```ts
interface BiologicalRelation {
  source: string
  target: string

  type:
    | "contains"
    | "has_part"
    | "part_of"
    | "composed_of"
    | "connected_to"
    | "associated_with"
    | "transitions_to"
}
```

Semântica:

```text
contains     a origem contém o destino em sentido espacial, estrutural ou biológico
has_part     a origem possui o destino como uma de suas partes constituintes
part_of      a origem faz parte do destino (inverso conceitual de has_part)
composed_of  a origem é composta por unidades ou componentes da natureza do destino
```

Relações inversas não são inferidas automaticamente.

`contains` não gera `part_of`, e `has_part` não gera `part_of`.

Uma relação declarada é a fonte de verdade.

O sistema não deverá assumir que toda célula possui núcleo ou que todas as estruturas seguem o mesmo caminho.

As relações deverão representar a realidade biológica.

O grafo não é exaustivo.

A ausência de uma relação no dataset não significa a ausência dessa relação na biologia. Consumidores não deverão interpretar a quantidade de relações de um nó como representação completa da estrutura biológica.

Relações não possuem cardinalidade (ex.: quantidade de cromossomos em um núcleo). Cardinalidade é uma evolução futura, a ser introduzida somente quando uma experiência realmente necessitar dessa informação.

---

# 9. Arquitetura Geral

```text
┌─────────────────────────────────────┐
│              BioScale               │
├─────────────────────────────────────┤
│                                     │
│             UI Layer                │
│                                     │
│ Breadcrumb                          │
│ Information Panel                   │
│ Search                              │
│ Scale Indicator                     │
│ Navigation                          │
│ Controls                            │
│                                     │
├─────────────────────────────────────┤
│                                     │
│         Experience Engine           │
│                                     │
│ NavigationController                │
│ CameraController                    │
│ SelectionController                 │
│ TransitionController                │
│ ScrollController                    │
│ LayerController                     │
│ ScaleController                     │
│                                     │
├──────────────────┬──────────────────┤
│                  │                  │
│ Rendering Engine │ Scientific Engine│
│                  │                  │
│ Three.js         │ Biological Graph │
│ React Three Fiber│ Content          │
│ Shaders          │ Relationships    │
│                  │ Scale Metadata   │
│                  │                  │
├──────────────────┴──────────────────┤
│                                     │
│             Asset Layer             │
│                                     │
│ GLB / GLTF                          │
│ Textures                            │
│ Materials                           │
│ Scientific Data                     │
│                                     │
└─────────────────────────────────────┘
```

---

# 10. Stack Inicial

## Application

```text
Next.js
React
TypeScript
```

## 3D

```text
Three.js
React Three Fiber
@react-three/drei
```

## Animation

```text
GSAP
```

## Smooth Scroll

```text
Lenis
```

## Client State

```text
Zustand
```

O armazenamento científico deverá permanecer desacoplado da camada de renderização.

Inicialmente os dados poderão ser arquivos estruturados locais.

Posteriormente poderão ser migrados para banco de dados ou CMS sem modificar o Experience Engine.

---

# 11. Experience Engine

O Experience Engine será o núcleo interativo da aplicação.

```text
ExperienceEngine
│
├── NavigationController
├── CameraController
├── SelectionController
├── TransitionController
├── ScrollController
├── LayerController
├── ScaleController
└── AssetController
```

---

## 11.1 NavigationController

Responsável por:

```text
estrutura atual
histórico
próximo nível
nível anterior
breadcrumbs
rotas biológicas
deep linking
```

Estado conceitual:

```ts
interface NavigationState {
  currentNode: string

  history: string[]

  mode:
    | "guided"
    | "explore"
}
```

O histórico e os breadcrumbs representam o percurso efetivamente seguido pelo usuário na sessão, não um caminho derivado do Biological Graph. Como o grafo não é uma árvore, o mesmo nó alcançado por caminhos diferentes produz breadcrumbs diferentes.

Navegar e retornar são operações distintas:

```text
navigate               nova etapa do percurso
back                   retorno à etapa imediatamente anterior
breadcrumb navigation  retorno explícito a uma posição anterior do percurso
```

Revisitar uma estrutura é navegação legítima: o mesmo BiologicalNode pode aparecer repetidamente no breadcrumb (`human › nervous-system › brain › nervous-system`). Por isso o retorno por breadcrumb identifica uma posição do percurso, e não um ID de nó, e descarta as etapas posteriores a ela.

Relações biológicas não são rotas: o NavigationController aceita qualquer nó existente e expõe as relações do nó atual apenas para consulta. Quais destinos cada estrutura oferece é decisão da definição da experiência/cena.

Um deep link inicia a navegação diretamente no nó indicado, com histórico vazio; nenhum percurso é fabricado.

---

## 11.2 CameraController

Responsável por:

```text
position
rotation
target
zoom
focus
camera transitions
```

Nenhum componente biológico deverá controlar diretamente a câmera.

Toda movimentação deverá passar pelo CameraController.

O CameraController é independente de framework e mantém o estado **lógico** da câmera; a Rendering Layer o aplicará à câmera real.

```text
CameraController → Rendering Adapter → Three.js Camera
```

```ts
interface CameraState {
  position: Vec3 // Scene Units
  target: Vec3 // Scene Units
  fieldOfView: number // graus, vertical, 0 < fov < 180
}
```

O estado é sempre completo: quando o preset da cena omite `fieldOfView`, aplica-se um valor padrão, que é convenção visual do BioScale e não dado científico. `near`, `far`, aspect ratio e rotação pertencem à integração com a renderização.

**Scene Unit (SU)** é a unidade abstrata do espaço 3D da experiência. Não corresponde a metro, milímetro, nanômetro ou qualquer unidade física, e não é convertida automaticamente a partir de `BiologicalNode.scale`: cada cena normaliza sua representação visual. Um DNA de cerca de 2 nm de diâmetro pode ocupar várias SU. A magnitude real é comunicada por `Scale` (§16), não pelas coordenadas da cena.

`target` representa o foco espacial abstrato atual. Foco em objetos (em um nó ou mesh) foi adiado até existir informação espacial dos assets. Zoom também foi adiado: sem decidir se significa mover a câmera, alterar o campo de visão ou reescalar a cena, a operação seria ambígua.

O CameraController aplica mudanças imediatamente e não anima. Cada estado é um snapshot imutável; a interpolação entre o estado anterior e o seguinte pertence ao TransitionController e à integração com a renderização.

---

## 11.3 SelectionController

Fluxo de seleção:

```text
Pointer
   ↓
Raycaster
   ↓
Mesh
   ↓
Biological ID
   ↓
BiologicalNode
   ↓
Selection
```

O nome do mesh não deverá ser utilizado como única fonte de informação científica.

Cada mesh interativo deverá possuir um identificador associado ao Biological Graph.

Responsabilidades separadas:

```text
NavigationController   estado do percurso
SelectionController    estado da entidade selecionada
```

O SelectionController mantém apenas a seleção lógica: o ID de um BiologicalNode existente no grafo, ou nenhuma seleção. É independente de framework e não conhece o NavigationController.

- Seleção não implica navegação: selecionar uma estrutura não entra na sua cena.
- Navegação não implica seleção: entrar em uma cena não seleciona a estrutura.
- Nenhum dos dois controllers limpa a seleção do outro. Quando a mudança de experiência passa pelo ExperienceController (§11.4), ele coordena a limpeza: `enter` limpa sempre, inclusive em reentrada; `back` e `returnToBreadcrumb` limpam somente quando mudam a posição. Operações sem efeito ou que falham antes da mudança preservam a seleção.
- A tradução mesh → BiologicalNode ID (raycasting e objetos interativos) será resolvida na integração com assets e renderização; o SelectionController recebe o ID já resolvido.
- Se um nó é selecionável na cena atual é decisão futura da cena; hoje qualquer nó existente pode ser a seleção lógica.
- Hover é estado transitório de interação e não faz parte da seleção. Highlight é a representação visual da seleção e pertence à renderização.

---

## 11.4 ExperienceController

Camada mínima de orquestração. Cada peça mantém uma única responsabilidade:

```text
NavigationController   percurso
SelectionController    seleção
CameraController       enquadramento
LayerController        estado das camadas visuais
SceneRegistry          definições de cena disponíveis
ExperienceController   coordenação da entrada lógica em uma cena
```

O ExperienceController coordena três mudanças de cena, todas com o mesmo fluxo:

```text
enter(nodeId) | back() | returnToBreadcrumb(index)
  → resolve o destino e sua SceneDefinition
  → navigate | back | returnToBreadcrumb
  → clearSelection
  → apply CameraPreset
  → apply VisualLayers
```

O destino é resolvido antes de qualquer mutação, a partir do estado público do NavigationController: o último item do histórico para `back`, a posição do breadcrumb para o retorno (a posição identifica a ocorrência, mesmo com nós repetidos). A validade do índice é a mesma regra da navegação, compartilhada por ela.

Reentrada e ausência de mudança são intenções distintas:

```text
enter(nó atual)                  reentrada explícita: limpa a seleção e reaplica câmera e layers
back() sem histórico             nenhuma mudança
returnToBreadcrumb(posição atual) nenhuma mudança
```

- Sem SceneDefinition para o destino, a operação falha (`SceneNotAvailableError`) antes de qualquer mutação. Isso não é o mesmo que um BiologicalNode inexistente: o ExperienceController não consulta o grafo e apenas informa que não há experiência visual disponível. Como os controllers seguem utilizáveis diretamente, o percurso pode conter nós sem cena; voltar para eles também falha sem mutação.
- Um índice de breadcrumb inválido falha com o mesmo erro da navegação, sem mutação.
- Toda mudança de cena efetiva limpa a seleção, e o preset da cena de destino passa a ser a base do reset da câmera.
- Toda mudança de cena efetiva aplica as layers declaradas da cena de destino em estado inicial. O estado anterior das layers de uma cena não é restaurado: `back`, o retorno por breadcrumb e a reentrada começam da definição declarativa. Operações sem efeito e falhas resolvidas antes da mudança preservam as layers.
- A construção não altera os controllers recebidos. O ExperienceController coordena apenas mudanças depois que a experiência existe; o estado inicial vem da composição (abaixo).
- O ExperienceController não possui estado nem histórico próprios: o NavigationController é a única fonte do percurso, e todos os controllers continuam utilizáveis diretamente, inclusive `back` e `returnToBreadcrumb` da navegação.
- Não há rollback. A navegação é a primeira mutação e falha antes de alterar estado; `clearSelection` não falha; e `applyPreset` e `applyLayers` não falham para cenas de um SceneRegistry validado, que usa a mesma regra de câmera do CameraController e rejeita IDs de layer repetidos. Outra implementação de SceneRegistry precisa preservar essas invariantes.
- A coordenação não aplica política de capabilities às layers.
- As mudanças são lógicas e imediatas. Transições visuais (preparar destino → transição → consolidar estado visual) continuam adiadas até existir renderização.

A experiência inicial é criada por composição explícita, não por uma sequência de mutações:

```text
createExperience({ graph, scenes, initialNodeId })
  → valida o nó no grafo        (UnknownBiologicalNodeError)
  → resolve a SceneDefinition   (SceneNotAvailableError, sem fallback)
  → NavigationController no nó inicial, sem histórico, modo guided
  → SelectionController sem seleção
  → CameraController(scene.camera)
  → LayerController(scene.layers)
  → ExperienceController com essas mesmas instâncias
```

`createExperience` não chama `enter` nem aplica presets ou layers depois da construção: cada controller já nasce no estado da cena inicial. O retorno é apenas o conjunto de referências aos controllers, não um estado agregado nem um store. O grafo e o registro devem descrever o mesmo conhecimento; isso continua sendo responsabilidade de quem os compõe.

---

## 11.5 ExperienceSnapshot

Fronteira de leitura entre o Experience Engine e seus consumidores futuros (rendering, fallback DOM, ferramentas de teste/debug):

```text
Experience Controllers
        ↓
getExperienceSnapshot(runtime)
        ↓
ExperienceSnapshot
        ↓
consumidores futuros (rendering, aplicação)
```

```ts
interface ExperienceSnapshot {
  navigation: NavigationState
  selection: SelectionState
  camera: CameraState
  layers: LayerControllerState
}
```

- É uma fotografia read-only do estado lógico em um instante. Não contém cenas, grafo, assets nem conceitos de rendering, e não conhece renderer ou Three.js.
- É calculada sob demanda e nunca armazenada: não há `runtime.snapshot` nem `getState` no ExperienceController.
- Não é reativa: não há subscription, eventos nem store. A ponte reativa com a interface será definida depois.
- Cada chamada cria um novo objeto agregado, congelado, mesmo sem mudanças. Os estados especializados são compartilhados por referência, porque os controllers já os expõem como snapshots imutáveis.
- Por isso, fotografias antigas continuam válidas depois de qualquer mudança posterior.
- A função recebe apenas os quatro controllers de estado do runtime, não o ExperienceController.

Nenhum consumidor existe ainda: a integração com rendering não foi implementada.

---

# 12. Interaction Model

Existirão dois modos principais.

## Guided Mode

Experiência narrativa.

```text
scroll
  ↓
camera movement
  ↓
layer transition
  ↓
structure reveal
  ↓
educational content
```

Exemplo:

```text
Human Body

↓ scroll

Nervous System

↓ scroll

Brain

↓ scroll

Nervous Tissue

↓ scroll

Neuron
```

---

## Explore Mode

Exploração livre.

```text
click structure
      ↓
select
      ↓
highlight
      ↓
information
      ↓
explore
```

O usuário poderá alternar entre os dois modos.

---

# 13. Sistema de Camadas

Estruturas complexas poderão possuir camadas visuais.

Exemplo:

```text
Human Body

Layer 1 → Skin
Layer 2 → Muscular System
Layer 3 → Skeletal System
Layer 4 → Internal Organs
Layer 5 → Vascular Structures
Layer 6 → Nervous Structures
```

Controles possíveis:

```text
SHOW
HIDE
ISOLATE
TRANSPARENT
EXPLODE
RESET
```

O LayerController será responsável por essas operações.

`SceneDefinition.layers` declara quais camadas existem; o LayerController mantém o **estado lógico** dessas camadas durante a experiência. É independente de framework e não conhece renderer, meshes ou materiais; a Rendering Layer interpretará o estado.

```ts
interface LayerControllerState {
  layers: { layerId: string; visible: boolean; transparent: boolean }[] // ordem declarada pela cena
  isolatedLayerId?: string
}
```

- Visibilidade e transparência são independentes: uma camada pode estar invisível e transparente, e o rendering decide como interpretar a combinação.
- Transparência é uma intenção binária. O grau de opacidade é decisão de rendering/estilo, não do estado lógico.
- Isolamento é uma intenção ortogonal: registra qual camada isolar sem alterar visibilidade ou transparência de nenhuma camada. Limpar o isolamento devolve exatamente os estados anteriores.
- `reset` volta ao estado inicial da configuração atual: todas visíveis, nenhuma transparente, nenhuma isolada.
- O LayerController não valida as capabilities da cena: se a cena permite isolar ou tornar transparente é política da coordenação da experiência.
- Exploded view (§14) ainda não faz parte do LayerController.
- O LayerController controla uma configuração por vez. `applyLayers(layers)` substitui completamente a configuração por uma nova, em estado inicial. O estado visual não é preservado entre configurações, mesmo para IDs iguais; reaplicar a mesma configuração também volta ao estado inicial. IDs repetidos são rejeitados sem alterar a configuração atual.
- Mudanças de cena feitas pelo ExperienceController (§11.4) aplicam as layers da SceneDefinition de destino.

---

# 14. Exploded View

Estruturas compatíveis poderão possuir uma configuração de decomposição.

```ts
interface ExplodedView {
  parts: {
    objectId: string
    direction: [number, number, number]
    distance: number
  }[]
}
```

Isso permitirá experiências como:

```text
CELL

        mitochondria

 nucleus      golgi

       membrane

    endoplasmic
      reticulum
```

Cada estrutura fica espacialmente separada e selecionável.

---

# 15. Transições Entre Escalas

Uma das características principais do BioScale será a transição entre ordens de grandeza.

Exemplo:

```text
Brain
  ↓
zoom
  ↓
Tissue
  ↓
zoom
  ↓
Neuron
```

Essas transições não precisam utilizar literalmente o mesmo modelo.

O Experience Engine poderá realizar:

```text
focus
 ↓
zoom
 ↓
fade / transition
 ↓
asset swap
 ↓
camera reposition
 ↓
next scale
```

O objetivo é criar **continuidade perceptiva**, não escala física literal.

---

# 16. Scale Engine

Estruturas poderão possuir metadados aproximados de escala, quando houver base científica adequada.

```ts
type Scale = {
  dimension:
    | "diameter"
    | "length"
    | "width"
    | "thickness"
    | "height"

  unit:
    | "m"
    | "cm"
    | "mm"
    | "µm"
    | "nm"
} & (
  | { value: number }
  | { min: number; max: number }
)
```

`dimension` declara o que é medido: 2 nm de diâmetro e 2 nm de comprimento são informações diferentes.

Um valor único usa `value`. Estruturas cuja dimensão varia usam o intervalo `min`/`max`, com `min < max`. Os dois formatos são mutuamente exclusivos.

Não se deve atribuir um valor absoluto único a estruturas cuja dimensão varia significativamente.

A interface poderá mostrar:

```text
1 m ───── 1 cm ───── 1 mm ───── 1 µm ───── 1 nm
                                      ▲
                                   Neuron
```

Isso ajudará o usuário a compreender a magnitude da mudança observada.

---

# 17. Canvas Persistente

O BioScale deverá utilizar preferencialmente um Canvas 3D persistente.

```text
<App>

├── InterfaceLayer
│
│   ├── Header
│   ├── Search
│   ├── Breadcrumb
│   ├── InformationPanel
│   ├── ScaleIndicator
│   └── Controls
│
└── ExperienceCanvas

    ├── Camera
    ├── Lighting
    ├── Environment
    ├── SceneManager
    └── ActiveScene
```

Mudanças entre estruturas não deverão recriar desnecessariamente o contexto WebGL.

## 17.1 Rendering Foundation

A camada de rendering (`src/rendering`) é separada do Experience Engine:

```text
rendering  → experience     permitido
experience -X→ rendering    proibido (ESLint e testes de fronteira)
```

- `ExperienceCanvas` é o Canvas React Three Fiber persistente. Existe uma única instância, montada no layout raiz da aplicação, que não é remontado entre páginas. Cenas futuras serão renderizadas dentro dele; nenhum BiologicalNode ou SceneDefinition cria Canvas próprio.
- `ExperienceCanvas` é o único Client Component da camada; o layout e as páginas continuam Server Components. O Canvas é pré-renderizado no servidor sem carregamento dinâmico: o contexto WebGL é criado apenas no navegador.
- `RenderingProbe` é um objeto técnico temporário (um cubo com iluminação mínima) que comprova o pipeline Next → React → R3F → Three → WebGL. Não é científico e será removido quando existirem cenas reais.
- A câmera do Canvas é apenas técnica, para tornar o probe visível. Ainda não é controlada pelo CameraController.
- O ExperienceSnapshot (§11.5) ainda não está conectado ao rendering: não há sincronização reativa, store ou subscription. O único Context existente transporta o runtime (§17.2).

## 17.2 Client Experience Composition

O `ExperienceRuntime` pertence à composição React da aplicação (`src/app`), não ao Experience Engine nem ao rendering:

```text
layout.tsx (Server Component)
  └── ExperienceRuntimeProvider (Client Component)
        ├── ExperienceCanvas
        └── interface DOM
```

```text
app        → experience, rendering
rendering  → experience   (futuro)
experience -X→ app, rendering, React
rendering  -X→ app
```

- O Experience Engine continua independente de framework. `createApplicationExperience` (em `src/app/experience-config.ts`) reutiliza o dataset científico e `createExperience`.
- O runtime não é singleton de módulo. O `ExperienceRuntimeProvider` cria uma instância por montagem, com inicialização preguiçosa de `useState`, e a mantém estável entre renders. Em Strict Mode o inicializador pode rodar mais de uma vez em desenvolvimento; como a criação é síncrona e sem efeitos externos, a instância descartada não deixa rastro. Na renderização no servidor, cada requisição cria e descarta a sua própria instância.
- O Context é injeção de dependência, não store: transporta apenas a referência ao runtime, nunca um snapshot. `useExperienceRuntime()` apenas acessa o runtime e lança erro fora do Provider.
- O `ExperienceCanvas` é descendente do Provider, mas ainda não o consome.
- A SceneDefinition inicial (`human`) é um bootstrap técnico temporário: sem assets, layers ou capabilities, e não é uma cena científica.
- A câmera lógica dessa cena e a câmera técnica do Canvas R3F continuam independentes.
- Não existe snapshot reativo: nada sincroniza o Engine com React ou com o rendering.

---

# 18. Scene Manager

O SceneManager será responsável pela cena ativa.

```text
SceneManager
│
├── AnatomyScene
├── HistologyScene
├── CellularScene
└── MolecularScene
```

Isso não significa quatro Canvas diferentes.

Todos utilizarão o mesmo renderer.

---

# 19. Scene Definition

```ts
type Vec3 = readonly [number, number, number]

interface SceneDefinition {
  nodeId: string

  assets: AssetReference[]

  camera: {
    position: Vec3 // Scene Units (§11.2)
    target: Vec3
    fieldOfView?: number // graus, vertical
  }

  layers: { id: string; label: string }[]

  capabilities: (
    | "rotate"
    | "zoom"
    | "select"
    | "isolate"
    | "transparent"
    | "explode"
  )[]
}
```

Assim, comportamento e conteúdo ficam desacoplados.

`BiologicalNode` descreve o que a estrutura é; `SceneDefinition` descreve como ela participa da experiência; a Asset Layer resolve os recursos; a Rendering Layer os renderiza. A definição é declarativa e serializável: sem objetos de renderização, funções ou parâmetros de animação.

Há no máximo uma cena por nó, e toda cena aponta para um nó existente. Um nó pode existir sem cena: o grafo pode conter conhecimento que ainda não possui experiência visual.

As capacidades vêm das interações do MVP (§30) e dos controles de camadas (§13). Ações narrativas próprias de uma estrutura (ex.: revelar cromatina) não são capacidades genéricas.

Ainda não fazem parte do contrato, até existirem assets e decisões visuais que os definam:

- objetos interativos (associação mesh → `BiologicalNode`, §11.3);
- configuração de exploded view (§14);
- transições: o §15 descreve um único fluxo genérico executado pelo Experience Engine, e não estratégias distintas declaradas por cena.

---

# 20. Asset Architecture

```text
/assets

├── anatomy
│   ├── body
│   ├── nervous-system
│   ├── brain
│   └── heart
│
├── histology
│   ├── nervous-tissue
│   └── cardiac-tissue
│
├── cellular
│   ├── neuron
│   ├── cardiomyocyte
│   ├── nucleus
│   └── mitochondria
│
└── molecular
    ├── chromosome
    ├── dna
    └── proteins
```

Formatos preferenciais:

```text
GLB
GLTF
KTX2
WebP / AVIF
```

Assets deverão ser otimizados para WebGL.

---

# 21. Asset Metadata

Um asset visual não é conhecimento científico.

Portanto:

```text
brain.glb
```

não deverá conter toda a lógica referente ao cérebro.

O relacionamento deverá ocorrer através de metadados.

```text
brain.glb
    ↓
Asset ID
    ↓
BiologicalNode
    ↓
Scientific Content
```

Essa separação permite trocar o modelo 3D sem alterar o conteúdo científico.

---

# 22. Scientific Content Layer

Conteúdo educacional deverá permanecer separado dos componentes React.

Exemplo:

```ts
interface EducationalContent {
  summary: string

  function?: string

  characteristics?: string[]

  curiosities?: string[]

  relatedConcepts?: string[]

  sources: ScientificReference[]

  reviewStatus:
    | "draft"
    | "pending_review"
    | "approved"
}

interface ScientificReference {
  id: string

  citation: string

  url?: string

  doi?: string

  accessedOn?: string // ISO 8601, YYYY-MM-DD
}
```

Todo conteúdo científico deverá possuir referências.

`EducationalContent` é a única fonte de texto científico de um nó.

Fontes web deverão registrar a data de acesso em `accessedOn`.

---

# 23. Scientific Validation

Como o BioScale é uma plataforma educacional, precisão científica deverá ser requisito funcional.

Fluxo recomendado:

```text
Content Creation
      ↓
Scientific Sources
      ↓
Biological Review
      ↓
Approved Content
      ↓
Production
```

O estado do conteúdo é representado por `reviewStatus`:

```text
draft           em elaboração
pending_review  fundamentado em fontes, aguardando revisão biológica
approved        revisado e aprovado para produção
```

Conteúdo não revisado por especialista não deverá ser marcado como `approved`.

Conteúdo visual também deverá ser validado.

Uma estrutura visualmente bonita, porém biologicamente incorreta, não deverá ser considerada pronta.

---

# 24. Navegação

O usuário deverá sempre saber onde está.

Exemplo:

```text
Human Body
   /
Nervous System
   /
Brain
   /
Nervous Tissue
   /
Neuron
   /
Nucleus
```

Breadcrumb:

```text
Body › Brain › Nervous Tissue › Neuron › Nucleus
```

O usuário poderá retornar para qualquer ponto anterior.

---

# 25. Deep Linking

Cada estrutura explorável deverá possuir URL própria.

Exemplo:

```text
/explore/human
/explore/brain
/explore/neuron
/explore/nucleus
/explore/dna
```

Posteriormente:

```text
/explore/neuron/synapse
```

Isso permite:

- compartilhar estruturas;
- indexação;
- bookmarks;
- material educacional;
- retorno direto a experiências.

---

# 26. Performance

Performance será requisito arquitetural.

Modelos anatômicos podem possuir milhares de estruturas e milhões de polígonos.

Estratégias previstas:

```text
Lazy Loading
LOD
Geometry Merging
Instancing
Texture Compression
Mesh Compression
Asset Streaming
Frustum Culling
Selective Loading
```

Não carregar:

```text
Body
+ Brain
+ Neuron
+ Nucleus
+ Chromosome
+ DNA
```

simultaneamente sem necessidade.

Carregar apenas o necessário para a experiência atual e preparar antecipadamente a próxima transição quando apropriado.

---

# 27. Mobile

A experiência deverá ser projetada desde o início considerando dispositivos móveis.

Desktop:

```text
Mouse
Scroll
Hover
Click
Keyboard
```

Mobile:

```text
Touch
Swipe
Pinch
Tap
Drag
```

Nenhuma funcionalidade essencial poderá depender exclusivamente de hover.

---

# 28. Acessibilidade

O conteúdo científico não poderá existir exclusivamente no Canvas.

Informações importantes deverão possuir representação semântica no DOM.

Isso permitirá:

- leitores de tela;
- navegação por teclado;
- SEO;
- fallback sem WebGL;
- acesso ao conteúdo textual.

---

# 29. MVP

O primeiro MVP deverá provar a arquitetura completa com apenas uma jornada.

```text
Human Body
     ↓
Nervous System
     ↓
Brain
     ↓
Nervous Tissue
     ↓
Neuron
     ↓
Nucleus
     ↓
Chromosome
     ↓
DNA
```

Não será necessário implementar todo o corpo humano inicialmente.

`Brain` designa o encéfalo inteiro (`brain`): cérebro, diencéfalo, tronco encefálico e cerebelo. Em português, "cérebro" corresponde apenas ao *cerebrum*, uma das regiões do encéfalo. Regiões como `cerebrum`, `cerebellum` e `brainstem`, se modeladas no futuro, serão nós próprios relacionados a `brain`.

---

# 30. Interações do MVP

## Human Body

```text
rotate
zoom
select brain
```

## Brain

```text
rotate
isolate
transparent
explore
```

## Nervous Tissue

```text
zoom transition
identify neurons
```

## Neuron

```text
rotate
explode
select nucleus
select dendrites
select axon
select synaptic terminal
```

## Nucleus

```text
enter
reveal chromatin
```

## Chromosome

```text
isolate
rotate
unfold
```

## DNA

```text
rotate
zoom
identify base pairs
```

---

# 31. Evolução

Após validação do MVP:

```text
MVP
 │
 ▼
Cardiovascular Module
 │
 ▼
Respiratory Module
 │
 ▼
Digestive Module
 │
 ▼
Musculoskeletal Module
 │
 ▼
Immune Module
```

Cada módulo adicionará novos nós ao Biological Graph.

---

# 32. Exemplo de Expansão

```text
Human Body
│
├── Nervous System
│   └── Brain
│       └── Nervous Tissue
│           └── Neuron
│
├── Cardiovascular System
│   └── Heart
│       └── Myocardium
│           └── Cardiomyocyte
│
└── Blood
    ├── Erythrocyte
    ├── Leukocyte
    └── Platelet
```

Estruturas compartilhadas continuam reutilizáveis:

```text
Neuron ──────────┐
                 │
Cardiomyocyte ───┼── Nucleus → Chromosome → DNA
                 │
Leukocyte ───────┘
```

---

# 33. Possível Expansão para Outros Organismos

A arquitetura não deverá depender exclusivamente de Homo sapiens.

Futuramente:

```text
BioScale
│
├── Human
├── Plant
├── Animal
├── Fungi
└── Microorganisms
```

Exemplo:

```text
Plant
 ↓
Leaf
 ↓
Plant Tissue
 ↓
Plant Cell
 ↓
Chloroplast
 ↓
Thylakoid
 ↓
Photosystem
 ↓
Chlorophyll
```

O mesmo Experience Engine continuará sendo utilizado.

---

# 34. Estrutura Inicial do Projeto

```text
src/
│
├── app/
│
├── components/
│   ├── ui/
│   └── experience/
│
├── experience/
│   ├── engine/
│   ├── camera/
│   ├── navigation/
│   ├── interaction/
│   ├── transitions/
│   ├── layers/
│   └── scenes/
│
├── biology/
│   ├── graph/
│   ├── anatomy/
│   ├── histology/
│   ├── cellular/
│   └── molecular/
│
├── assets/
│   ├── registry/
│   └── loaders/
│
├── content/
│   ├── nodes/
│   └── references/
│
├── store/
│
├── hooks/
│
├── types/
│
└── utils/
```

---

# 35. Regra de Dependência

A arquitetura deverá respeitar:

```text
UI
 ↓
Experience Engine
 ↓
Domain
```

e:

```text
Rendering
 ↓
Assets
```

e:

```text
Rendering
 ↓
Experience Engine
```

O Experience Engine não depende do rendering (§17.1).

O domínio científico não deverá depender de:

```text
React
Three.js
GSAP
DOM
WebGL
```

Portanto:

```text
BiologicalNode
```

deverá continuar existindo independentemente da tecnologia utilizada para visualizá-lo.

---

# 36. Visão Arquitetural

O BioScale não deverá ser construído como:

> uma página 3D sobre anatomia.

Nem como:

> uma animação de uma célula.

O sistema deverá ser construído como um:

> **motor de exploração biológica multiescala.**

Sua arquitetura deverá permitir representar:

```text
ORGANISM
   ↓
SYSTEM
   ↓
ORGAN
   ↓
TISSUE
   ↓
CELL
   ↓
CELLULAR STRUCTURE
   ↓
MOLECULAR STRUCTURE
   ↓
MOLECULE
```

mantendo separadas:

```text
Ciência
Visualização
Interação
Conteúdo
Assets
Interface
```

Assim, novas estruturas poderão ser adicionadas progressivamente sem exigir a reconstrução da plataforma.

---

# 37. Princípio Final

Toda decisão técnica deverá contribuir para pelo menos um dos três objetivos:

### Compreender

O usuário deve entender o que está observando.

### Explorar

O usuário deve possuir liberdade para investigar estruturas e relações.

### Conectar

O usuário deve compreender como diferentes escalas biológicas se relacionam.

O objetivo final não é apenas mostrar estruturas 3D.

É permitir que o usuário perceba que:

> **um corpo é formado por sistemas, sistemas por órgãos, órgãos por tecidos, tecidos por células e células por estruturas cuja organização continua até a escala molecular.**