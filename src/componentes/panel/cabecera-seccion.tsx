import { cn } from "cn";

/**
 * El título de una sección del panel y, en su misma fila, su acción sin borde si la tiene ("Editar", "＋ Agregar"). Va en
 * fichas, listas, portadas y formularios. Con `id`, el título se llama `{id}-titulo` para que su sección lo nombre con
 * `aria-labelledby`. Alto de botón aunque no tenga acción: así dos secciones lado a lado arrancan a la misma altura;
 * `compacta` lo quita cuando abajo va una línea de ayuda que tiene que quedar pegada al título. Sin estado ni efectos: se
 * puede usar desde el servidor sin arrastrar los modales.
 */
export function CabeceraSeccion(props: { id?: string; titulo: React.ReactNode; nivel?: 2 | 3; compacta?: boolean; children?: React.ReactNode }) {
  const { id, titulo, nivel = 2, compacta, children } = props;
  const Titulo = nivel === 3 ? "h3" : "h2";
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-x-3", !compacta && "min-h-11")}>
      <Titulo id={id && `${id}-titulo`} className={nivel === 3 ? "tt-titulo-sub" : "tt-titulo-seccion"}>
        {titulo}
      </Titulo>
      {children}
    </div>
  );
}

/**
 * La cabecera de una tarjeta: el título adentro, en su franja, con una línea que lo separa del contenido (C7, 18/11: una
 * sola regla en todo el panel, como las tarjetas de Shopify o Material; la línea hace que el título no se mezcle con lo
 * de abajo). Siempre del alto de un botón, con acción ("Editar", "Cambiar") o sin ella: dos tarjetas lado a lado quedan
 * parejas. `descripcion`: una línea de ayuda debajo del título, en la misma franja.
 */
export function CabeceraTarjeta(props: {
  /** El título se llama `{id}-titulo`; sin `id`, la sección se nombra con `aria-label`. */
  id?: string;
  titulo: React.ReactNode;
  descripcion?: string;
  /** Sobre filas que llegan al borde con 1 rem de relleno (las listas, los montos de un trabajo): alineado con ellas. */
  angosta?: boolean;
  children?: React.ReactNode;
}) {
  const { id, titulo, descripcion, angosta, children } = props;
  return (
    <div className={cn("flex flex-col border-b border-border px-4 py-1.5", !angosta && "sm:px-5", descripcion && "pb-3")}>
      <CabeceraSeccion id={id} titulo={titulo}>
        {children}
      </CabeceraSeccion>
      {descripcion && <p className="-mt-1 text-sm text-tinta-suave">{descripcion}</p>}
    </div>
  );
}

/** Una tarjeta dentro de otra (una lista en su sección) pierde su borde, su sombra y sus esquinas. */
const SIN_MARCO_INTERNO = "[&_.tt-tarjeta-panel]:rounded-none [&_.tt-tarjeta-panel]:border-0 [&_.tt-tarjeta-panel]:shadow-none";

/**
 * Una sección del panel (sistema-del-panel.md §2, regla final del 18/11): en las fichas, listas y portadas, el título
 * **fuera**, arriba de la tarjeta, con su acción a la derecha; con `dentro`, en la cabecera de la tarjeta, para los
 * formularios y los pasos del taller (Entregar, Cambiar de dueño). `sinRelleno`: la tarjeta lleva filas que llegan al
 * borde (los servicios y los pagos de un trabajo, una lista) y cada una pone su propio relleno; una lista con su propia
 * tarjeta adentro (`ListaFilas`, `TablaLista`) pierde el marco: el de la sección alcanza.
 */
export function Seccion(props: {
  id: string;
  titulo: string;
  accion?: React.ReactNode;
  sinRelleno?: boolean;
  /** El título en la cabecera de la tarjeta: en un formulario o un paso del taller. */
  dentro?: boolean;
  /** Clases de la sección (su lugar en una grilla, `@container`). */
  className?: string;
  children: React.ReactNode;
}) {
  const { id, titulo, accion, sinRelleno, dentro, className, children } = props;
  if (dentro) {
    return (
      <section aria-labelledby={`${id}-titulo`} className={cn("tt-tarjeta-panel flex flex-col overflow-hidden", className)}>
        <CabeceraTarjeta id={id} titulo={titulo} angosta={sinRelleno}>
          {accion}
        </CabeceraTarjeta>
        <div className={cn("flex flex-1 flex-col", SIN_MARCO_INTERNO, !sinRelleno && "p-4 sm:p-5")}>{children}</div>
      </section>
    );
  }
  // flex-1: en una grilla, las tarjetas de una misma fila quedan del mismo alto
  return (
    <section aria-labelledby={`${id}-titulo`} className={cn("flex flex-col gap-2", className)}>
      <CabeceraSeccion id={id} titulo={titulo}>
        {accion}
      </CabeceraSeccion>
      <div className={cn("tt-tarjeta-panel flex flex-1 flex-col", SIN_MARCO_INTERNO, sinRelleno ? "overflow-hidden" : "p-4")}>{children}</div>
    </section>
  );
}
