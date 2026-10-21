"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { useFocoEnError } from "@/componentes/foco-en-error";
import { Campo, MensajeError } from "@/componentes/panel/campo";
import { CampoMonto } from "@/componentes/panel/campo-monto";
import { Selector } from "@/componentes/panel/selector";
import { Button } from "@/componentes/ui/button";
import { Checkbox } from "@/componentes/ui/checkbox";
import { Input } from "@/componentes/ui/input";
import { RadioGroup, RadioGroupItem } from "@/componentes/ui/radio-group";
import { Textarea } from "@/componentes/ui/textarea";
import type { MetodoPago } from "@/db/esquema/trabajos";
import type { EstadoFormulario } from "@/lib/formularios";
import { leerMonto, mostrarMonto } from "@/modulos/catalogo/reglas";
import type { OpcionServicio } from "@/modulos/cotizaciones/consultas";
import { LineasServicio, type Linea } from "@/modulos/cotizaciones/componentes/lineas-servicio";
import { NOMBRE_METODO } from "@/modulos/pagos/reglas";
import { agendarReserva, consultarEspacios } from "../acciones";
import type { EspacioDisponible } from "../consultas";
import { fechaEntregaSugerida } from "../reglas";

// HU-30: agendar una reserva (RF-36, RF-37). Las fechas sugieren la entrega con la mayor duración de los servicios
// (decisión del 20/10: es aproximada y se edita); al cambiarlas se vuelven a pedir los espacios libres (RN-06). El
// servidor vuelve a mirar todo y la base rechaza un cruce aunque dos personas reserven a la vez.

type Origen =
  | { tipo: "cotizacion"; cotizacionId: number; duraciones: number[] }
  | { tipo: "directa"; clienteId: number; vehiculoId: number; opciones: OpcionServicio[] };

type Props = {
  origen: Origen;
  tecnicos: { id: number; nombre: string }[];
  /** Quien ve pagos registra el adelanto (RN-04); los demás agendan "sin adelanto". */
  conPagos: boolean;
  adelantoSugerido: string;
  hoy: string;
  fechaInicial: string;
  espacioInicial: number | null;
  espaciosIniciales: EspacioDisponible[];
};

const METODOS: MetodoPago[] = ["efectivo", "qr", "transferencia"];

