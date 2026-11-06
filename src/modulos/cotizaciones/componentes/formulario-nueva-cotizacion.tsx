"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeftRightIcon, SearchIcon } from "lucide-react";
import { MensajeError } from "@/componentes/panel/campo";
import { PasosFlujo } from "@/componentes/panel/pasos-flujo";
import { PieFormulario } from "@/componentes/panel/pie-formulario";
import { CabeceraSeccion } from "@/componentes/panel/seccion-con-editar";
import { SeccionFormulario } from "@/componentes/panel/seccion-formulario";
import { Button, buttonVariants } from "@/componentes/ui/button";
import { RadioGroup, RadioGroupItem } from "@/componentes/ui/radio-group";
import { mostrarMonto } from "@/modulos/catalogo/reglas";
import type { EstadoCliente } from "@/modulos/clientes/acciones";
import { CamposCliente, CamposVehiculo } from "@/modulos/clientes/componentes/campos";
import { DatosVehiculo } from "@/modulos/clientes/componentes/datos-vehiculo";
import { detalleVehiculo, normalizarPlaca } from "@/modulos/clientes/reglas";
import { leerValores, PREFIJO_VEHICULO } from "@/modulos/clientes/valores";
import type { Tamano } from "@/modulos/configuracion/consultas";
import { formatearWhatsApp, normalizarWhatsApp } from "@/lib/whatsapp";
import { crearCotizacion } from "../acciones";
import type { OpcionServicio } from "../consultas";
import { erroresDelPaso, PASO_CLIENTE, PASO_SERVICIOS, PASO_VEHICULO, PASOS_NUEVA_COTIZACION, pasoDeCampo, primerPasoConError } from "../pasos";
import { CLIENTE_NUEVO, VEHICULO_OTRO } from "../reglas";
import { CamposPrecio, TotalEnPie, usePrecios } from "./campos-precio";
import type { Linea } from "./lineas-servicio";

// Nueva cotización en pasos (pedido 40, etapas/P40-cotizacion-en-pasos.md): el cliente, su vehículo y los servicios con
// su precio, un paso por pantalla. Un solo formulario: los pasos que no están a la vista se esconden y se envían igual,
// así el cliente y el vehículo nuevos se registran recién con "Crear cotización" (nada queda a medias). "Siguiente"
// revisa el paso con los mismos esquemas que la acción; si la acción devuelve un error, la pantalla vuelve a su paso.
// El paso va en la dirección (#vehiculo, #servicios): el botón Atrás del celular vuelve al anterior. El precio
// sugerido depende del tamaño del vehículo y cambia con el vehículo elegido o el tamaño del nuevo.

export type ClienteElegido = {
  id: number;
  nombre: string;
  telefono: string;
  /** `detalle`: marca y modelo, año, color… lo que se sepa. */
  vehiculos: { id: number; placa: string; tamanoId: number; tamano: string; detalle: (string | number)[] }[];
};

type Props = {
  /** null: cliente nuevo, que se registra con la cotización. */
  cliente: ClienteElegido | null;
  tamanos: Tamano[];
  /** Las opciones del catálogo para cada tamaño (los activos y los de sus vehículos). */
  opciones: Record<number, OpcionServicio[]>;
  inicio: { validaHasta: string; adelanto: string };
  hoy: string;
};

const CAMPO_TAMANO = `${PREFIJO_VEHICULO}tamanoId`;
/** El paso en la dirección: el botón Atrás del celular vuelve al anterior sin salir de la pantalla. */
const ANCLAS = ["cliente", "vehiculo", "servicios"] as const;

/** El aviso de repetido lleva a cotizarle a ese cliente, no a su ficha. */
const usarExistente = (e: { id: number; nombre: string }) => ({ href: `/panel/cotizaciones/nueva?cliente=${e.id}` as const, texto: `Usar a ${e.nombre}` });

/** El precio que sugiere el catálogo para esa variante, como se escribe en el campo; vacío si no hay. */
function sugerido(opciones: OpcionServicio[] | null, varianteId: number): string {
  const o = opciones?.find((x) => x.varianteId === varianteId);
  return o?.sugerencia.tipo === "monto" ? mostrarMonto(o.sugerencia.monto) : "";
}

