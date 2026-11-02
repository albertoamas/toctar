"use client";

import { useActionState, useRef, useState } from "react";
import { useFocoEnError } from "@/componentes/foco-en-error";
import { Campo, MensajeError } from "@/componentes/panel/campo";
import { CampoMonto } from "@/componentes/panel/campo-monto";
import { MasDatos } from "@/componentes/panel/mas-datos";
import { PieFormulario } from "@/componentes/panel/pie-formulario";
import { Selector } from "@/componentes/panel/selector";
import { Button } from "@/componentes/ui/button";
import { Checkbox } from "@/componentes/ui/checkbox";
import { Input } from "@/componentes/ui/input";
import { RadioGroup, RadioGroupItem } from "@/componentes/ui/radio-group";
import { Textarea } from "@/componentes/ui/textarea";
import type { EstadoFormulario } from "@/lib/formularios";
import { leerMonto, mostrarMonto } from "@/modulos/catalogo/reglas";
import { calcularTotales } from "@/modulos/cotizaciones/reglas";
import type { OpcionServicio } from "@/modulos/cotizaciones/consultas";
import { LineasServicio, type Linea } from "@/modulos/cotizaciones/componentes/lineas-servicio";
import { CampoComprobante, useEnvioConComprobante } from "@/modulos/pagos/componentes/campo-comprobante";
import { METODOS, NOMBRE_METODO } from "@/modulos/pagos/reglas";
import { agendarReserva } from "../acciones";
import type { EspacioDisponible } from "../consultas";
import { fechaEntregaSugerida } from "../reglas";
import { useEspaciosLibres } from "./espacios-libres";

// HU-30: agendar una reserva (RF-36, RF-37). Las fechas sugieren la entrega con la mayor duración de los servicios
// (decisión del 20/10: es aproximada y se edita); al cambiarlas se vuelven a pedir los espacios libres (RN-06). El
// servidor vuelve a mirar todo y la base rechaza un cruce aunque dos personas reserven a la vez.
// Pulido 10.2: la hora y la nota plegadas (se usan a veces), sin las ayudas que repetían Configuración, y "Agendar" en
// PieFormulario: fijo abajo en el celular, con el total al lado en la reserva directa (como en Cotizar).

type Origen =
  | { tipo: "cotizacion"; cotizacionId: number; duraciones: number[] }
  | {
      tipo: "directa";
      clienteId: number;
      vehiculoId: number;
      opciones: OpcionServicio[];
      recordatorioId?: number | null;
      /** Las líneas con que llega (un mantenimiento, con su servicio ya elegido: pedido 21). */
      lineasIniciales?: Linea[];
    };

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


