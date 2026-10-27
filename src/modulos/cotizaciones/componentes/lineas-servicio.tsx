import { CampoMonto } from "@/componentes/panel/campo-monto";
import { EditorLista } from "@/componentes/panel/editor-lista";
import { mostrarMonto } from "@/modulos/catalogo/reglas";
import type { OpcionServicio } from "../consultas";
import { MAXIMO_LINEAS, serviciosConOpciones, type Sugerencia } from "../reglas";
import { ElegirServicio } from "./elegir-servicio";

// Componente de cliente: se usa dentro de otros componentes de cliente (recibe funciones como props).
// Servicios con su precio: los usan la cotización (HU-25) y la reserva directa (HU-30). Se elige el servicio y, si tiene
// varias opciones, cuál (ElegirServicio, pulido 9.4); entonces llega el precio vigente del tamaño del vehículo, y
// "según evaluación" o sin cargar lo dejan vacío para escribirlo. Viajan como JSON en el campo oculto "lineas"
// (EditorLista); el servidor los valida de nuevo.

/** `servicioId`: el servicio elegido mientras falta su opción (con la opción elegida, sale de ella). */
export type Linea = { servicioId?: number; varianteId: number; precio: string };

type Props = {
  opciones: OpcionServicio[];
  lineas: Linea[];
  onChange: (lineas: Linea[]) => void;
  errores: Partial<Record<string, string>>;
};

const textoSugerencia = (s: Sugerencia) =>
  s.tipo === "monto"
    ? `Precio sugerido: ${mostrarMonto(s.monto)} Bs`
    : s.tipo === "evaluacion"
      ? "Según evaluación: escribe el precio"
      : "Sin precio en el catálogo para este tamaño: escribe el precio";

export function LineasServicio({ opciones, lineas, onChange, errores }: Props) {
  const opcion = (varianteId: number) => opciones.find((o) => o.varianteId === varianteId);
  const grupos = serviciosConOpciones(opciones);

  return (
    <EditorLista<Linea>
      nombre="lineas"
      etiqueta="Servicio"
      valor={lineas}
      onChange={onChange}
      nueva={() => ({ varianteId: 0, precio: "" })}
      maximo={MAXIMO_LINEAS}
      textoAgregar="Agregar servicio"
      errores={errores}
      fila={(l, cambiar, i, marca) => {
        const elegida = opcion(l.varianteId);
        const servicioId = elegida?.servicioId ?? l.servicioId ?? 0;
        // El error de la fila va al menú o campo que falta: el servicio, su opción o el precio
        const sinMarca = { "aria-invalid": false, "aria-describedby": undefined };
        const falta = !servicioId ? "servicio" : !elegida ? "opcion" : "precio";
        return (
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
            <ElegirServicio
              grupos={grupos}
              servicioId={servicioId}
              varianteId={l.varianteId}
              onChange={({ servicioId: nuevo, opcion: o }) =>
                cambiar({ servicioId: nuevo || undefined, varianteId: o?.varianteId ?? 0, precio: o?.sugerencia.tipo === "monto" ? mostrarMonto(o.sugerencia.monto) : "" })
              }
              etiquetaServicio={`Servicio ${i + 1}`}
              etiquetaOpcion={`Opción del servicio ${i + 1}`}
              marcaServicio={falta === "servicio" ? marca : sinMarca}
              marcaOpcion={falta === "opcion" ? marca : sinMarca}
            />
            <CampoMonto aria-label={`Precio del servicio ${i + 1}`} value={l.precio} onChange={(ev) => cambiar({ ...l, precio: ev.target.value })} {...(falta === "precio" ? marca : sinMarca)} />
            {elegida && <p className="text-sm text-tinta-suave sm:col-span-2">{textoSugerencia(elegida.sugerencia)}</p>}
          </div>
        );
      }}
    />
  );
}
