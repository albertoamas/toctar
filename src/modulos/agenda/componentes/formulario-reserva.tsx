"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { cn } from "cn";
import Link from "next/link";
import type { Route } from "next";
import { usePasosEnHistorial } from "@/componentes/panel/pasos-en-historial";
import { useFocoDePaso } from "@/componentes/panel/foco-de-paso";
import { SeccionFormulario } from "@/componentes/panel/seccion-formulario";
import { MensajeError } from "@/componentes/panel/campo";
import { ArrowLeftIcon, PlusIcon } from "lucide-react";
import { PasosFlujo } from "@/componentes/panel/pasos-flujo";
import { AvisoAlSalir } from "@/componentes/panel/cambios-sin-guardar";
import { PieFormulario } from "@/componentes/panel/pie-formulario";
import { ResumenPaso } from "@/componentes/panel/resumen-paso";
import { Button, buttonVariants } from "@/componentes/ui/button";
import type { MetodoPago } from "@/db/esquema/trabajos";
import type { EstadoFormulario } from "@/lib/formularios";
import { leerMonto, mostrarMonto } from "@/modulos/catalogo/reglas";
import { calcularTotales } from "@/modulos/cotizaciones/reglas";
import type { OpcionServicio } from "@/modulos/cotizaciones/consultas/servicios";
import { LineasServicio, type Linea } from "@/modulos/cotizaciones/componentes/lineas-servicio";
import { useEnvioConComprobante } from "@/modulos/pagos/componentes/campo-comprobante";
import { agendarReserva } from "../acciones";
import type { EspacioDisponible } from "../consultas/espacios";
import { erroresServicios, PASO_FECHA, PASO_SERVICIOS, pasoDeCampoReserva, pasosNuevaReserva } from "../pasos-reserva";
import { fechaEntregaSugerida } from "../reglas";
import { espacioVigente, useEspaciosLibres } from "./espacios-libres";
import { SeccionAdelanto } from "./seccion-adelanto";
import { SeccionFechasReserva } from "./seccion-fechas-reserva";
import { ConResumen, FilaResumen } from "@/componentes/panel/con-resumen";
import { CabeceraTarjeta } from "@/componentes/panel/cabecera-seccion";

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
  | { tipo: "cotizacion"; cotizacionId: number; duraciones: number[]; /** Para la barra de abajo; null sin permiso de ver montos. */ total: string | null }
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
  /** La pantalla de origen (pedido 43): va en el formulario y la reserva creada vuelve ahí. */
  volver?: string | null;
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
  /** Desde una cotización elegida en el paso Servicios: a dónde vuelve "Atrás" (ese paso). */
  atras?: Route;
};

/** El paso en la dirección: el botón Atrás del celular vuelve al anterior sin salir de la pantalla. */
const ANCLA: Record<number, string> = { [PASO_SERVICIOS]: "servicios", [PASO_FECHA]: "fecha" };

