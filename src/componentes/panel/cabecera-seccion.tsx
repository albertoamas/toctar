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
 * La cabecera de una tarjeta con su título adentro: la regla de los formularios (crear, en pasos, un paso del taller;
 * sistema-del-panel.md §2, 18/11), como la leyenda de `SeccionFormulario`, así todas las tarjetas de un formulario llevan
 * el título en el mismo lugar. Con acción ("Cambiar"), la fila tiene el alto del botón; sin ella, el mismo margen que la
 * leyenda. `descripcion`: una línea de ayuda debajo del título.
 */
export function CabeceraTarjeta(props: {
  id: string;
  titulo: string;
  descripcion?: string;
  /** Sobre filas que llegan al borde con 1 rem de relleno (los montos de un trabajo): el título alineado con ellas. */
  angosta?: boolean;
  children?: React.ReactNode;
}) {
  const { id, titulo, descripcion, angosta, children } = props;
  return (
    <div className={cn("flex flex-col gap-1 px-4", !angosta && "sm:px-5", children ? "pt-2 sm:pt-3" : "pt-4 sm:pt-5")}>
      <CabeceraSeccion id={id} titulo={titulo} compacta={!children}>
        {children}
      </CabeceraSeccion>
      {descripcion && <p className="text-sm text-tinta-suave">{descripcion}</p>}
    </div>
  );
}

/**
 * Una sección que se lee, sin "Editar" propio (el logo, que se guarda al momento; los datos de una reserva): el título
 * arriba de su tarjeta y su acción al lado (sistema-del-panel.md §2). `sinRelleno`: la tarjeta lleva filas que llegan al
 * borde (los servicios y los pagos de un trabajo) y cada una pone su propio relleno.
 */
export function Seccion(props: {
  id: string;
  titulo: string;
  accion?: React.ReactNode;
  sinRelleno?: boolean;
  /** El título adentro de la tarjeta (`CabeceraTarjeta`): cuando la sección va en un formulario o un paso del taller. */
  dentro?: boolean;
  children: React.ReactNode;
}) {
  const { id, titulo, accion, sinRelleno, dentro, children } = props;
  if (dentro) {
    return (
      <section aria-labelledby={`${id}-titulo`} className="tt-tarjeta-panel flex flex-col overflow-hidden">
        <CabeceraTarjeta id={id} titulo={titulo} angosta={sinRelleno}>
          {accion}
        </CabeceraTarjeta>
        <div className={sinRelleno ? "mt-3 flex flex-col border-t border-border" : "px-4 pt-3 pb-4 sm:px-5 sm:pb-5"}>{children}</div>
      </section>
    );
  }
  return (
    <section aria-labelledby={`${id}-titulo`} className="flex flex-col gap-2">
      <CabeceraSeccion id={id} titulo={titulo}>
        {accion}
      </CabeceraSeccion>
      <div className={cn("tt-tarjeta-panel flex-1", sinRelleno ? "flex flex-col overflow-hidden" : "p-4")}>{children}</div>
    </section>
  );
}
