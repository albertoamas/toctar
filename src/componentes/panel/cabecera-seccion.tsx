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
 * Una sección que se lee, sin "Editar" propio (el logo, que se guarda al momento; los datos de una reserva): el título
 * arriba de su tarjeta y su acción al lado (sistema-del-panel.md §2). `sinRelleno`: la tarjeta lleva filas que llegan al
 * borde (los servicios y los pagos de un trabajo) y cada una pone su propio relleno.
 */
export function Seccion(props: { id: string; titulo: string; accion?: React.ReactNode; sinRelleno?: boolean; children: React.ReactNode }) {
  const { id, titulo, accion, sinRelleno, children } = props;
  return (
    <section aria-labelledby={`${id}-titulo`} className="flex flex-col gap-2">
      <CabeceraSeccion id={id} titulo={titulo}>
        {accion}
      </CabeceraSeccion>
      <div className={cn("tt-tarjeta-panel flex-1", sinRelleno ? "flex flex-col overflow-hidden" : "p-4")}>{children}</div>
    </section>
  );
}
