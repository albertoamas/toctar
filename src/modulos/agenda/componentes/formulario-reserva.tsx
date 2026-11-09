"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFocoDePaso } from "@/componentes/panel/foco-de-paso";
import { SeccionFormulario } from "@/componentes/panel/seccion-formulario";
import { Campo, MensajeError } from "@/componentes/panel/campo";
import { CampoMonto } from "@/componentes/panel/campo-monto";
import { MasDatos } from "@/componentes/panel/mas-datos";
import { PasosFlujo } from "@/componentes/panel/pasos-flujo";
import { AvisoAlSalir } from "@/componentes/panel/cambios-sin-guardar";
import { PieFormulario } from "@/componentes/panel/pie-formulario";
import { ResumenPaso } from "@/componentes/panel/resumen-paso";
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
import { LineasServicio, lineasQueCuentan, type Linea } from "@/modulos/cotizaciones/componentes/lineas-servicio";
import { CampoComprobante, useEnvioConComprobante } from "@/modulos/pagos/componentes/campo-comprobante";
import { METODOS, NOMBRE_METODO } from "@/modulos/pagos/reglas";
import { agendarReserva } from "../acciones";
import type { EspacioDisponible } from "../consultas";
import { erroresServicios, PASO_FECHA, PASO_SERVICIOS, pasoDeCampoReserva, pasosNuevaReserva } from "../pasos-reserva";
import { fechaEntregaSugerida } from "../reglas";
import { espacioVigente, useEspaciosLibres } from "./espacios-libres";

// HU-30: agendar una reserva (RF-36, RF-37). Las fechas sugieren la entrega con la mayor duración de los servicios
// (decisión del 20/10: es aproximada y se edita); al cambiarlas se vuelven a pedir los espacios libres (RN-06). El
// servidor vuelve a mirar todo y la base rechaza un cruce aunque dos personas reserven a la vez.
// Pulido 10.2: la hora y la nota plegadas (se usan a veces), sin las ayudas que repetían Configuración, y "Reservar" en
// PieFormulario: fijo abajo en el celular, con el total al lado en la reserva directa (como en Cotizar).
// Pedido 41 (etapas/P41-reserva-en-pasos.md): la reserva sin cotización son dos pasos de un mismo formulario, Servicios
// y Fecha y adelanto, con el indicador de los cuatro pasos y lo ya elegido arriba. Como en Nueva cotización, el paso va
// en la dirección (#servicios, #fecha), así el botón Atrás del celular vuelve al anterior, y un error de la acción
// vuelve al paso que lo tiene. Desde una cotización hay un solo paso: la fecha.

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
      /** Servicios o, si ya llega con servicios con precio, la fecha (`pasoInicialReserva`). */
      pasoInicial: typeof PASO_SERVICIOS | typeof PASO_FECHA;
    };

type Props = {
  origen: Origen;
  /** Quien ve pagos registra el adelanto (RN-04); los demás agendan "sin adelanto". */
  conPagos: boolean;
  adelantoSugerido: string;
  hoy: string;
  fechaInicial: string;
  espacioInicial: number | null;
  espaciosIniciales: EspacioDisponible[];
  /** Lo ya elegido (el cliente y su vehículo) y sus avisos: en la reserva directa, debajo del indicador de pasos. */
  arriba?: React.ReactNode;
  /** Las cotizaciones del vehículo para reservar, en el paso Servicios: con ellas, la reserva sin cotización va plegada. */
  cotizaciones?: React.ReactNode;
};

/** El paso en la dirección: el botón Atrás del celular vuelve al anterior sin salir de la pantalla. */
const ANCLA: Record<number, string> = { [PASO_SERVICIOS]: "servicios", [PASO_FECHA]: "fecha" };

