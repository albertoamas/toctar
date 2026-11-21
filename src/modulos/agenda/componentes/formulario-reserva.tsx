"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { cn } from "cn";
import Link from "next/link";
import type { Route } from "next";
import { usePasosEnHistorial } from "@/componentes/panel/pasos-en-historial";
import { useFocoDePaso } from "@/componentes/panel/foco-de-paso";
import { SeccionFormulario } from "@/componentes/panel/seccion-formulario";
import { MensajeError } from "@/componentes/panel/campo";
import { ArrowLeftIcon, PlusIcon, SearchIcon } from "lucide-react";
import { ParaQuien } from "@/componentes/panel/para-quien";
import type { EstadoCliente } from "@/modulos/clientes/acciones";
import type { CatalogoVehiculos } from "@/modulos/clientes/catalogo-vehiculos";
import { CamposCliente, CamposVehiculo } from "@/modulos/clientes/componentes/campos";
import { normalizarPlaca } from "@/modulos/clientes/reglas";
import { leerValores, PREFIJO_VEHICULO } from "@/modulos/clientes/valores";
import type { Tamano } from "@/modulos/configuracion/consultas";
import { PasosFlujo, type DestinoPaso } from "@/componentes/panel/pasos-flujo";
import { AvisoAlSalir } from "@/componentes/panel/cambios-sin-guardar";
import { PieFormulario } from "@/componentes/panel/pie-formulario";
import { Button, buttonVariants } from "@/componentes/ui/button";
import type { MetodoPago } from "@/db/esquema/trabajos";
import { leerMonto, mostrarMonto } from "@/modulos/catalogo/reglas";
import { calcularTotales } from "@/modulos/cotizaciones/reglas";
import type { OpcionServicio } from "@/modulos/cotizaciones/consultas/servicios";
import { LineasServicio, type Linea } from "@/modulos/cotizaciones/componentes/lineas-servicio";
import { useEnvioConComprobante } from "@/modulos/pagos/componentes/campo-comprobante";
import { agendarReserva } from "../acciones";
import {
  erroresClienteNuevo,
  erroresFecha,
  erroresServicios,
  erroresVehiculoNuevo,
  PASO_ADELANTO,
  PASO_CLIENTE,
  PASO_FECHA,
  PASO_SERVICIOS,
  PASO_VEHICULO,
  pasoDeCampoReserva,
  pasosNuevaReserva,
} from "../pasos-reserva";
import { fechaEntregaSugerida, textoDia } from "../reglas";
import { SeccionAdelanto, type DejoAdelanto } from "./seccion-adelanto";
import { SeccionFechasReserva } from "./seccion-fechas-reserva";
import { ConResumen, FilaResumen } from "@/componentes/panel/con-resumen";
import { CabeceraTarjeta } from "@/componentes/panel/cabecera-seccion";

// HU-30: agendar una reserva (RF-36, RF-37). Las fechas sugieren la entrega con la mayor duración de los servicios
// (decisión del 20/10: es aproximada y se edita); pedido 55: sin espacio ni límite por día. El
// servidor vuelve a mirar todo y la base rechaza un cruce aunque dos personas reserven a la vez.
// Pulido 10.2: la hora y la nota plegadas (se usan a veces), sin las ayudas que repetían Configuración, y "Reservar" en
// PieFormulario: fijo abajo en el celular, con el total al lado en la reserva directa (como en Cotizar).
// Pedido 41 (etapas/P41-reserva-en-pasos.md): la reserva sin cotización son dos pasos de un mismo formulario, Servicios
// y Fecha y adelanto, con el indicador de los cuatro pasos y lo ya elegido arriba. Como en Nueva cotización, el paso va
// en la dirección (#servicios, #fecha), así el botón Atrás del celular vuelve al anterior, y un error de la acción
// vuelve al paso que lo tiene. Desde una cotización empieza en la fecha.
// Recorrido visual del 20/11 (a pedido del dueño): el adelanto, en su propio paso después de la fecha (#adelanto), para
// quien ve pagos. La fecha llega vacía salvo desde un día libre de la Agenda, y el adelanto pregunta "¿Dejó adelanto?"
// sin respuesta elegida: "Reservar" va solo en el último paso. El indicador de pasos va aquí, en los dos caminos.
// Cliente o vehículo nuevos (20/11, como en Nueva cotización, pedido 40): sus campos son los primeros pasos de este mismo
// formulario (#cliente, #vehiculo) y se registran recién con "Reservar", junto con la reserva: nada queda a medias.

