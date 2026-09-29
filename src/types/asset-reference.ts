/**
 * Referência opaca a um asset visual (ARCHITECTURE.md §21).
 *
 * O domínio científico conhece apenas o identificador do asset; arquivo,
 * formato e carregamento pertencem à camada de assets.
 */
export interface AssetReference {
  readonly assetId: string;
}
