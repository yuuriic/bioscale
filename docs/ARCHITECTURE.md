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
Cérebro
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

  description: string

  scale?: Scale

  model?: AssetReference

  educationalContent?: EducationalContent

  relations: BiologicalRelation[]
}
```

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

  selectedNode?: string

  mode:
    | "guided"
    | "explore"
}
```

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

---

## 11.3 SelectionController

Responsável por:

```text
raycasting
hover
selection
highlight
interactive meshes
```

Fluxo:

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

Cada estrutura deverá possuir metadados aproximados de escala.

```ts
interface Scale {
  magnitude: number

  unit:
    | "m"
    | "cm"
    | "mm"
    | "µm"
    | "nm"
}
```

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
interface SceneDefinition {
  nodeId: string

  asset: AssetReference

  camera: CameraPreset

  interactiveObjects: InteractiveObject[]

  transitions: TransitionDefinition[]

  layers?: LayerDefinition[]

  explodedView?: ExplodedView
}
```

Assim, comportamento e conteúdo ficam desacoplados.

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
}
```

Todo conteúdo científico deverá possuir referências.

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