export function FormularioReserva({ volver, origen, conPagos, adelantoSugerido, hoy, fechaInicial, espacioInicial, espaciosIniciales, arriba, cotizaciones, atras }: Props) {
  const directa = origen.tipo === "directa";
  const inicial = origen.tipo === "directa" ? origen.pasoInicial : PASO_FECHA;
  const [paso, setPaso] = useState<number>(inicial);
  // El paso a la vista, para los que escuchan el historial (sin esperar al próximo dibujo)
  const pasoActual = useRef<number>(inicial);
  // Los errores de "Siguiente" y la revisión de los servicios, atados al resultado de la acción con que se hicieron: con
  // un envío nuevo dejan de valer solos (sin reiniciarlos tras el await, que se dibujaba antes que el resultado)
  const [locales, setLocales] = useState<{ en: EstadoFormulario | null; errores: Record<string, string> }>({ en: null, errores: {} });
  const [revisadosEn, setRevisadosEn] = useState<EstadoFormulario | null>(null);
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
  const [nota, setNota] = useState("");
  const [sinAdelanto, setSinAdelanto] = useState(false);
  const [adelanto, setAdelanto] = useState(mostrarMonto(adelantoSugerido));
  const [metodo, setMetodo] = useState<MetodoPago | "">("");
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
      : origen.total;

  // El resumen del costado en el paso de la fecha, en la computadora (ConResumen, C7 §5.2): los servicios elegidos (en la
  // directa), el total, el adelanto y lo que falta al entregar. Los montos, solo para quien los ve (el total es null si
  // no). Sin nada que mostrar, no hay columna
  const nombreLinea = (l: Linea, i: number) => (origen.tipo === "directa" ? (origen.opciones.find((o) => o.varianteId === l.varianteId)?.descripcion ?? `Servicio ${i + 1}`) : "");
  const conTotal = total !== null && total !== "0.00";
  const montoAdelanto = conPagos && !sinAdelanto ? leerMonto(adelanto) : null;
  const centavos = (monto: string) => Math.round(Number(monto) * 100);
  const faltaAlEntregar = conTotal && montoAdelanto ? ((centavos(total) - centavos(montoAdelanto)) / 100).toFixed(2) : null;
  const resumenFecha =
    origen.tipo === "directa" || conTotal ? (
      <section aria-labelledby="resumen-reserva-titulo" className="tt-tarjeta-panel flex flex-col">
        <CabeceraTarjeta id="resumen-reserva" titulo="Resumen" />
        <dl className="flex flex-col gap-2 p-4 sm:p-5">
          {origen.tipo === "directa" &&
            lineas.map((l, i) => <FilaResumen key={i} etiqueta={nombreLinea(l, i)} valor={conTotal ? `${mostrarMonto(leerMonto(l.precio) ?? "0")} Bs` : ""} />)}
          {conTotal && <FilaResumen etiqueta="Total" valor={`${mostrarMonto(total)} Bs`} fuerte separada={origen.tipo === "directa"} />}
          {montoAdelanto && <FilaResumen etiqueta="Adelanto" valor={`${mostrarMonto(montoAdelanto)} Bs`} suave />}
          {faltaAlEntregar && Number(faltaAlEntregar) > 0 && <FilaResumen etiqueta="Falta al entregar" valor={`${mostrarMonto(faltaAlEntregar)} Bs`} suave />}
        </dl>
      </section>
    ) : null;

  // El historial: Atrás y Adelante del navegador (o del celular) cambian de paso (solo la directa tiene pasos). Adelante
  // a la fecha revisa los servicios
  usePasosEnHistorial(() => {
    const ancla = window.location.hash.slice(1);
    const destino = ancla === ANCLA[PASO_FECHA] ? PASO_FECHA : ancla === ANCLA[PASO_SERVICIOS] ? PASO_SERVICIOS : inicial;
    if (ancla === ANCLA[PASO_FECHA] && pasoActual.current === PASO_SERVICIOS && formulario.current) {
      const errores = erroresServicios(String(new FormData(formulario.current).get("lineas") ?? "[]"));
      if (Object.keys(errores).length > 0) {
        setLocales({ en: estado, errores });
        errorAlLlegar.current = true;
        window.history.back();
        return;
      }
    }
    mostrar(destino);
  }, directa);

  function siguiente() {
    const errores = erroresServicios(String(new FormData(formulario.current!).get("lineas") ?? "[]"));
    setLocales({ en: estado, errores });
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
      {volver && <input type="hidden" name="volver" value={volver} />}
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
        <div className="flex flex-col @4xl:hidden">
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
        </div>
      )}
      {estado.mensaje && !estado.ok && <MensajeError id="reserva-error">{estado.mensaje}</MensajeError>}

      {origen.tipo === "directa" && (
        <div data-paso={PASO_SERVICIOS} hidden={paso !== PASO_SERVICIOS} className="flex flex-col gap-6">
          {/* Con cotizaciones del vehículo: o se usa una, o se arma sin cotización. Al elegir "Reserva sin cotización", la
              lista de cotizaciones se va (20/11, a pedido del dueño: seguía arriba y confundía) y queda solo el formulario,
              con "Usar una de sus cotizaciones" para volver */}
          {!cotizaciones ? (
            servicios
          ) : armando || conErrorEnServicios ? (
            <>
              <div>
                <Button
                  type="button"
                  variant="accion"
                  onClick={() => {
                    // Vuelve a la fila lista, sin tocar (no cuenta como servicio), y a la lista de cotizaciones
                    setLineas([{ varianteId: 0, precio: "" }]);
                    setArmando(false);
                    // Sus errores, ya sin nada que corregir: los de "Siguiente" y los de la acción
                    setLocales({ en: null, errores: {} });
                    setRevisadosEn(estado);
                  }}
                >
                  <ArrowLeftIcon />
                  Usar una de sus cotizaciones
                </Button>
              </div>
              {servicios}
            </>
          ) : (
            <>
              {cotizaciones}
              <div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setArmando(true);
                    // El foco, al primer servicio: es lo que sigue
                    requestAnimationFrame(() => formulario.current?.querySelector<HTMLSelectElement>(`[data-paso="${PASO_SERVICIOS}"] select`)?.focus());
                  }}
                >
                  <PlusIcon />
                  Reserva sin cotización
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      <div data-paso={PASO_FECHA} hidden={paso !== PASO_FECHA} className="flex flex-col gap-6">
        <ConResumen etiqueta="Resumen de la reserva" resumen={resumenFecha}>
          <SeccionFechasReserva
            hoy={hoy}
            fechaInicio={fechaInicio}
            fechaFin={fechaFin}
            alCambiarIngreso={(valor) => cambiarFechas(valor, fechaFinManual)}
            alCambiarEntrega={(valor) => cambiarFechas(fechaInicio, valor)}
            espacio={{ valor: espacioId, alCambiar: setEspacioId, libres, buscando, ayuda }}
            nota={nota}
            alCambiarNota={setNota}
            errores={e}
          />

          {conPagos && (
            <SeccionAdelanto
              sinAdelanto={sinAdelanto}
              alCambiarSinAdelanto={setSinAdelanto}
              adelanto={adelanto}
              alCambiarAdelanto={setAdelanto}
              metodo={metodo}
              alCambiarMetodo={setMetodo}
              alCambiarComprobante={setComprobante}
              errores={e}
              errorFoto={errorFoto}
            />
          )}
        </ConResumen>
      </div>

      {(paso === PASO_FECHA || conSiguiente) && (
        <PieFormulario>
          <div className="flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-2 sm:justify-start">
            {/* El total de la reserva directa, a la vista mientras se cargan los precios */}
            {total !== null && total !== "0.00" && (
              // En la fecha, con el resumen al costado (computadora), el total ya está ahí
              <p className={`flex items-baseline gap-2 ${paso === PASO_FECHA && resumenFecha ? "@4xl:hidden" : ""}`}>
                <span className="text-tinta-suave">Total</span>
                <span className="text-lg font-bold tabular-nums">{mostrarMonto(total)} Bs</span>
              </p>
            )}
            <div className="flex gap-2">
              {/* Atrás cuando se llegó a la fecha desde los servicios (hallazgo 10): en la directa y en el mantenimiento que
                  empezó en ellos, vuelve atrás en el historial; desde una cotización elegida en Servicios, a ese paso
                  (atras). Un mantenimiento que ya empieza en la fecha no lo lleva: su Atrás agregaba pasos falsos al
                  historial del celular; vuelve con "Cambiar" en Servicios */}
              {directa && paso === PASO_FECHA && inicial === PASO_SERVICIOS && (
                <Button type="button" variant="outline" disabled={enviando} onClick={volverAServicios}>
                  Atrás
                </Button>
              )}
              {!directa && atras && (
                // Mientras se reserva no se sale: la reserva se crearía sin que la persona lo vea
                <Link
                  href={atras}
                  aria-disabled={enviando || undefined}
                  className={cn(buttonVariants({ variant: "outline" }), enviando && "pointer-events-none opacity-50")}
                >
                  Atrás
                </Link>
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
