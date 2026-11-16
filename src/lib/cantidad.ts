// Una cantidad con su palabra en singular o plural, para todo el panel ("1 variante", "3 vencidos"). Un solo lugar:
// así ninguna pantalla escribe su propio n === 1.

/** "3 vencidos", "1 vencido". */
export const cantidad = (n: number, singular: string, plural: string) => `${n} ${palabra(n, singular, plural)}`;

/** Solo la palabra, para cuando el número va aparte (más grande, en Reportes): "vehículo entregado" o "vehículos entregados". */
export const palabra = (n: number, singular: string, plural: string) => (n === 1 ? singular : plural);
