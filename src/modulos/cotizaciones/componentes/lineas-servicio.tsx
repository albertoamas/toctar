import { CampoMonto } from "@/componentes/panel/campo-monto";
import { EditorLista } from "@/componentes/panel/editor-lista";
import { Selector } from "@/componentes/panel/selector";
import { mostrarMonto } from "@/modulos/catalogo/reglas";
import type { OpcionServicio } from "../consultas";
import { MAXIMO_LINEAS, type Sugerencia } from "../reglas";

// Componente de cliente: se usa dentro de otros componentes de cliente (recibe funciones como props).
// Servicios con su precio: los usan la cotización (HU-25) y la reserva directa (HU-30). Al elegir un servicio llega el
// precio vigente del tamaño del vehículo; "según evaluación" o sin cargar lo dejan vacío para escribirlo. Viajan como
// JSON en el campo oculto "lineas" (EditorLista); el servidor los valida de nuevo.

export type Linea = { varianteId: number; precio: string };

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

/** Agrupa las opciones por servicio para el selector (un servicio con varias variantes). */
function porServicio(opciones: OpcionServicio[]) {
  const grupos = new Map<string, OpcionServicio[]>();
  for (const o of opciones) grupos.set(o.servicio, [...(grupos.get(o.servicio) ?? []), o]);
  return [...grupos];
}

export function LineasServicio({ opciones, lineas, onChange, errores }: Props) {
  const opcion = (varianteId: number) => opciones.find((o) => o.varianteId === varianteId);
  const grupos = porServicio(opciones);

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
        // El error de la fila va al campo que falta: el servicio si no se eligió; si no, el precio
        const sinMarca = { "aria-invalid": false, "aria-describedby": undefined };
        return (
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
            <Selector
              aria-label={`Servicio ${i + 1}`}
              value={l.varianteId || ""}
              onChange={(ev) => {
                const nueva = opcion(Number(ev.target.value));
                cambiar({ varianteId: Number(ev.target.value), precio: nueva?.sugerencia.tipo === "monto" ? mostrarMonto(nueva.sugerencia.monto) : "" });
              }}
              {...(elegida ? sinMarca : marca)}
            >
              <option value="">Elige el servicio</option>
              {grupos.map(([servicio, deServicio]) =>
                deServicio.length === 1 ? (
                  <option key={servicio} value={deServicio[0].varianteId}>{deServicio[0].descripcion}</option>
                ) : (
                  <optgroup key={servicio} label={servicio}>
                    {deServicio.map((o) => (
                      <option key={o.varianteId} value={o.varianteId}>{o.descripcion}</option>
                    ))}
                  </optgroup>
                ),
              )}
            </Selector>
            <div className="flex flex-col gap-1">
              <CampoMonto aria-label={`Precio del servicio ${i + 1}`} value={l.precio} onChange={(ev) => cambiar({ ...l, precio: ev.target.value })} {...(elegida ? marca : sinMarca)} />
            </div>
            {elegida && <p className="text-sm text-tinta-suave sm:col-span-2">{textoSugerencia(elegida.sugerencia)}</p>}
          </div>
        );
      }}
    />
  );
}
