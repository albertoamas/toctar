// Una cantidad con su palabra en singular o plural, para todo el panel ("1 variante", "3 vencidos"). Un solo lugar:
// así ninguna pantalla escribe su propio n === 1.

/** "3 vencidos", "1 vencido". */
export const cantidad = (n: number, singular: string, plural: string) => `${n} ${n === 1 ? singular : plural}`;
