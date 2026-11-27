import { Selector } from "@/componentes/panel/selector";

// Componente de cliente: se usa dentro de otros componentes de cliente (recibe funciones como props).
// Elegir un servicio del catálogo (pulido 9.4): primero el servicio, uno por renglón; si tiene varias opciones ("1 año",
// "2 años"…), aparece al lado otro menú con ellas. En un solo menú se repetía el nombre del servicio en cada opción y
// no se distinguía cuál tenía opciones. Lo usan las líneas de la cotización y de la reserva directa, y los adicionales
// de una orden.

type Opcion = { servicioId: number; servicio: string; varianteId: number; variante: string };
type Grupo<T extends Opcion> = { servicioId: number; servicio: string; opciones: T[] };

/** Atributos de un menú con error: `aria-invalid` y `aria-describedby` hacia su mensaje. */
type Marca = { "aria-invalid"?: boolean; "aria-describedby"?: string };

type Props<T extends Opcion> = {
  grupos: Grupo<T>[];
  servicioId: number;
  varianteId: number;
  /** El servicio elegido y su opción (null mientras falta elegirla, o sin servicio). */
  onChange: (cambio: { servicioId: number; opcion: T | null }) => void;
  /** Con una etiqueta visible (un Campo), el id del menú del servicio; si no, su nombre para el lector de pantalla. */
  idServicio?: string;
  etiquetaServicio?: string;
  etiquetaOpcion: string;
  marcaServicio?: Marca;
  marcaOpcion?: Marca;
};

export function ElegirServicio<T extends Opcion>({ grupos, servicioId, varianteId, onChange, idServicio, etiquetaServicio, etiquetaOpcion, marcaServicio, marcaOpcion }: Props<T>) {
  const grupo = grupos.find((g) => g.servicioId === servicioId);
  const conOpciones = !!grupo && grupo.opciones.length > 1;

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Selector
        id={idServicio}
        aria-label={idServicio ? undefined : etiquetaServicio}
        value={servicioId || ""}
        onChange={(ev) => {
          const elegido = grupos.find((g) => g.servicioId === Number(ev.target.value));
          // Con una sola opción, ya queda elegida; con varias, falta elegirla
          onChange({ servicioId: elegido?.servicioId ?? 0, opcion: elegido?.opciones.length === 1 ? elegido.opciones[0] : null });
        }}
        className="sm:min-w-0 sm:flex-1"
        {...marcaServicio}
      >
        <option value="">Elige el servicio</option>
        {grupos.map((g) => (
          <option key={g.servicioId} value={g.servicioId}>{g.servicio}</option>
        ))}
      </Selector>
      {conOpciones && (
        <Selector
          aria-label={etiquetaOpcion}
          value={varianteId || ""}
          onChange={(ev) => onChange({ servicioId, opcion: grupo.opciones.find((o) => o.varianteId === Number(ev.target.value)) ?? null })}
          className="sm:w-44"
          {...marcaOpcion}
        >
          <option value="">Elige la opción</option>
          {grupo.opciones.map((o) => (
            <option key={o.varianteId} value={o.varianteId}>{o.variante}</option>
          ))}
        </Selector>
      )}
    </div>
  );
}
