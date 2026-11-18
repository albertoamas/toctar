// Las listas largas del panel, de a páginas (17/11): la base trae solo la página pedida y cuenta el total, así una lista
// es igual de rápida con 50 filas que con 5.000. La página va en la dirección (`?pagina=2`): Atrás vuelve a la misma, se
// puede recargar y se combina con los filtros y la búsqueda (que la borran al cambiar: vuelven a la primera).

/** Filas por página en las listas del panel. */
export const POR_PAGINA = 25;

/** La página pedida en la dirección: un texto, 0, un negativo o un número enorme son la primera. */
export function leerPagina(valor: unknown): number {
  const n = typeof valor === "string" && /^\d{1,6}$/.test(valor) ? Number(valor) : 1;
  return n > 1 ? n : 1;
}

/** Cuántas páginas hay y cuál se muestra: una después de la última es la última (por ejemplo, tras desactivar filas). */
export function ajustarPagina(pedida: number, total: number, porPagina = POR_PAGINA): { pagina: number; paginas: number } {
  const paginas = Math.max(1, Math.ceil(total / porPagina));
  return { pagina: Math.min(Math.max(1, pedida), paginas), paginas };
}

/** La dirección de otra página de la misma lista, con sus filtros: la primera no lleva `pagina`. */
export function conPagina(ruta: string, parametros: Record<string, string | string[] | undefined>, pagina: number): string {
  const datos = new URLSearchParams();
  for (const [clave, valor] of Object.entries(parametros)) {
    if (clave === "pagina" || valor === undefined) continue;
    for (const v of Array.isArray(valor) ? valor : [valor]) if (v !== "") datos.append(clave, v);
  }
  if (pagina > 1) datos.set("pagina", String(pagina));
  const consulta = datos.toString();
  return consulta ? `${ruta}?${consulta}` : ruta;
}
