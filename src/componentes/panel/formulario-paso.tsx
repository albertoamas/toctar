// Componente de cliente: se usa dentro de otros componentes de cliente (recibe la acción de un useActionState). Aparte de
// paso-siguiente.tsx, que usan las páginas del servidor: el campo de error es de cliente.
import { MensajeError } from "@/componentes/panel/campo";
import { BOTON_PASO } from "@/componentes/panel/paso-siguiente";
import { Button } from "@/componentes/ui/button";

/**
 * El paso siguiente que guarda al tocarlo (empezar el trabajo, marcar listo, "Aceptó"): un formulario con un solo botón
 * grande y, si el servidor no pudo, el motivo debajo. Quien lo usa tiene su acción (`useActionState` con `conAviso`).
 */
export function FormularioPaso(props: {
  /** El nombre del formulario para el lector ("Estado de la orden"). */
  etiqueta: string;
  accion: (datos: FormData) => void;
  /** Los campos ocultos: qué se cambia y a qué. */
  ocultos: Record<string, string | number>;
  enviando: boolean;
  /** El motivo, si el servidor no pudo. */
  error?: string;
  idError: string;
  children: React.ReactNode;
}) {
  const { etiqueta, accion, ocultos, enviando, error, idError, children } = props;
  return (
    <form action={accion} aria-label={etiqueta} className="flex flex-col gap-2 sm:w-80">
      {Object.entries(ocultos).map(([nombre, valor]) => (
        <input key={nombre} type="hidden" name={nombre} value={valor} />
      ))}
      <Button type="submit" disabled={enviando} className={BOTON_PASO} aria-describedby={error ? idError : undefined}>
        {children}
      </Button>
      {error && <MensajeError id={idError}>{error}</MensajeError>}
    </form>
  );
}
