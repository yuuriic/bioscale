/** Fonte bibliográfica que sustenta um conteúdo científico (ARCHITECTURE.md §22–23). */
export interface ScientificReference {
  readonly id: string;
  /** Citação completa em formato legível. */
  readonly citation: string;
  readonly url?: string;
  readonly doi?: string;
  /** Data de acesso de fontes web, em ISO 8601 (`YYYY-MM-DD`). */
  readonly accessedOn?: string;
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** `true` para uma data de calendário real no formato `YYYY-MM-DD`. */
export function isIsoCalendarDate(value: string): boolean {
  const match = ISO_DATE.exec(value);
  if (!match) {
    return false;
  }
  const [year, month, day] = match.slice(1).map(Number) as [number, number, number];
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}