export function FormularioReserva({ origen, tecnicos, conPagos, adelantoSugerido, hoy, fechaInicial, espacioInicial, espaciosIniciales }: Props) {
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(agendarReserva, {});
  const formulario = useRef<HTMLFormElement>(null);
  useFocoEnError(formulario, estado);
  const e = estado.errores ?? {};

  // Todo controlado: React reinicia el formulario al terminar la acción y así nada se pierde tras un error
  const [lineas, setLineas] = useState<Linea[]>([]);
  const duraciones =
    origen.tipo === "cotizacion"
      ? origen.duraciones
      : lineas.map((l) => origen.opciones.find((o) => o.varianteId === l.varianteId)?.duracion ?? 1);
  const [fechaInicio, setFechaInicio] = useState(fechaInicial);
  // La entrega sigue a la sugerida mientras no se toque a mano
  const [fechaFinManual, setFechaFinManual] = useState<string | null>(null);
  const fechaFin = fechaFinManual ?? fechaEntregaSugerida(fechaInicio, duraciones);
  const [espacios, setEspacios] = useState(espaciosIniciales);
  const [espacioId, setEspacioId] = useState(espacioInicial && espaciosIniciales.some((x) => x.id === espacioInicial && x.libre) ? String(espacioInicial) : "");
  const [buscando, iniciar] = useTransition();
  const [sinAdelanto, setSinAdelanto] = useState(false);
  const [adelanto, setAdelanto] = useState(mostrarMonto(adelantoSugerido));
  const [metodo, setMetodo] = useState<string>("");

  function cambiarFechas(inicio: string, fin: string | null) {
    setFechaInicio(inicio);
    setFechaFinManual(fin);
    const hasta = fin ?? fechaEntregaSugerida(inicio, duraciones);
    if (!inicio || !hasta) return;
    iniciar(async () => {
      const nuevos = await consultarEspacios({ fechaInicio: inicio, fechaFin: hasta });
      if (!nuevos) return;
      setEspacios(nuevos);
      // El elegido sigue si sigue libre
      if (!nuevos.some((x) => String(x.id) === espacioId && x.libre)) setEspacioId("");
    });
  }

  const libres = espacios.filter((x) => x.libre);
  const total =
    origen.tipo === "directa"
      ? lineas.reduce((s, l) => s + Number(leerMonto(l.precio) ?? 0), 0)
      : null;

  return (
    <form ref={formulario} action={accion} className="flex max-w-3xl flex-col gap-10" noValidate>
      <input type="hidden" name="origen" value={origen.tipo} />
      {origen.tipo === "cotizacion" ? (
        <input type="hidden" name="cotizacionId" value={origen.cotizacionId} />
      ) : (
        <>
          <input type="hidden" name="clienteId" value={origen.clienteId} />
          <input type="hidden" name="vehiculoId" value={origen.vehiculoId} />
        </>
      )}
      {estado.mensaje && !estado.ok && <MensajeError id="reserva-error">{estado.mensaje}</MensajeError>}

      {origen.tipo === "directa" && (
        <fieldset className="flex flex-col gap-4">
          <legend className="mb-4 font-heading text-2xl font-bold italic">Servicios</legend>
          <LineasServicio opciones={origen.opciones} lineas={lineas} onChange={setLineas} errores={e} />
          {total !== null && total > 0 && <p className="font-semibold">Total: {mostrarMonto(total.toFixed(2))} Bs</p>}
        </fieldset>
      )}

      <fieldset className="flex flex-col gap-5">
        <legend className="mb-5 font-heading text-2xl font-bold italic">Fechas y espacio</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <Campo id="fechaInicio" etiqueta="Ingresa el" error={e.fechaInicio}>
            <Input
              id="fechaInicio"
              name="fechaInicio"
              type="date"
              min={hoy}
              value={fechaInicio}
              onChange={(ev) => cambiarFechas(ev.target.value, fechaFinManual)}
              aria-invalid={!!e.fechaInicio}
              aria-describedby={e.fechaInicio ? "fechaInicio-error" : undefined}
            />
          </Campo>
          <Campo id="fechaFin" etiqueta="Entrega aproximada" error={e.fechaFin} ayuda="Sugerida por la duración de los servicios. Se le da al cliente como aproximada.">
            <Input
              id="fechaFin"
              name="fechaFin"
              type="date"
              min={fechaInicio}
              value={fechaFin}
              onChange={(ev) => cambiarFechas(fechaInicio, ev.target.value)}
              aria-invalid={!!e.fechaFin}
              aria-describedby={e.fechaFin ? "fechaFin-error" : "fechaFin-ayuda"}
            />
          </Campo>
        </div>
        <Campo
          id="espacioId"
          etiqueta="Espacio"
          error={e.espacioId}
          ayuda={buscando ? "Buscando espacios libres…" : libres.length === 0 ? "No hay espacio libre en esas fechas: elige otras." : "Solo los libres en esas fechas."}
        >
          <Selector
            id="espacioId"
            name="espacioId"
            value={espacioId}
            onChange={(ev) => setEspacioId(ev.target.value)}
            disabled={buscando}
            aria-invalid={!!e.espacioId}
            aria-describedby={e.espacioId ? "espacioId-error" : "espacioId-ayuda"}
            className="max-w-xs"
          >
            <option value="">Elige el espacio</option>
            {libres.map((x) => (
              <option key={x.id} value={x.id}>{x.nombre}</option>
            ))}
          </Selector>
        </Campo>
      </fieldset>

      <fieldset className="flex flex-col gap-5">
        <legend className="mb-5 font-heading text-2xl font-bold italic">Detalles</legend>
        <Campo id="tecnicoId" etiqueta="Técnico" error={e.tecnicoId}>
          <Selector id="tecnicoId" name="tecnicoId" defaultValue="" aria-invalid={!!e.tecnicoId} aria-describedby={e.tecnicoId ? "tecnicoId-error" : undefined} className="max-w-xs">
            <option value="">Sin asignar</option>
            {tecnicos.map((t) => (
              <option key={t.id} value={t.id}>{t.nombre}</option>
            ))}
          </Selector>
        </Campo>
        <Campo id="horaIngreso" etiqueta="Hora aproximada" error={e.horaIngreso} ayuda="Como lo dijo el cliente: «a las 9», «en la tarde».">
          <Input id="horaIngreso" name="horaIngreso" autoComplete="off" className="max-w-xs" aria-invalid={!!e.horaIngreso} aria-describedby={e.horaIngreso ? "horaIngreso-error" : "horaIngreso-ayuda"} />
        </Campo>
        <Campo id="nota" etiqueta="Nota" error={e.nota}>
          <Textarea id="nota" name="nota" rows={2} aria-invalid={!!e.nota} aria-describedby={e.nota ? "nota-error" : undefined} />
        </Campo>
      </fieldset>

      {conPagos && (
        <fieldset className="flex flex-col gap-5">
          <legend className="mb-5 font-heading text-2xl font-bold italic">Adelanto</legend>
          {sinAdelanto && <input type="hidden" name="sinAdelanto" value="on" />}
          <label htmlFor="sinAdelanto" className="flex min-h-11 cursor-pointer items-center gap-3">
            <Checkbox id="sinAdelanto" checked={sinAdelanto} onCheckedChange={(si) => setSinAdelanto(si === true)} />
            <span className="font-medium">Sin adelanto</span>
          </label>
          {!sinAdelanto && (
            <>
              <Campo id="adelanto" etiqueta="Monto" error={e.adelanto} ayuda="El sugerido de Configuración; el cliente puede dar más.">
                <CampoMonto id="adelanto" name="adelanto" value={adelanto} onChange={(ev) => setAdelanto(ev.target.value)} aria-invalid={!!e.adelanto} aria-describedby={e.adelanto ? "adelanto-error" : "adelanto-ayuda"} />
              </Campo>
              <div className="flex flex-col gap-3">
                <p id="metodo-titulo" className="text-sm font-medium">Método</p>
                {/* El valor en un campo oculto propio: los radios de base-ui se vaciaban al reiniciarse el formulario */}
                <input type="hidden" name="metodo" value={metodo} />
                <RadioGroup value={metodo} onValueChange={(v) => setMetodo(String(v))} aria-labelledby="metodo-titulo" aria-describedby={e.metodo ? "metodo-error" : undefined} className="flex flex-wrap gap-2">
                  {METODOS.map((m, i) => (
                    <label key={m} htmlFor={`metodo-${m}`} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-sm border border-border px-3 py-2 has-data-checked:border-tinta">
                      <RadioGroupItem id={`metodo-${m}`} value={m} data-invalido={(!!e.metodo && i === 0) || undefined} />
                      <span className="font-semibold">{NOMBRE_METODO[m]}</span>
                    </label>
                  ))}
                </RadioGroup>
                {e.metodo && <MensajeError id="metodo-error">{e.metodo}</MensajeError>}
              </div>
            </>
          )}
        </fieldset>
      )}

      <div>
        <Button type="submit" disabled={enviando || buscando}>
          {enviando ? "Agendando…" : "Agendar"}
        </Button>
      </div>
    </form>
  );
}