export function FormularioReserva({ origen, conPagos, adelantoSugerido, hoy, fechaInicial, espacioInicial, espaciosIniciales, arriba, cotizaciones }: Props) {
  const directa = origen.tipo === "directa";
  const inicial = origen.tipo === "directa" ? origen.pasoInicial : PASO_FECHA;
  const [paso, setPaso] = useState<number>(inicial);
  // El paso a la vista, para los que escuchan el historial (sin esperar al próximo dibujo)
  const pasoActual = useRef<number>(inicial);
  // Los errores de "Siguiente" y la revisión de los servicios, atados al resultado de la acción con que se hicieron: con
  // un envío nuevo dejan de valer solos (sin reiniciarlos tras el await, que se dibujaba antes que el resultado)
  const [locales, setLocales] = useState<{ en: EstadoFormulario | null; errores: Record<string, string> }>({ en: null, errores: {} });
  const [revisadosEn, setRevisadosEn] = useState<EstadoFormulario | null>(null);
  // "Agrega al menos un servicio." ya corregido (se agregó uno que cuenta), para el resultado de la acción de ahora
  const [listaCorregidaEn, setListaCorregidaEn] = useState<EstadoFormulario | null>(null);
  const errorAlLlegar = useRef(false);
  const formulario = useRef<HTMLFormElement>(null);

  // Lo que devuelve la acción: los errores de nuevo y, si son de los servicios, la pantalla vuelve a ellos (como
  // conAviso: al terminar la acción, no en un efecto). Lo que hace al terminar está más abajo (`alTerminar`): usa el
  // foco, que necesita el resultado de la acción
  const alTerminar = useRef<(r: EstadoFormulario) => void>(() => {});
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(async (previo, datos) => {
    const r = await agendarReserva(previo, datos);
    alTerminar.current(r);
    return r;
  }, {});
  const foco = useFocoDePaso(formulario, paso, estado);

  /** Muestra un paso: lo que hace cada cambio de paso, venga de un botón o del historial. */
  function mostrar(nuevo: number) {
    pasoActual.current = nuevo;
    setPaso(nuevo);
    window.scrollTo({ top: 0 });
    foco.pedir(errorAlLlegar.current);
    errorAlLlegar.current = false;
  }

  /**
   * Volver a los servicios. Si se empezó en ellos, la fecha es la entrada siguiente del historial y se retrocede; si se
   * empezó en la fecha (un mantenimiento), los servicios son una entrada nueva.
   */
  function volverAServicios() {
    if (inicial === PASO_SERVICIOS) window.history.back();
    else {
      window.history.pushState(window.history.state, "", `#${ANCLA[PASO_SERVICIOS]}`);
      mostrar(PASO_SERVICIOS);
    }
  }

  useEffect(() => {
    alTerminar.current = (r) => {
      const errores = Object.keys(r.errores ?? {});
      if (errores.length === 0) return;
      foco.esperar(r);
      if (directa && pasoActual.current === PASO_FECHA && errores.some((c) => pasoDeCampoReserva(c) === PASO_SERVICIOS)) {
        errorAlLlegar.current = true;
        volverAServicios();
      } else foco.pedir(true);
    };
  });

  // Todo controlado: React reinicia el formulario al terminar la acción y así nada se pierde tras un error. Sin servicios
  // con que llegar, la primera fila ya está para elegir (pulido final del 09/11): siempre se agrega al menos uno
  const [lineas, setLineas] = useState<Linea[]>(
    origen.tipo === "directa" ? (origen.lineasIniciales?.length ? origen.lineasIniciales : [{ varianteId: 0, precio: "" }]) : [],
  );
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
  // y, sin uno elegido, el único libre (espacioVigente)
  const espacioId = espacioVigente(libres, espacioElegido);
  const [horaIngreso, setHoraIngreso] = useState("");
  const [nota, setNota] = useState("");
  const [sinAdelanto, setSinAdelanto] = useState(false);
  const [adelanto, setAdelanto] = useState(mostrarMonto(adelantoSugerido));
  const [metodo, setMetodo] = useState<string>("");
  // El comprobante del adelanto va achicado; con "Sin adelanto" no va
  const { comprobante, setComprobante, preparando, errorFoto, enviar } = useEnvioConComprobante(accion);

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

  // El historial: Atrás y Adelante del navegador (o del celular) cambian de paso. Adelante a la fecha revisa los servicios
  const alCambiarHistoria = useRef<() => void>(() => {});
  useEffect(() => {
    alCambiarHistoria.current = () => {
      const ancla = window.location.hash.slice(1);
      const destino = ancla === ANCLA[PASO_FECHA] ? PASO_FECHA : ancla === ANCLA[PASO_SERVICIOS] ? PASO_SERVICIOS : inicial;
      if (ancla === ANCLA[PASO_FECHA] && pasoActual.current === PASO_SERVICIOS && formulario.current) {
        const errores = erroresServicios(String(new FormData(formulario.current).get("lineas") ?? "[]"));
        if (Object.keys(errores).length > 0) {
          setLocales({ en: estado, errores });
          setListaCorregidaEn(null);
          errorAlLlegar.current = true;
          window.history.back();
          return;
        }
      }
      mostrar(destino);
    };
  });
  useEffect(() => {
    if (!directa) return;
    if (window.location.hash) window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
    const escuchar = () => alCambiarHistoria.current();
    window.addEventListener("popstate", escuchar);
    return () => window.removeEventListener("popstate", escuchar);
  }, [directa]);

  function siguiente() {
    const errores = erroresServicios(String(new FormData(formulario.current!).get("lineas") ?? "[]"));
    setLocales({ en: estado, errores });
    setListaCorregidaEn(null);
    if (Object.keys(errores).length > 0) {
      foco.pedir(true);
      return;
    }
    setRevisadosEn(estado);
    window.history.pushState(window.history.state, "", `#${ANCLA[PASO_FECHA]}`);
    mostrar(PASO_FECHA);
  }

  // Los errores que se ven: los de la acción (salvo los de los servicios si ya se revisaron de nuevo) y los de "Siguiente"
  const vigente = ([campo]: [string, unknown]) => !(revisadosEn === estado && pasoDeCampoReserva(campo) === PASO_SERVICIOS);
  const e: Partial<Record<string, string>> = {
    ...Object.fromEntries(Object.entries(estado.errores ?? {}).filter(vigente)),
    ...(locales.en === estado ? locales.errores : {}),
  };
  if (listaCorregidaEn === estado) delete e.lineas;
  const conErrorEnServicios = Object.keys(e).some((c) => pasoDeCampoReserva(c) === PASO_SERVICIOS && e[c]);
  // Con cotizaciones del vehículo, lo común es usar una: "Siguiente" aparece al empezar una sin cotización, y queda
  // aunque se quite el último servicio (así dice qué falta)
  // (la fila vacía con que empieza no cuenta: se empieza al abrir "Reserva sin cotización" o al elegir un servicio)
  const [armando, setArmando] = useState(origen.tipo === "directa" && (origen.lineasIniciales?.length ?? 0) > 0);
  const conSiguiente = !cotizaciones || armando || conErrorEnServicios;

  const servicios = origen.tipo === "directa" && (
    <SeccionFormulario titulo="Servicios" claseContenido="gap-4">
      <LineasServicio
        opciones={origen.opciones}
        lineas={lineas}
        onChange={(nuevas) => {
          setLineas(nuevas);
          if (nuevas.length > 0) setArmando(true);
          // "Agrega al menos un servicio." se va al agregar uno que cuenta (seguía debajo del servicio elegido hasta el
          // próximo "Siguiente"). Los de cada fila, y los que solo sabe el servidor, quedan hasta "Siguiente" o "Reservar"
          if (e.lineas && lineasQueCuentan(nuevas).length > 0) setListaCorregidaEn(estado);
        }}
        errores={e}
        conFilaLista
      />
    </SeccionFormulario>
  );

  return (
    <form
      ref={formulario}
      action={accion}
      onSubmit={(ev) => enviar(ev, conPagos && !sinAdelanto)}
      onKeyDown={(ev) => {
        // Enter en un campo de los servicios sigue a la fecha, no reserva
        if (ev.key !== "Enter" || paso !== PASO_SERVICIOS || !(ev.target instanceof HTMLInputElement)) return;
        ev.preventDefault();
        siguiente();
      }}
      className="flex flex-col gap-6"
      noValidate
    >
      {directa && <PasosFlujo pasos={pasosNuevaReserva(conPagos)} actual={paso} etiqueta="Pasos de la reserva" />}
      {arriba}
      <AvisoAlSalir formulario={formulario} estado={estado} ademas={!!comprobante} />
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

      {/* Los servicios elegidos, arriba de la fecha, con "Cambiar" para volver a ellos */}
      {origen.tipo === "directa" && paso === PASO_FECHA && (
        <ResumenPaso id="resumen-servicios" titulo="Servicios" alCambiar={volverAServicios} claseContenido="gap-2">
          <ul className="flex flex-col gap-1">
            {lineas.map((l, i) => (
              <li key={i} className="flex justify-between gap-4">
                <span>{origen.opciones.find((o) => o.varianteId === l.varianteId)?.descripcion ?? `Servicio ${i + 1}`}</span>
                <span className="shrink-0 tabular-nums">{mostrarMonto(leerMonto(l.precio) ?? "0")} Bs</span>
              </li>
            ))}
          </ul>
        </ResumenPaso>
      )}
      {estado.mensaje && !estado.ok && <MensajeError id="reserva-error">{estado.mensaje}</MensajeError>}

      {origen.tipo === "directa" && (
        <div data-paso={PASO_SERVICIOS} hidden={paso !== PASO_SERVICIOS} className="flex flex-col gap-6">
          {cotizaciones}
          {cotizaciones ? (
            <MasDatos texto="Reserva sin cotización" abierto={armando || conErrorEnServicios} alAbrir={() => setArmando(true)}>
              {servicios}
            </MasDatos>
          ) : (
            servicios
          )}
        </div>
      )}

      <div data-paso={PASO_FECHA} hidden={paso !== PASO_FECHA} className="flex flex-col gap-6">
        <SeccionFormulario titulo="Fechas y espacio">
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
          <Campo id="espacioId" etiqueta="Espacio" error={e.espacioId} ayuda={ayuda}>
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
          {/* Se usan a veces: plegadas; se abren solas si traen algo escrito o un error */}
          <MasDatos texto="Agregar hora y nota" abierto={!!horaIngreso || !!nota || !!e.horaIngreso || !!e.nota}>
            <Campo id="horaIngreso" etiqueta="Hora aproximada" opcional error={e.horaIngreso} ayuda="Como lo dijo el cliente: «a las 9», «en la tarde».">
              <Input id="horaIngreso" name="horaIngreso" autoComplete="off" value={horaIngreso} onChange={(ev) => setHoraIngreso(ev.target.value)} className="max-w-xs" aria-invalid={!!e.horaIngreso} />
            </Campo>
            <Campo id="nota" etiqueta="Nota" opcional error={e.nota}>
              <Textarea id="nota" name="nota" rows={2} value={nota} onChange={(ev) => setNota(ev.target.value)} aria-invalid={!!e.nota} />
            </Campo>
          </MasDatos>
        </SeccionFormulario>

        {conPagos && (
          <SeccionFormulario titulo="Adelanto">
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
          </SeccionFormulario>
        )}
      </div>

      {(paso === PASO_FECHA || conSiguiente) && (
        <PieFormulario>
          <div className="flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-2 sm:justify-start">
            {/* El total de la reserva directa, a la vista mientras se cargan los precios */}
            {total !== null && total !== "0.00" && (
              <p className="flex items-baseline gap-2">
                <span className="text-tinta-suave">Total</span>
                <span className="text-lg font-bold tabular-nums">{mostrarMonto(total)} Bs</span>
              </p>
            )}
            <div className="flex gap-2">
              {directa && paso === PASO_FECHA && inicial === PASO_SERVICIOS && (
                <Button type="button" variant="outline" disabled={enviando} onClick={volverAServicios}>
                  Atrás
                </Button>
              )}
              {/* Una key distinta en cada uno: si React reusara el botón, "Siguiente" se volvía "Reservar" durante el
                  mismo toque y el navegador enviaba la reserva a medias (lo mismo que en Nueva cotización, pedido 40) */}
              {paso === PASO_SERVICIOS ? (
                <Button
                  key="siguiente"
                  type="button"
                  onClick={(ev) => {
                    ev.preventDefault();
                    siguiente();
                  }}
                >
                  {/* La reserva sin cotización la arma quien ve pagos: el último paso siempre lleva el adelanto */}
                  Siguiente: fecha y adelanto
                </Button>
              ) : (
                <Button key="reservar" type="submit" disabled={enviando || buscando || preparando}>
                  {preparando ? "Preparando foto…" : enviando ? "Reservando…" : "Reservar"}
                </Button>
              )}
            </div>
          </div>
        </PieFormulario>
      )}
    </form>
  );
}