type Origen =
  | {
      tipo: "cotizacion";
      cotizacionId: number;
      duraciones: number[];
      /** Para la barra de abajo; null sin permiso de ver montos. */
      total: string | null;
      /** "2026-0101" o "2026-0101, versión 2": de dónde vienen los servicios, en el resumen. */
      numero: string;
      aceptada: boolean;
      /** Sus servicios, para el resumen; el precio es null sin permiso de ver montos. */
      lineas: { descripcion: string; precio: string | null }[];
    }
  | {
      tipo: "directa";
      /** null cuando se registra ahí mismo (`nuevo`). */
      clienteId: number | null;
      vehiculoId: number | null;
      opciones: OpcionServicio[];
      /** Cliente o vehículo nuevos, escritos en sus pasos (20/11). */
      nuevo?: Nuevo;
      recordatorioId?: number | null;
      /** Las líneas con que llega (un mantenimiento, con su servicio ya elegido: pedido 21). */
      lineasIniciales?: Linea[];
      /** El cliente o el vehículo si son nuevos; si no, servicios o, si ya llega con servicios con precio, la fecha (`pasoInicialReserva`). */
      pasoInicial: number;
    };

type Nuevo = {
  /** El cliente también es nuevo; si no, solo el vehículo, de un cliente registrado. */
  clienteNuevo: boolean;
  /** El cliente registrado al que se le agrega el vehículo. */
  nombreCliente?: string;
  tamanos: Tamano[];
  catalogo: CatalogoVehiculos;
  /** Los servicios para cada tamaño: los del vehículo nuevo, según el tamaño elegido. */
  opcionesPorTamano: Record<number, OpcionServicio[]>;
  /** "Buscar un cliente registrado" o, con un cliente registrado, "Atrás" a sus vehículos. */
  volverAElegir: Route;
  /** La reserva con un cliente ya registrado, con `cliente=0` en lugar de su id: el aviso de repetido ofrece usarlo. */
  conCliente: string;
};

/** El precio que sugiere el catálogo para esa variante, como se escribe en el campo; vacío si no hay. */
function sugerido(opciones: OpcionServicio[] | undefined, varianteId: number): string {
  const o = opciones?.find((x) => x.varianteId === varianteId);
  return o?.sugerencia.tipo === "monto" ? mostrarMonto(o.sugerencia.monto) : "";
}

type Props = {
  /** La pantalla de origen (pedido 43): va en el formulario y la reserva creada vuelve ahí. */
  volver?: string | null;
  origen: Origen;
  /** Quien ve pagos registra el adelanto (RN-04); los demás agendan "sin adelanto". */
  conPagos: boolean;
  adelantoSugerido: string;
  hoy: string;
  fechaInicial: string;
  /** Lo ya elegido (el cliente y su vehículo) y sus avisos: en la reserva directa, debajo del indicador de pasos. */
  arriba?: React.ReactNode;
  /** Las cotizaciones del vehículo para reservar, en el paso Servicios: con ellas, la reserva sin cotización va plegada. */
  cotizaciones?: React.ReactNode;
  /** Desde una cotización elegida en el paso Servicios: a dónde vuelve "Atrás" (ese paso). */
  atras?: Route;
  /** A dónde lleva tocar en el indicador los pasos que se eligen por la dirección: el cliente, el vehículo y, desde una cotización, los servicios. */
  pasosHechos?: (DestinoPaso | undefined)[];
};

/** "miércoles 30 de diciembre": el día en medio de una frase. */
const minuscula = (texto: string) => texto.charAt(0).toLowerCase() + texto.slice(1);

