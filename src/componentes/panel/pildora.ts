// La píldora del panel (pedido 26): las clases de un filtro, un interruptor ("Desactivados") o un botón con forma de
// píldora. En su propio archivo, sin "use client": así un componente de servidor también las puede usar (desde un archivo
// de cliente le llegarían como referencias y no como texto).

/** La píldora: la misma para un filtro, un interruptor ("Desactivados") o un botón (los servicios de la Galería). */
export const CLASE_PILDORA =
  "inline-flex min-h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-fondo px-3.5 text-sm font-semibold text-tinta-suave hover:border-tinta-suave hover:text-tinta pointer-coarse:min-h-11";
export const CLASE_PILDORA_ACTIVA = "border-tinta bg-tinta text-fondo hover:text-fondo";
