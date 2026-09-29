/**
 * Estado lógico de uma VisualLayer. `visible` e `transparent` são intenções
 * independentes: uma layer pode estar invisível e transparente ao mesmo
 * tempo, e cabe ao rendering decidir como interpretar a combinação.
 * Transparência é binária; o grau de opacidade pertence ao rendering.
 */
export interface LayerState {
  readonly layerId: string;
  readonly visible: boolean;
  readonly transparent: boolean;
}

/**
 * Estado lógico das layers da cena ativa (ARCHITECTURE.md §13), na ordem
 * declarada pela cena.
 *
 * `isolatedLayerId` é uma intenção temporária de mostrar/destacar só essa
 * layer. É ortogonal aos estados individuais: não os altera, e limpá-lo
 * devolve a experiência aos mesmos estados de antes.
 */
export interface LayerControllerState {
  readonly layers: readonly LayerState[];
  readonly isolatedLayerId?: string;
}