/** El paso en la dirección: el botón Atrás del celular vuelve al anterior sin salir de la pantalla. */
const ANCLA: Record<number, string> = { [PASO_CLIENTE]: "cliente", [PASO_VEHICULO]: "vehiculo", [PASO_SERVICIOS]: "servicios", [PASO_FECHA]: "fecha", [PASO_ADELANTO]: "adelanto" };

/** El paso de un ancla de la dirección, o null si no es de un paso. */
const pasoDeAncla = (ancla: string) => {
  const p = Object.entries(ANCLA).find(([, a]) => a === ancla)?.[0];
  return p === undefined ? null : Number(p);
};

/** Para los pasos del cliente y el vehículo nuevos: el foco va al primer campo, no a "Buscar un cliente registrado". */
const PRIMER_CAMPO_NUEVO = 'input:not([type="hidden"]), select, textarea, button[role="radio"]';

export function FormularioReserva({ volver, origen, conPagos, adelantoSugerido, hoy, fechaInicial, arriba, cotizaciones, atras, pasosHechos }: Props) {
  const directa = origen.tipo === "directa";
  const nuevo = origen.tipo === "directa" ? origen.nuevo : undefined;
  const inicial = origen.tipo === "directa" ? origen.pasoInicial : PASO_FECHA;
  // Con el adelanto (quien ve pagos), el último paso es el suyo; si no, la fecha
  const ultimo = conPagos ? PASO_ADELANTO : PASO_FECHA;
  // Hay pasos que cambiar (y historial que escuchar) en la directa o si se sigue al adelanto
  const conPasos = directa || conPagos;
  const [paso, setPaso] = useState<number>(inicial);
  // El paso a la vista, para los que escuchan el historial (sin esperar al próximo dibujo)
  const pasoActual = useRef<number>(inicial);
  // Los errores de "Siguiente" y la revisión de los servicios, atados al resultado de la acción con que se hicieron: con
  // un envío nuevo dejan de valer solos (sin reiniciarlos tras el await, que se dibujaba antes que el resultado)
  const [locales, setLocales] = useState<{ en: EstadoCliente | null; errores: Record<string, string> }>({ en: null, errores: {} });
  // Los pasos ya revisados con "Siguiente" desde el último envío: sus errores de la acción ya no valen
  const [revisados, setRevisados] = useState<{ en: EstadoCliente | null; pasos: Set<number> }>({ en: null, pasos: new Set() });
  // El cliente y el vehículo nuevos, para la línea "Para …" de los pasos siguientes: se leen del formulario al cambiar de paso
  const [resumen, setResumen] = useState<{ nombre: string; placa: string }>({ nombre: "", placa: "" });
  const errorAlLlegar = useRef(false);
  const formulario = useRef<HTMLFormElement>(null);

  // Lo que devuelve la acción: los errores de nuevo y, si son de los servicios, la pantalla vuelve a ellos (como
  // conAviso: al terminar la acción, no en un efecto). Lo que hace al terminar está más abajo (`alTerminar`): usa el
  // foco, que necesita el resultado de la acción
  const alTerminar = useRef<(r: EstadoCliente) => void>(() => {});
  const [estado, accion, enviando] = useActionState<EstadoCliente, FormData>(async (previo, datos) => {
    const r = await agendarReserva(previo, datos);
    alTerminar.current(r);
    return r;
  }, {});
  const foco = useFocoDePaso(formulario, paso, estado, paso < PASO_SERVICIOS ? PRIMER_CAMPO_NUEVO : undefined);

  /** Muestra un paso: lo que hace cada cambio de paso, venga de un botón o del historial. */
  function mostrar(destino: number) {
    pasoActual.current = destino;
    setPaso(destino);
    if (nuevo && formulario.current) {
      const valores = leerValores(new FormData(formulario.current));
      const placa = valores[`${PREFIJO_VEHICULO}placa`] ?? "";
      // Como los guarda el servidor
      setResumen({ nombre: (valores.nombre ?? "").trim(), placa: normalizarPlaca(placa) ?? placa.trim().toUpperCase() });
    }
    window.scrollTo({ top: 0 });
    foco.pedir(errorAlLlegar.current);
    errorAlLlegar.current = false;
  }

  /**
   * Volver a un paso anterior. Cada paso desde el primero es una entrada del historial, así que se retrocede (el botón
   * Atrás del celular hace lo mismo). Los servicios de un mantenimiento que empezó en la fecha son una entrada nueva.
   */
  function volverA(destino: number) {
    if (destino >= inicial) {
      const pasos = pasoActual.current - destino;
      if (pasos > 0) window.history.go(-pasos);
      return;
    }
    window.history.pushState(window.history.state, "", `#${ANCLA[destino]}`);
    mostrar(destino);
  }
  const volverAServicios = () => volverA(PASO_SERVICIOS);
  const volverAFecha = () => volverA(PASO_FECHA);

  useEffect(() => {
    alTerminar.current = (r) => {
      const errores = Object.keys(r.errores ?? {}).filter((c) => r.errores?.[c]);
      if (errores.length === 0) return;
      foco.esperar(r);
      // Al paso que tiene el error, el más temprano: el cliente, el vehículo, los servicios o la fecha
      const destino = Math.min(...errores.map(pasoDeCampoReserva));
      if (destino < pasoActual.current && (destino >= inicial || (directa && destino === PASO_SERVICIOS))) {
        errorAlLlegar.current = true;
        volverA(destino);
      } else foco.pedir(true);
    };
  });

  // Todo controlado: React reinicia el formulario al terminar la acción y así nada se pierde tras un error. Sin servicios
  // con que llegar, la primera fila ya está para elegir (pulido final del 09/11): siempre se agrega al menos uno
  const [lineas, setLineas] = useState<Linea[]>(
    origen.tipo === "directa" ? (origen.lineasIniciales?.length ? origen.lineasIniciales : [{ varianteId: 0, precio: "" }]) : [],
  );
  // Los servicios que se ofrecen: los del tamaño del vehículo; el nuevo, según el tamaño que se elija en su paso
  const [tamanoNuevo, setTamanoNuevo] = useState("");
  const opciones = origen.tipo === "cotizacion" ? [] : nuevo ? (nuevo.opcionesPorTamano[Number(tamanoNuevo)] ?? []) : origen.opciones;
  /** Otro tamaño, otro precio sugerido: cambia el de las líneas que todavía tienen el sugerido del tamaño anterior. */
  function cambiarTamano(t: string) {
    const antes = nuevo?.opcionesPorTamano[Number(tamanoNuevo)];
    const despues = nuevo?.opcionesPorTamano[Number(t)];
    setLineas((ls) => ls.map((l) => (l.varianteId > 0 && l.precio === sugerido(antes, l.varianteId) ? { ...l, precio: sugerido(despues, l.varianteId) } : l)));
    setTamanoNuevo(t);
  }
  const duraciones = origen.tipo === "cotizacion" ? origen.duraciones : lineas.map((l) => opciones.find((o) => o.varianteId === l.varianteId)?.duracion ?? 1);
  const [fechaInicio, setFechaInicio] = useState(fechaInicial);
  // La entrega sigue a la sugerida mientras no se toque a mano. Con el ingreso borrado (el campo de fecha queda
  // vacío mientras se escribe) no hay sugerencia: sumar días a "" fallaría
  const [fechaFinManual, setFechaFinManual] = useState<string | null>(null);
  const fechaFin = fechaFinManual ?? (fechaInicio ? fechaEntregaSugerida(fechaInicio, duraciones) : "");
  // El elegido vale mientras siga libre en las fechas de ahora
  const [nota, setNota] = useState("");
  // "¿Dejó adelanto?" sin respuesta elegida (20/11): un pago no se registra por un toque apurado
  const [dejo, setDejo] = useState<DejoAdelanto | "">("");
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
  const nombreLinea = (l: Linea, i: number) => opciones.find((o) => o.varianteId === l.varianteId)?.descripcion ?? `Servicio ${i + 1}`;
  const conTotal = total !== null && total !== "0.00";
  const montoAdelanto = conPagos && dejo === "si" ? leerMonto(adelanto) : null;
  const centavos = (monto: string) => Math.round(Number(monto) * 100);
  const faltaAlEntregar = conTotal && montoAdelanto ? ((centavos(total) - centavos(montoAdelanto)) / 100).toFixed(2) : null;
  // Lo elegido en la fecha, en una línea: en el resumen del último paso (20/11, en lugar de la tarjeta "Fecha")
  const textoFecha =
    fechaInicio && fechaFin ? `${fechaInicio === fechaFin ? `El ${minuscula(textoDia(fechaInicio))}` : `Del ${minuscula(textoDia(fechaInicio))} al ${minuscula(textoDia(fechaFin))}`}` : null;
  const resumenFecha = (
      <section aria-labelledby="resumen-reserva-titulo" className="tt-tarjeta-panel flex flex-col">
        <CabeceraTarjeta id="resumen-reserva" titulo="Resumen" />
        <dl className="flex flex-col gap-2 p-4 sm:p-5">
          {origen.tipo === "cotizacion" && (
            <>
              <p className="text-sm text-tinta-suave">De la cotización {origen.numero}</p>
              {origen.lineas.map((l, i) => (
                <FilaResumen key={i} etiqueta={l.descripcion} valor={l.precio ? `${mostrarMonto(l.precio)} Bs` : ""} />
              ))}
            </>
          )}
          {origen.tipo === "directa" &&
            lineas.map((l, i) => <FilaResumen key={i} etiqueta={nombreLinea(l, i)} valor={conTotal ? `${mostrarMonto(leerMonto(l.precio) ?? "0")} Bs` : ""} />)}
          {conTotal && <FilaResumen etiqueta="Total" valor={`${mostrarMonto(total)} Bs`} fuerte separada={origen.tipo === "directa"} />}
          {montoAdelanto && <FilaResumen etiqueta="Adelanto" valor={`${mostrarMonto(montoAdelanto)} Bs`} suave />}
          {faltaAlEntregar && Number(faltaAlEntregar) > 0 && <FilaResumen etiqueta="Falta al entregar" valor={`${mostrarMonto(faltaAlEntregar)} Bs`} suave />}
          {paso > PASO_FECHA && textoFecha && (
            // En su renglón: puede ser larga ("Del miércoles 30 de diciembre al jueves 31 de diciembre")
            <div className="flex flex-col gap-0.5 border-t border-border pt-2 text-sm">
              <dt className="text-tinta-suave">Fecha</dt>
              <dd>{textoFecha}</dd>
            </div>
          )}
          {origen.tipo === "cotizacion" && !origen.aceptada && <p className="text-sm text-tinta-suave">Al reservar, la cotización queda aceptada.</p>}
        </dl>
      </section>
    );

  // El historial: Atrás y Adelante del navegador (o del celular) cambian de paso (solo la directa tiene pasos). Adelante
  // a la fecha revisa los servicios
  /** Los errores de un paso, con lo que tiene el formulario ahora: lo que se revisa al dejarlo con "Siguiente". */
  function erroresDelPaso(p: number): Record<string, string> {
    if (!formulario.current) return {};
    const valores = leerValores(new FormData(formulario.current));
    if (p === PASO_CLIENTE) return erroresClienteNuevo(valores);
    if (p === PASO_VEHICULO) return erroresVehiculoNuevo(valores);
    if (p === PASO_SERVICIOS) return erroresServicios(valores.lineas ?? "[]");
    if (p === PASO_FECHA) return erroresFecha({ fechaInicio, fechaFin });
    return {};
  }

  // El historial: Atrás y Adelante del navegador (o del celular) cambian de paso. Adelante revisa los pasos que salta
  usePasosEnHistorial(() => {
    const destino = pasoDeAncla(window.location.hash.slice(1)) ?? inicial;
    for (let p = pasoActual.current; p < destino; p++) {
      const errores = erroresDelPaso(p);
      if (Object.keys(errores).length === 0) continue;
      setLocales({ en: estado, errores });
      errorAlLlegar.current = true;
      window.history.back();
      return;
    }
    mostrar(destino);
  }, conPasos);

  function siguiente() {
    const errores = erroresDelPaso(paso);
    setLocales({ en: estado, errores });
    if (Object.keys(errores).length > 0) {
      foco.pedir(true);
      return;
    }
    setRevisados((r) => ({ en: estado, pasos: new Set(r.en === estado ? r.pasos : []).add(paso) }));
    window.history.pushState(window.history.state, "", `#${ANCLA[paso + 1]}`);
    mostrar(paso + 1);
  }

  // Los errores que se ven: los de la acción (salvo los de pasos ya revisados de nuevo) y los de "Siguiente". Lo mismo
  // con los datos repetidos: corregido el WhatsApp o la placa, ya no se ofrece "Usar a …"
  const yaRevisados = revisados.en === estado ? revisados.pasos : new Set<number>();
  const vigente = ([campo]: [string, unknown]) => !yaRevisados.has(pasoDeCampoReserva(campo));
  const e: Partial<Record<string, string>> = {
    ...Object.fromEntries(Object.entries(estado.errores ?? {}).filter(vigente)),
    ...(locales.en === estado ? locales.errores : {}),
  };
  const vista: EstadoCliente = { ...estado, errores: e as Record<string, string>, existentes: Object.fromEntries(Object.entries(estado.existentes ?? {}).filter(vigente)) };
  // El aviso de repetido lleva a reservarle a ese cliente, no a su ficha
  const usarExistente = (x: { id: number; nombre: string }) => ({ href: (nuevo?.conCliente ?? "").replace("cliente=0", `cliente=${x.id}`) as Route, texto: `Usar a ${x.nombre}` });
  const nombreCliente = nuevo ? (nuevo.clienteNuevo ? (paso > PASO_CLIENTE ? resumen.nombre : "") : (nuevo.nombreCliente ?? "")) : "";
  const conErrorEnServicios = Object.keys(e).some((c) => pasoDeCampoReserva(c) === PASO_SERVICIOS && e[c]);
  // Con cotizaciones del vehículo, lo común es usar una: "Siguiente" aparece al empezar una sin cotización, y queda
  // aunque se quite el último servicio (así dice qué falta)
  // (la fila vacía con que empieza no cuenta: se empieza al abrir "Reserva sin cotización" o al elegir un servicio)
  const [armando, setArmando] = useState(origen.tipo === "directa" && (origen.lineasIniciales?.length ?? 0) > 0);
  const conSiguiente = !cotizaciones || armando || conErrorEnServicios;

  const servicios = origen.tipo === "directa" && (
    <SeccionFormulario titulo="Servicios" claseContenido="gap-4">
      <LineasServicio
        opciones={opciones}
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
      onSubmit={(ev) => {
        // Reservar solo desde el último paso (un Enter en la fecha sigue al adelanto)
        if (paso !== ultimo) {
          ev.preventDefault();
          return;
        }
        enviar(ev, conPagos && dejo === "si");
      }}
      onKeyDown={(ev) => {
        // Enter en un campo de los servicios o de la fecha (sin ser el último paso) sigue al paso siguiente, no reserva
        if (ev.key !== "Enter" || paso === ultimo || !(ev.target instanceof HTMLInputElement)) return;
        ev.preventDefault();
        siguiente();
      }}
      className="flex flex-col gap-6"
      noValidate
    >
      {/* Los pasos hechos se tocan para volver (20/11): el cliente y el vehículo por la dirección; los servicios y la fecha,
          en esta misma pantalla */}
      <PasosFlujo
        pasos={pasosNuevaReserva(conPagos)}
        actual={paso}
        etiqueta="Pasos de la reserva"
        // Los pasos de este formulario se tocan para volver; los de antes (el cliente y el vehículo elegidos), por la dirección
        destinos={pasosNuevaReserva(conPagos).map((_, i) => (i >= inicial || (directa && i === PASO_SERVICIOS) ? { alTocar: () => volverA(i) } : pasosHechos?.[i]))}
      />
      {arriba}
      {/* Para quién es, con lo escrito en los pasos del cliente y el vehículo nuevos */}
      {nombreCliente && (
        <ParaQuien
          etiqueta="Reserva para"
          nombre={nombreCliente}
          placa={paso > PASO_VEHICULO ? resumen.placa : null}
          tamano={paso > PASO_VEHICULO ? nuevo?.tamanos.find((t) => String(t.id) === tamanoNuevo)?.nombre : null}
        />
      )}
      <AvisoAlSalir formulario={formulario} estado={estado} ademas={!!comprobante} />
      <input type="hidden" name="origen" value={origen.tipo} />
      {volver && <input type="hidden" name="volver" value={volver} />}
      {origen.tipo === "cotizacion" ? (
        <input type="hidden" name="cotizacionId" value={origen.cotizacionId} />
      ) : (
        <>
          {origen.clienteId && <input type="hidden" name="clienteId" value={origen.clienteId} />}
          {origen.vehiculoId && <input type="hidden" name="vehiculoId" value={origen.vehiculoId} />}
          {nuevo && <input type="hidden" name={nuevo.clienteNuevo ? "clienteNuevo" : "vehiculoNuevo"} value="1" />}
          {origen.recordatorioId && <input type="hidden" name="recordatorioId" value={origen.recordatorioId} />}
        </>
      )}

      {estado.mensaje && !estado.ok && <MensajeError id="reserva-error">{estado.mensaje}</MensajeError>}

      {nuevo?.clienteNuevo && (
        <div data-paso={PASO_CLIENTE} hidden={paso !== PASO_CLIENTE}>
          {/* Como en Nueva cotización: el título adentro, con "Buscar un cliente registrado" al lado */}
          <SeccionFormulario
            titulo="Cliente nuevo"
            accion={
              <Link href={nuevo.volverAElegir} className={buttonVariants({ variant: "accion" })}>
                <SearchIcon />
                Buscar un cliente registrado
              </Link>
            }
            claseContenido="gap-6"
          >
            <CamposCliente estado={vista} plegar enlaceExistente={usarExistente} />
          </SeccionFormulario>
        </div>
      )}
      {nuevo && (
        <div data-paso={PASO_VEHICULO} hidden={paso !== PASO_VEHICULO}>
          <SeccionFormulario titulo={nuevo.clienteNuevo ? "Vehículo" : "Otro vehículo"} claseContenido="gap-4">
            {/* Completo, como en Nueva cotización: placa y tamaño, y marca, modelo, año y color a la vista */}
            <CamposVehiculo estado={vista} prefijo={PREFIJO_VEHICULO} tamanos={nuevo.tamanos} catalogo={nuevo.catalogo} enlaceExistente={usarExistente} alCambiarTamano={cambiarTamano} />
          </SeccionFormulario>
        </div>
      )}

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
                    setRevisados((r) => ({ en: estado, pasos: new Set(r.en === estado ? r.pasos : []).add(PASO_SERVICIOS) }));
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
        <ConResumen etiqueta="Resumen de la reserva" resumen={paso === PASO_FECHA ? resumenFecha : null} tambienAngosto={ultimo === PASO_FECHA}>
          <SeccionFechasReserva
            hoy={hoy}
            fechaInicio={fechaInicio}
            fechaFin={fechaFin}
            alCambiarIngreso={(valor) => cambiarFechas(valor, fechaFinManual)}
            alCambiarEntrega={(valor) => cambiarFechas(fechaInicio, valor)}
            nota={nota}
            alCambiarNota={setNota}
            errores={e}
          />

        </ConResumen>
      </div>

      {conPagos && (
        <div data-paso={PASO_ADELANTO} hidden={paso !== PASO_ADELANTO} className="flex flex-col gap-6">
          <ConResumen etiqueta="Resumen de la reserva" resumen={paso === PASO_ADELANTO ? resumenFecha : null} tambienAngosto>
            <SeccionAdelanto
              dejo={dejo}
              alCambiarDejo={setDejo}
              adelanto={adelanto}
              alCambiarAdelanto={setAdelanto}
              metodo={metodo}
              alCambiarMetodo={setMetodo}
              alCambiarComprobante={setComprobante}
              errores={e}
              errorFoto={errorFoto}
            />
          </ConResumen>
        </div>
      )}

      {(paso !== PASO_SERVICIOS || conSiguiente) && (
        <PieFormulario>
          <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-2">
            {/* El total de la reserva directa, a la vista mientras se cargan los precios */}
            {/* Desde los servicios, siempre (también en 0 Bs): que aparezca al elegir el primero corría los botones (20/11).
                Después de ellos, a la derecha; en el celular, sin la palabra "Total" para que entre en el renglón (el pie
                en dos renglones tapaba el formulario) */}
            {total !== null && paso >= PASO_SERVICIOS && (
              // En la fecha, con el resumen al costado (computadora), el total ya está ahí
              <p className={cn("order-last ml-auto flex items-baseline gap-2", paso >= PASO_FECHA && "@4xl:hidden")}>
                <span className="text-tinta-suave max-sm:sr-only">Total</span>
                <span className="text-lg font-bold tabular-nums">{mostrarMonto(total)} Bs</span>
              </p>
            )}
            <div className="flex gap-2">
              {/* Atrás cuando se llegó a la fecha desde los servicios (hallazgo 10): en la directa y en el mantenimiento que
                  empezó en ellos, vuelve atrás en el historial; desde una cotización elegida en Servicios, a ese paso
                  (atras). Un mantenimiento que ya empieza en la fecha no lo lleva: su Atrás agregaba pasos falsos al
                  historial del celular; vuelve con "Cambiar" en Servicios */}
              {paso === PASO_ADELANTO && (
                <Button type="button" variant="outline" disabled={enviando} onClick={volverAFecha}>
                  Atrás
                </Button>
              )}
              {/* El vehículo nuevo: al cliente nuevo o, con un cliente registrado, a elegir otro de sus vehículos */}
              {paso === PASO_VEHICULO && nuevo?.clienteNuevo && (
                <Button type="button" variant="outline" disabled={enviando} onClick={() => volverA(PASO_CLIENTE)}>
                  Atrás
                </Button>
              )}
              {paso === PASO_VEHICULO && nuevo && !nuevo.clienteNuevo && (
                <Link href={nuevo.volverAElegir} className={buttonVariants({ variant: "outline" })}>
                  Atrás
                </Link>
              )}
              {paso === PASO_SERVICIOS && nuevo && (
                <Button type="button" variant="outline" disabled={enviando} onClick={() => volverA(PASO_VEHICULO)}>
                  Atrás
                </Button>
              )}
              {/* En los servicios, al vehículo (20/11): "Atrás" en todos los pasos, para que volver no sea adivinar */}
              {paso === PASO_SERVICIOS && !nuevo && pasosHechos?.[1] && "href" in pasosHechos[1] && (
                <Link href={pasosHechos[1].href} className={buttonVariants({ variant: "outline" })}>
                  Atrás
                </Link>
              )}
              {directa && paso === PASO_FECHA && inicial <= PASO_SERVICIOS && (
                <Button type="button" variant="outline" disabled={enviando} onClick={volverAServicios}>
                  Atrás
                </Button>
              )}
              {!directa && atras && paso === PASO_FECHA && (
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
              {paso < PASO_SERVICIOS ? (
                <Button
                  key={`siguiente-${paso}`}
                  type="button"
                  onClick={(ev) => {
                    ev.preventDefault();
                    siguiente();
                  }}
                >
                  {paso === PASO_CLIENTE ? "Siguiente: vehículo" : "Siguiente: servicios"}
                </Button>
              ) : paso === PASO_SERVICIOS ? (
                <Button
                  key="siguiente"
                  type="button"
                  onClick={(ev) => {
                    ev.preventDefault();
                    siguiente();
                  }}
                >
                  Siguiente: fecha
                </Button>
              ) : paso !== ultimo ? (
                <Button
                  key="siguiente-adelanto"
                  type="button"
                  onClick={(ev) => {
                    ev.preventDefault();
                    siguiente();
                  }}
                >
                  Siguiente: adelanto
                </Button>
              ) : (
                <Button key="reservar" type="submit" disabled={enviando || preparando}>
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