export function FormularioNuevaCotizacion({ cliente, tamanos, opciones, inicio, hoy }: Props) {
  const clienteNuevo = !cliente;
  const primerPaso = clienteNuevo ? PASO_CLIENTE : PASO_VEHICULO;
  const [paso, setPaso] = useState(primerPaso);
  // El paso a la vista, para los que escuchan el historial (sin esperar al próximo dibujo)
  const pasoActual = useRef(primerPaso);
  // Errores de "Siguiente", y los pasos ya revisados desde el último envío (sus errores de la acción ya no valen)
  const [locales, setLocales] = useState<Record<string, string>>({});
  const [revisados, setRevisados] = useState<Set<number>>(new Set());
  // Lo elegido o escrito, para el resumen de arriba: se lee del formulario cada vez que se muestra un paso
  const [resumen, setResumen] = useState<{ cliente?: [string, string]; vehiculo?: { placa: string; detalle: (string | number)[] } }>({});
  // El foco pedido. Tras un error de la acción, el paso y los errores pueden llegar en dibujos distintos: se espera un
  // par de dibujos a que el campo con error esté en pantalla, y después se da por puesto
  const [pedidoFoco, setPedidoFoco] = useState<{ n: number; error: boolean }>({ n: 0, error: false });
  const focoPuesto = useRef(0);
  const intentosFoco = useRef(0);
  const errorAlLlegar = useRef(false);
  const formulario = useRef<HTMLFormElement>(null);

  function pedirFoco(error: boolean) {
    intentosFoco.current = 0;
    setPedidoFoco((p) => ({ n: p.n + 1, error }));
  }

  /** Lo que se ve arriba del paso, con lo que tiene el formulario ahora. */
  function leerResumen() {
    if (!formulario.current) return;
    const valores = leerValores(new FormData(formulario.current));
    const elegido = cliente?.vehiculos.find((x) => String(x.id) === valores.vehiculo);
    const nuevo = (c: string) => valores[PREFIJO_VEHICULO + c]?.trim() || null;
    const placa = valores[`${PREFIJO_VEHICULO}placa`] ?? "";
    setResumen({
      cliente: clienteNuevo ? [valores.nombre?.trim() ?? "", formatearWhatsApp(normalizarWhatsApp(valores.telefono ?? "") ?? valores.telefono ?? "")] : undefined,
      vehiculo: elegido
        ? { placa: elegido.placa, detalle: elegido.detalle }
        : {
            // Como la guarda el servidor
            placa: normalizarPlaca(placa) ?? placa.trim().toUpperCase(),
            detalle: detalleVehiculo({ marca: nuevo("marca"), modelo: nuevo("modelo"), anio: Number(nuevo("anio")) || null, color: nuevo("color") }),
          },
    });
  }

  /** Muestra un paso: lo que hace cada cambio de paso, venga de un botón o del historial. */
  function mostrar(nuevo: number) {
    pasoActual.current = nuevo;
    setPaso(nuevo);
    leerResumen();
    window.scrollTo({ top: 0 });
    pedirFoco(errorAlLlegar.current);
    errorAlLlegar.current = false;
  }

  /**
   * Un paso es una entrada del historial: avanzar agrega una ("#vehiculo", "#servicios") y volver retrocede (Atrás,
   * "Cambiar" y la vuelta por un error), así el botón Atrás del celular siempre lleva al paso anterior.
   */
  function volverA(destino: number) {
    const pasos = pasoActual.current - destino;
    if (pasos > 0) window.history.go(-pasos);
  }

  // Lo que devuelve la acción: los errores de nuevo, y la pantalla al primer paso con uno (como conAviso: al terminar la
  // acción, no en un efecto)
  const [estado, accion, enviando] = useActionState<EstadoCliente, FormData>(async (previo, datos) => {
    const r = await crearCotizacion(previo, datos);
    setLocales({});
    setRevisados(new Set());
    const conError = primerPasoConError(r.errores ?? {});
    if (conError !== null) {
      const destino = Math.max(conError, primerPaso);
      if (destino < pasoActual.current) {
        errorAlLlegar.current = true;
        volverA(destino);
      } else pedirFoco(true);
    }
    return r;
  }, {});
  const v = estado.valores ?? {};

  // Controlados, y su valor viaja en un campo oculto propio: React reinicia el formulario al terminar la acción y el
  // campo interno de los radios de base-ui quedaba vacío tras un error, aunque la opción se siguiera viendo marcada
  const conVehiculos = !!cliente && cliente.vehiculos.length > 0;
  const [vehiculo, setVehiculo] = useState(v.vehiculo ?? (cliente?.vehiculos.length === 1 ? String(cliente.vehiculos[0].id) : ""));
  const [tamanoNuevo, setTamanoNuevo] = useState(v[CAMPO_TAMANO] ?? "");
  const vehiculoNuevo = !conVehiculos || vehiculo === VEHICULO_OTRO;
  const precios = usePrecios({ lineas: [], descuento: "0.00", adelanto: inicio.adelanto, validaHasta: inicio.validaHasta, modo: "" });

  const tamanoDe = (eleccion: string, nuevo: string) =>
    !conVehiculos || eleccion === VEHICULO_OTRO ? Number(nuevo) || null : (cliente.vehiculos.find((x) => String(x.id) === eleccion)?.tamanoId ?? null);
  const tamanoId = tamanoDe(vehiculo, tamanoNuevo);
  const delTamano = (t: number | null) => (t ? (opciones[t] ?? null) : null);

  /** Con otro tamaño cambia el precio sugerido: se actualiza en las líneas que todavía tenían el sugerido. */
  function cambiarTamano(eleccion: string, nuevo: string) {
    const antes = delTamano(tamanoId);
    const despues = delTamano(tamanoDe(eleccion, nuevo));
    precios.setLineas((lineas: Linea[]) =>
      lineas.map((l) => (l.varianteId > 0 && l.precio === sugerido(antes, l.varianteId) ? { ...l, precio: sugerido(despues, l.varianteId) } : l)),
    );
  }

  // El foco, al cambiar de paso o tras un error: al primer campo con error del paso, o al primero del paso (sin mover la
  // pantalla, que queda arriba con el indicador y el resumen)
  useEffect(() => {
    if (pedidoFoco.n === 0 || focoPuesto.current === pedidoFoco.n) return;
    const visible = formulario.current?.querySelector<HTMLElement>(`[data-paso="${paso}"]`);
    const objetivo = pedidoFoco.error
      ? visible?.querySelector<HTMLElement>('[aria-invalid="true"], [data-invalido]')
      : visible?.querySelector<HTMLElement>('input:not([type="hidden"]), select, textarea, button[role="radio"]');
    if (!objetivo) {
      intentosFoco.current += 1;
      if (intentosFoco.current > 2) focoPuesto.current = pedidoFoco.n;
      return;
    }
    focoPuesto.current = pedidoFoco.n;
    if (pedidoFoco.error) objetivo.scrollIntoView({ block: "center" });
    objetivo.focus({ preventScroll: true });
  }, [pedidoFoco, paso, estado, locales]);

  // El historial: Atrás y Adelante del navegador (o del celular) cambian de paso. Adelante revisa los pasos que salta
  const alCambiarHistoria = useRef<() => void>(() => {});
  useEffect(() => {
    alCambiarHistoria.current = () => {
      const i = ANCLAS.indexOf(window.location.hash.slice(1) as (typeof ANCLAS)[number]);
      const destino = i >= primerPaso ? i : primerPaso;
      if (destino > pasoActual.current && formulario.current) {
        const valores = leerValores(new FormData(formulario.current));
        for (let p = pasoActual.current; p < destino; p++) {
          const errores = erroresDelPaso(p, valores, clienteNuevo);
          if (Object.keys(errores).length === 0) continue;
          setLocales(errores);
          errorAlLlegar.current = true;
          window.history.go(p - destino);
          return;
        }
      }
      mostrar(destino);
    };
  });
  useEffect(() => {
    if (window.location.hash) window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
    const escuchar = () => alCambiarHistoria.current();
    window.addEventListener("popstate", escuchar);
    return () => window.removeEventListener("popstate", escuchar);
  }, []);

  function siguiente() {
    const valores = leerValores(new FormData(formulario.current!));
    const errores = erroresDelPaso(paso, valores, clienteNuevo);
    setLocales(errores);
    if (Object.keys(errores).length > 0) {
      pedirFoco(true);
      return;
    }
    setRevisados((r) => new Set(r).add(paso));
    window.history.pushState(window.history.state, "", `#${ANCLAS[paso + 1]}`);
    mostrar(paso + 1);
  }

  // Los errores que se ven: los de la acción (salvo los de pasos ya revisados de nuevo) y los de "Siguiente". Lo mismo
  // con los datos repetidos: corregido el WhatsApp, ya no se ofrece "Usar a …"
  const vigente = ([campo]: [string, unknown]) => !revisados.has(pasoDeCampo(campo));
  const vista: EstadoCliente = {
    ...estado,
    errores: { ...Object.fromEntries(Object.entries(estado.errores ?? {}).filter(vigente)), ...locales },
    existentes: Object.fromEntries(Object.entries(estado.existentes ?? {}).filter(vigente)),
  };
  const e = vista.errores ?? {};
  const datosCliente = cliente ? [cliente.nombre, formatearWhatsApp(cliente.telefono)] : resumen.cliente;

  return (
    <form
      ref={formulario}
      action={accion}
      className="flex max-w-3xl flex-col gap-6"
      noValidate
      // El tamaño del vehículo nuevo es un menú de CamposVehiculo, sin control propio: se escucha su cambio
      onChange={(ev) => {
        const campo = ev.target as EventTarget;
        if (!(campo instanceof HTMLSelectElement) || campo.name !== CAMPO_TAMANO) return;
        cambiarTamano(vehiculo, campo.value);
        setTamanoNuevo(campo.value);
      }}
      onKeyDown={(ev) => {
        // Enter en un campo de los primeros pasos sigue al próximo, no crea la cotización
        if (ev.key !== "Enter" || paso === PASO_SERVICIOS || !(ev.target instanceof HTMLInputElement)) return;
        ev.preventDefault();
        siguiente();
      }}
    >
      <PasosFlujo pasos={PASOS_NUEVA_COTIZACION} actual={paso} etiqueta="Pasos de la cotización" />
      <input type="hidden" name="cliente" value={cliente ? cliente.id : CLIENTE_NUEVO} />
      {estado.mensaje && !estado.ok && <MensajeError id="cotizacion-error">{estado.mensaje}</MensajeError>}

      {/* Lo ya elegido, arriba, con "Cambiar" para volver a su paso */}
      {paso > PASO_CLIENTE && datosCliente && (
        <Resumen id="resumen-cliente" titulo="Cliente" cambiar={clienteNuevo ? () => volverA(PASO_CLIENTE) : "/panel/cotizaciones/nueva"}>
          <span className="font-semibold">{datosCliente[0]}</span>
          <span className="text-tinta-suave">{datosCliente[1]}</span>
        </Resumen>
      )}
      {paso > PASO_VEHICULO && resumen.vehiculo && (
        <Resumen id="resumen-vehiculo" titulo="Vehículo" cambiar={() => volverA(PASO_VEHICULO)}>
          <DatosVehiculo placa={resumen.vehiculo.placa} detalle={resumen.vehiculo.detalle} tamano={tamanos.find((t) => t.id === tamanoId)?.nombre ?? ""} />
        </Resumen>
      )}

      <div data-paso={PASO_CLIENTE} hidden={paso !== PASO_CLIENTE} className="flex flex-col gap-3">
        {clienteNuevo && (
          <>
            <CabeceraSeccion id="cliente" titulo="Cliente nuevo">
              <Link href="/panel/cotizaciones/nueva" className={buttonVariants({ variant: "ghost" })}>
                <SearchIcon />
                Buscar un cliente registrado
              </Link>
            </CabeceraSeccion>
            <SeccionFormulario titulo="Cliente nuevo" tituloOculto claseContenido="gap-6">
              <CamposCliente estado={vista} plegar enlaceExistente={usarExistente} />
            </SeccionFormulario>
          </>
        )}
      </div>

      <div data-paso={PASO_VEHICULO} hidden={paso !== PASO_VEHICULO}>
        <SeccionFormulario titulo={vehiculoNuevo ? (conVehiculos ? "Otro vehículo" : "Vehículo nuevo") : "Vehículo"} claseContenido="gap-4">
          {conVehiculos && (
            <>
              <input type="hidden" name="vehiculo" value={vehiculo} />
              <RadioGroup
                value={vehiculo}
                onValueChange={(valor) => {
                  cambiarTamano(String(valor), tamanoNuevo);
                  setVehiculo(String(valor));
                }}
                aria-label="Vehículo"
                className="gap-2"
                aria-describedby={e.vehiculo ? "vehiculo-error" : undefined}
              >
                {cliente.vehiculos.map((ve, i) => (
                  <OpcionRadio key={ve.id} id={`vehiculo-${ve.id}`} valor={String(ve.id)} invalido={!!e.vehiculo && i === 0}>
                    <DatosVehiculo placa={ve.placa} detalle={ve.detalle} tamano={ve.tamano} />
                  </OpcionRadio>
                ))}
                <OpcionRadio id="vehiculo-otro" valor={VEHICULO_OTRO}>
                  <span className="font-semibold">Otro vehículo</span>
                </OpcionRadio>
              </RadioGroup>
              {e.vehiculo && <MensajeError id="vehiculo-error">{e.vehiculo}</MensajeError>}
            </>
          )}
          {vehiculoNuevo && (
            <>
              {!conVehiculos && <input type="hidden" name="vehiculo" value={VEHICULO_OTRO} />}
              {/* Completo: placa y tamaño, y marca, modelo, año y color a la vista (pedido 40) */}
              <CamposVehiculo estado={vista} prefijo={PREFIJO_VEHICULO} tamanos={tamanos} enlaceExistente={usarExistente} />
            </>
          )}
        </SeccionFormulario>
      </div>

      <div data-paso={PASO_SERVICIOS} hidden={paso !== PASO_SERVICIOS} className="flex flex-col gap-6">
        <CamposPrecio precios={precios} opciones={delTamano(tamanoId)} errores={e} hoy={hoy} />
      </div>

      <PieFormulario>
        <div className="flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-2 sm:justify-start">
          {paso === PASO_SERVICIOS && <TotalEnPie total={precios.totales.total} />}
          <div className="flex gap-2">
            {paso > primerPaso && (
              <Button type="button" variant="outline" disabled={enviando} onClick={() => volverA(paso - 1)}>
                Atrás
              </Button>
            )}
            {/* Una key distinta en cada uno: si React reusara el botón, "Siguiente" se volvía "Crear cotización" durante
                el mismo toque y el navegador enviaba la cotización a medias */}
            {paso < PASO_SERVICIOS ? (
              <Button
                key="siguiente"
                type="button"
                onClick={(ev) => {
                  ev.preventDefault();
                  siguiente();
                }}
              >
                {paso === PASO_CLIENTE ? "Siguiente: vehículo" : "Siguiente: servicios"}
              </Button>
            ) : (
              <Button key="crear" type="submit" disabled={enviando}>
                {enviando ? "Creando y generando el PDF…" : "Crear cotización"}
              </Button>
            )}
          </div>
        </div>
      </PieFormulario>
    </form>
  );
}

