import { ValueTransformer } from 'typeorm';

/**
 * Transforma columnas numéricas de PostgreSQL (NUMERIC / DECIMAL)
 * a números primitivos de JavaScript (number).
 */
export class ColumnNumericTransformer implements ValueTransformer {
  to(data: number | null | undefined): number | null | undefined {
    if (data === undefined) return undefined;
    if (data === null) return null;
    return data;
  }

  from(data: string | null): number | null {
    if (data === null || data === undefined) return null;
    const res = parseFloat(data);
    return isNaN(res) ? null : res;
  }
}
