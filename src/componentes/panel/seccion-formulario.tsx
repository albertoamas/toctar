import { cn } from "cn";

// Una parte de un formulario largo del panel (pedido 26): una tarjeta (tt-seccion-formulario) con su título y, si hace
// falta, una línea que dice qué es. Es un fieldset: el lector de pantalla anuncia el título al entrar a sus campos. La
// usan los formularios por partes (Negocio, la página de un servicio); los demás ponen la clase en su propio fieldset.

type Props = { titulo: string; descripcion?: string; className?: string; children: React.ReactNode };

export function SeccionFormulario({ titulo, descripcion, className, children }: Props) {
  return (
    <fieldset className={cn("tt-seccion-formulario flex flex-col gap-5", className)}>
      <legend className="flex flex-col gap-1">
        <span className="tt-titulo-seccion">{titulo}</span>
        {descripcion && <span className="text-sm text-tinta-suave">{descripcion}</span>}
      </legend>
      {children}
    </fieldset>
  );
}