/** Lo ya elegido en un paso, con "Cambiar": la misma cabecera y tarjeta que las fichas. */
function Resumen({ id, titulo, cambiar, children }: { id: string; titulo: string; cambiar: (() => void) | "/panel/cotizaciones/nueva"; children: React.ReactNode }) {
  const contenido = (
    <>
      <ArrowLeftRightIcon />
      Cambiar
    </>
  );
  return (
    <section aria-labelledby={`${id}-titulo`} className="flex flex-col gap-3">
      <CabeceraSeccion id={id} titulo={titulo}>
        {typeof cambiar === "string" ? (
          <Link href={cambiar} className={buttonVariants({ variant: "ghost" })} aria-label={`Cambiar ${titulo.toLowerCase()}`}>
            {contenido}
          </Link>
        ) : (
          <Button type="button" variant="ghost" onClick={cambiar} aria-label={`Cambiar ${titulo.toLowerCase()}`}>
            {contenido}
          </Button>
        )}
      </CabeceraSeccion>
      <p className="flex flex-col tt-tarjeta-panel p-4">{children}</p>
    </section>
  );
}

/** Opción con su caja tocable entera (44 px con pantalla táctil). */
function OpcionRadio({ id, valor, invalido, children }: { id: string; valor: string; invalido?: boolean; children: React.ReactNode }) {
  return (
    <label htmlFor={id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-border bg-fondo px-3 py-2 has-data-checked:border-tinta">
      <RadioGroupItem id={id} value={valor} data-invalido={invalido || undefined} />
      <span className="flex min-w-0 flex-col">{children}</span>
    </label>
  );
}
