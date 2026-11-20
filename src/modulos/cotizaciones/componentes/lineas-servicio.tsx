import { CampoMonto } from "@/componentes/panel/campo-monto";
import { EditorLista } from "@/componentes/panel/editor-lista";
import { mostrarMonto } from "@/modulos/catalogo/reglas";
import type { OpcionServicio } from "../consultas/servicios";
import { MAXIMO_LINEAS, serviciosConOpciones, SIN_SERVICIOS, type Sugerencia } from "../reglas";
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
  /** La pantalla trae una fila lista para elegir (Nueva reserva): sola y sin tocar, no cuenta como un servicio. */
  conFilaLista?: boolean;
};

const sinTocar = (l: Linea) => !l.varianteId && !l.servicioId && !l.precio.trim();

/** Los servicios que cuentan: ninguno si todas las filas están sin tocar (lo que se envía con `conFilaLista`). */
function lineasQueCuentan(lineas: Linea[]): Linea[] {
  return lineas.every(sinTocar) ? [] : lineas;
}

const textoSugerencia = (s: Sugerencia) =>
  s.tipo === "monto"
    ? `Precio sugerido: ${mostrarMonto(s.monto)} Bs`
    : s.tipo === "evaluacion"
      ? "Según evaluación: escribe el precio"
      : "Sin precio en el catálogo para este tamaño: escribe el precio";

export function LineasServicio({ opciones, lineas, onChange, errores: todos, conFilaLista }: Props) {
  // "Agrega al menos un servicio." se va en cuanto hay uno que cuenta, sin esperar a enviar (seguía debajo del servicio
  // elegido). Los de cada fila, y los que solo sabe el servidor, quedan hasta el próximo envío
  const errores = todos.lineas === SIN_SERVICIOS && lineasQueCuentan(lineas).length > 0 ? { ...todos, lineas: undefined } : todos;
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
      enBloques
      vacia={conFilaLista ? sinTocar : undefined}
      fila={(l, cambiar, i, marca) => {
        const elegida = opcion(l.varianteId);
        const servicioId = elegida?.servicioId ?? l.servicioId ?? 0;
        // El error de la fila va al menú o campo que falta: el servicio, su opción o el precio
        const sinMarca = { "aria-invalid": false, "aria-describedby": undefined };
        const falta = !servicioId ? "servicio" : !elegida ? "opcion" : "precio";
        return (
          // En el celular, apilados: el servicio, su opción y el precio con su etiqueta a la izquierda y el campo a la derecha
          // (los montos en columna). En pantalla ancha, todo en una fila (20/11). De dónde sale el precio, debajo
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-3 @2xl:flex-row @2xl:items-start">
            <div className="min-w-0 @2xl:flex-1">
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
            </div>
            <div className="flex shrink-0 items-center justify-between gap-x-3 @2xl:justify-start">
              <span aria-hidden className="text-sm font-medium @2xl:hidden">
                Precio
              </span>
              <CampoMonto aria-label={`Precio del servicio ${i + 1}`} value={l.precio} onChange={(ev) => cambiar({ ...l, precio: ev.target.value })} {...(falta === "precio" ? marca : sinMarca)} />
            </div>
            </div>
            {elegida && <p className="text-sm text-tinta-suave">{textoSugerencia(elegida.sugerencia)}</p>}
          </div>
        );
      }}
    />
  );
}
