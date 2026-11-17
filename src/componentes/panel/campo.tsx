import { createContext, useContext, useId } from "react";
import { CircleAlertIcon } from "lucide-react";
import { Label } from "@/componentes/ui/label";

// Componente de cliente: se usa dentro de otros componentes de cliente (usa useId y un contexto).
// Campo de formulario del panel: etiqueta, control, y debajo el error o la ayuda.
//
// Ids únicos (27/10/2026): Next 16 deja hasta 3 páginas anteriores ocultas en el documento (Activity), y un campo con
// el mismo id en una de ellas ("nombre", "nota", "telefono"…) se quedaba con la etiqueta del de la página actual: el
// lector de pantalla no lo anunciaba. Por eso Campo usa un id propio (`<id>-<useId>`) para la etiqueta, el error y la
// ayuda, y lo pasa a su control: Input, Textarea y Selector lo toman solos (atributosDeCampo) cuando su `id` es el del
// Campo, junto con aria-describedby hacia el error o la ayuda. Las pantallas siguen escribiendo `id="nombre"`.

type ContextoCampo = { base: string; id: string; descripcion: string | undefined };
const Contexto = createContext<ContextoCampo | null>(null);

/**
 * `opcional`: se puede dejar vacío. La regla del panel (pulido 13.10): se marca lo opcional, no lo obligatorio, con
 * "(opcional)" junto a la etiqueta, en gris y sin negrita. Es parte de la etiqueta: el lector de pantalla lo dice.
 */
export function Campo(props: { id: string; etiqueta: string; opcional?: boolean; error?: string; ayuda?: React.ReactNode; children: React.ReactNode }) {
  const id = `${props.id}-${useId()}`;
  const descripcion = props.error ? `${id}-error` : props.ayuda ? `${id}-ayuda` : undefined;
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>
        {props.etiqueta}
        {/* El espacio, para el lector de pantalla (sin él diría "Marca(opcional)"); el margen lo descuenta del hueco de la etiqueta */}
        {props.opcional && <span className="-ml-1 font-normal text-tinta-suave">{" (opcional)"}</span>}
      </Label>
      <Contexto.Provider value={{ base: props.id, id, descripcion }}>{props.children}</Contexto.Provider>
      {props.error ? (
        <MensajeError id={`${id}-error`}>{props.error}</MensajeError>
      ) : (
        props.ayuda && <p id={`${id}-ayuda`} className="text-sm text-tinta-suave">{props.ayuda}</p>
      )}
    </div>
  );
}

/**
 * Para los controles comunes (Input, Textarea, Selector): dentro de su Campo (el mismo `id`), el id único del Campo y
 * su aria-describedby. Fuera de un Campo, o si es otro control dentro del mismo (como el menú de la opción al lado del
 * del servicio), los atributos quedan como vienen.
 */
export function useAtributosDeCampo<P extends { id?: string; "aria-describedby"?: string }>(props: P): P {
  const campo = useContext(Contexto);
  if (!campo || props.id !== campo.base) return props;
  return { ...props, id: campo.id, "aria-describedby": campo.descripcion };
}

export function MensajeError({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p id={id} className="flex items-center gap-1 text-sm font-semibold text-rojo-texto">
      <CircleAlertIcon className="size-4 shrink-0" aria-hidden />
      {children}
    </p>
  );
}
