import { cn } from "cn";

// Una parte de un formulario largo del panel (pedido 26): una tarjeta (tt-seccion-formulario) con su título y, si hace
// falta, una línea que dice qué es. Es un fieldset: el lector de pantalla anuncia el título al entrar a sus campos.
// Todas las partes de formulario del panel pasan por aquí (Negocio, Parámetros, la página de un servicio, la reserva, la
// cotización), así la regla de abajo vale en un solo lugar.
//
// El fieldset NO es flex: lo es el div de adentro. Safari (también Chrome y Firefox del iPhone, que usan su motor) no
// deja flotar una leyenda dentro de un contenedor flex, y entonces la dibuja sobre el borde: el título quedaba encima de
// la tarjeta y el primer campo, pegado arriba. `claseContenido` va al div del contenido (por ejemplo, otro espacio entre
// campos); `tituloOculto` deja el título solo para el lector de pantalla.

type Props = {
  titulo: string;
  descripcion?: string;
  tituloOculto?: boolean;
  /** Una acción sin borde al lado del título ("Buscar un cliente registrado"): fuera de la leyenda, que nombra al grupo. */
  accion?: React.ReactNode;
  claseContenido?: string;
  children: React.ReactNode;
};

export function SeccionFormulario({ titulo, descripcion, tituloOculto, accion, claseContenido, children }: Props) {
  // La cabecera como la de las tarjetas (CabeceraTarjeta): el título en su franja, con una línea abajo, a todo el ancho de
  // la tarjeta. Con una acción al lado, la leyenda (que nombra al grupo) queda para el lector y la franja la dibuja un div:
  // un botón dentro de la leyenda se leería como parte del nombre
  const franja = "-mx-4 -mt-4 mb-5 flex min-h-14 border-b border-border px-4 py-1.5 sm:-mx-5 sm:-mt-5 sm:px-5";
  return (
    <fieldset className="tt-seccion-formulario">
      {tituloOculto || accion ? (
        <legend className="sr-only">{titulo}</legend>
      ) : (
        <legend className={cn(franja, "w-[calc(100%+2rem)] flex-col justify-center sm:w-[calc(100%+2.5rem)]", descripcion && "pb-3")}>
        <span className="tt-titulo-seccion">{titulo}</span>
        {descripcion && <span className="text-sm text-tinta-suave">{descripcion}</span>}
      </legend>
      )}
      {accion && !tituloOculto && (
        <div aria-hidden={false} className={cn(franja, "flex-wrap items-center justify-between gap-x-3")}>
          <span aria-hidden className="tt-titulo-seccion">
            {titulo}
          </span>
          {accion}
        </div>
      )}
      <div className={cn("flex flex-col gap-5", claseContenido)}>{children}</div>
    </fieldset>
  );
}
