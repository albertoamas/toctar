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
  return (
    <fieldset className="tt-seccion-formulario">
      <legend className={tituloOculto ? "sr-only" : cn("flex flex-col gap-1", accion ? "tt-leyenda-con-accion" : "mb-5")}>
        <span className="tt-titulo-seccion">{titulo}</span>
        {descripcion && <span className="text-sm text-tinta-suave">{descripcion}</span>}
      </legend>
      {accion && <div className="tt-accion-leyenda">{accion}</div>}
      <div className={cn("flex flex-col gap-5", claseContenido)}>{children}</div>
    </fieldset>
  );
}