export function FormularioReserva({ origen, tecnicos, conPagos, adelantoSugerido, hoy, fechaInicial, espacioInicial, espaciosIniciales }: Props) {
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(agendarReserva, {});
  const formulario = useRef<HTMLFormElement>(null);
  useFocoEnError(formulario, estado);
  const e = estado.errores ?? {};

  // Todo controlado: React reinicia el formulario al terminar la acción y así nada se pierde tras un error
  const [lineas, setLineas] = useState<Linea[]>(origen.tipo === "directa" ? (origen.lineasIniciales ?? []) : []);
  const duraciones =
    origen.tipo === "cotizacion"
      ? origen.duraciones
      : lineas.map((l) => origen.opciones.find((o) => o.varianteId === l.varianteId)?.duracion ?? 1);
  const [fechaInicio, setFechaInicio] = useState(fechaInicial);
  // La entrega sigue a la sugerida mientras no se toque a mano. Con el ingreso borrado (el campo de fecha queda
  // vacío mientras se escribe) no hay sugerencia: sumar días a "" fallaría
  const [fechaFinManual, setFechaFinManual] = useState<string | null>(null);
  const fechaFin = fechaFinManual ?? (fechaInicio ? fechaEntregaSugerida(fechaInicio, duraciones) : "");
  const { libres, buscando, ayuda } = useEspaciosLibres(fechaInicio, fechaFin, { iniciales: espaciosIniciales });
  // El elegido vale mientras siga libre en las fechas de ahora
  const [espacioElegido, setEspacioId] = useState(espacioInicial ? String(espacioInicial) : "");
  const espacioId = libres.some((x) => String(x.id) === espacioElegido) ? espacioElegido : "";
  const [tecnicoId, setTecnicoId] = useState("");
  const [horaIngreso, setHoraIngreso] = useState("");
  const [nota, setNota] = useState("");
  const [sinAdelanto, setSinAdelanto] = useState(false);
  const [adelanto, setAdelanto] = useState(mostrarMonto(adelantoSugerido));
  const [metodo, setMetodo] = useState<string>("");
  // El comprobante del adelanto va achicado; con "Sin adelanto" no va
  const { setComprobante, preparando, errorFoto, enviar } = useEnvioConComprobante(accion);

  function cambiarFechas(inicio: string, fin: string | null) {
    setFechaInicio(inicio);
    setFechaFinManual(fin);
  }

  // La misma cuenta que el servidor (centavos), no una suma de decimales
  const total =
    origen.tipo === "directa"
      ? calcularTotales(
          lineas.map((l) => leerMonto(l.precio) ?? "0"),
          "0",
        ).total
      : null;

  return (
    <form ref={formulario} action={accion} onSubmit={(ev) => enviar(ev, conPagos && !sinAdelanto)} className="flex max-w-3xl flex-col gap-6" noValidate>
      <input type="hidden" name="origen" value={origen.tipo} />
      {origen.tipo === "cotizacion" ? (
        <input type="hidden" name="cotizacionId" value={origen.cotizacionId} />
      ) : (
        <>
          <input type="hidden" name="clienteId" value={origen.clienteId} />
          <input type="hidden" name="vehiculoId" value={origen.vehiculoId} />
          {origen.recordatorioId && <input type="hidden" name="recordatorioId" value={origen.recordatorioId} />}
        </>
      )}
      {estado.mensaje && !estado.ok && <MensajeError id="reserva-error">{estado.mensaje}</MensajeError>}

      {origen.tipo === "directa" && (
        <fieldset className="tt-seccion-formulario flex flex-col gap-4">
          <legend className="tt-titulo-seccion">Servicios</legend>
          <LineasServicio opciones={origen.opciones} lineas={lineas} onChange={setLineas} errores={e} />
          {/* El total, al pie con "Agendar" */}
        </fieldset>
      )}

      <fieldset className="tt-seccion-formulario flex flex-col gap-5">
        <legend className="tt-titulo-seccion">Fechas y espacio</legend>
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
          <Campo id="fechaFin" etiqueta="Entrega aproximada" error={e.fechaFin} ayuda="Se le da al cliente como aproximada.">
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
          ayuda={ayuda}
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

      <fieldset className="tt-seccion-formulario flex flex-col gap-5">
        <legend className="tt-titulo-seccion">Detalles</legend>
        <Campo id="tecnicoId" etiqueta="Técnico" error={e.tecnicoId}>
          <Selector id="tecnicoId" name="tecnicoId" value={tecnicoId} onChange={(ev) => setTecnicoId(ev.target.value)} aria-invalid={!!e.tecnicoId} aria-describedby={e.tecnicoId ? "tecnicoId-error" : undefined} className="max-w-xs">
            <option value="">Sin asignar</option>
            {tecnicos.map((t) => (
              <option key={t.id} value={t.id}>{t.nombre}</option>
            ))}
          </Selector>
        </Campo>
        {/* Se usan a veces: plegadas; se abren solas si traen algo escrito o un error */}
        <MasDatos texto="Agregar hora y nota" abierto={!!horaIngreso || !!nota || !!e.horaIngreso || !!e.nota}>
          <Campo id="horaIngreso" etiqueta="Hora aproximada" error={e.horaIngreso} ayuda="Como lo dijo el cliente: «a las 9», «en la tarde».">
            <Input id="horaIngreso" name="horaIngreso" autoComplete="off" value={horaIngreso} onChange={(ev) => setHoraIngreso(ev.target.value)} className="max-w-xs" aria-invalid={!!e.horaIngreso} />
          </Campo>
          <Campo id="nota" etiqueta="Nota" error={e.nota}>
            <Textarea id="nota" name="nota" rows={2} value={nota} onChange={(ev) => setNota(ev.target.value)} aria-invalid={!!e.nota} />
          </Campo>
        </MasDatos>
      </fieldset>

      {conPagos && (
        <fieldset className="tt-seccion-formulario flex flex-col gap-5">
          <legend className="tt-titulo-seccion">Adelanto</legend>
          {sinAdelanto && <input type="hidden" name="sinAdelanto" value="on" />}
          <label htmlFor="sinAdelanto" className="flex min-h-11 cursor-pointer items-center gap-3">
            <Checkbox id="sinAdelanto" checked={sinAdelanto} onCheckedChange={(si) => {
                setSinAdelanto(si === true);
                // El campo de la foto se va y vuelve vacío: la elegida no queda escondida para subirse igual
                if (si === true) setComprobante(null);
              }}
            />
            <span className="font-medium">Sin adelanto</span>
          </label>
          {!sinAdelanto && (
            <>
              <Campo id="adelanto" etiqueta="Monto" error={e.adelanto}>
                <CampoMonto id="adelanto" name="adelanto" value={adelanto} onChange={(ev) => setAdelanto(ev.target.value)} aria-invalid={!!e.adelanto} />
              </Campo>
              <div className="flex flex-col gap-3">
                <p id="metodo-titulo" className="text-sm font-medium">Método</p>
                {/* El valor en un campo oculto propio: los radios de base-ui se vaciaban al reiniciarse el formulario */}
                <input type="hidden" name="metodo" value={metodo} />
                <RadioGroup value={metodo} onValueChange={(v) => setMetodo(String(v))} aria-labelledby="metodo-titulo" aria-describedby={e.metodo ? "metodo-error" : undefined} className="flex flex-wrap gap-2">
                  {METODOS.map((m, i) => (
                    <label key={m} htmlFor={`metodo-${m}`} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-border bg-fondo px-3 py-2 has-data-checked:border-tinta">
                      <RadioGroupItem id={`metodo-${m}`} value={m} data-invalido={(!!e.metodo && i === 0) || undefined} />
                      <span className="font-semibold">{NOMBRE_METODO[m]}</span>
                    </label>
                  ))}
                </RadioGroup>
                {e.metodo && <MensajeError id="metodo-error">{e.metodo}</MensajeError>}
              </div>
              <CampoComprobante onChange={setComprobante} error={errorFoto ?? e.comprobante} />
            </>
          )}
        </fieldset>
      )}

      <PieFormulario>
        <div className="flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-2 sm:justify-start">
          {/* El total de la reserva directa, a la vista mientras se cargan los precios */}
          {total !== null && total !== "0.00" && (
            <p className="flex items-baseline gap-2">
              <span className="text-tinta-suave">Total</span>
              <span className="text-lg font-bold tabular-nums">{mostrarMonto(total)} Bs</span>
            </p>
          )}
          <Button type="submit" disabled={enviando || buscando || preparando}>
            {preparando ? "Preparando foto…" : enviando ? "Agendando…" : "Agendar"}
          </Button>
        </div>
      </PieFormulario>
    </form>
  );
}
