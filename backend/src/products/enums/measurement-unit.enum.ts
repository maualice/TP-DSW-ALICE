/**
 * Unidades de medida soportadas.
 *
 * Determina cómo se cuantifica el stock y se valida la cantidad en órdenes:
 * - UNIT / PACK: stock debe ser entero.
 * - METER / KG / LITER: stock admite decimales.
 */
export enum MeasurementUnit {
  UNIT = 'UNIT', // Unidad entera (martillo, taladro, disyuntor)
  METER = 'METER', // Metros (cable, caño, manguera)
  KG = 'KG', // Kilogramos (arena, cemento)
  LITER = 'LITER', // Litros (pintura, solvente)
  PACK = 'PACK', // Bulto / Pack cerrado (caja de tornillos, bolsa de tarugos)
}
