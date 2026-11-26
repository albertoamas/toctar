"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { usePasosEnHistorial } from "@/componentes/panel/pasos-en-historial";
import { useFocoDePaso } from "@/componentes/panel/foco-de-paso";
import Link from "next/link";
import { GRIS_SIN_ELEGIR, ListaConNuevo, NUEVO } from "@/componentes/panel/lista-con-nuevo";
import { Buscador } from "@/componentes/panel/buscador";
import { useRouter } from "next/navigation";
import { MensajeError } from "@/componentes/panel/campo";
import { PasosFlujo } from "@/componentes/panel/pasos-flujo";
import { ParaQuien } from "@/componentes/panel/para-quien";
import { AvisoAlSalir } from "@/componentes/panel/cambios-sin-guardar";
import { PieFormulario } from "@/componentes/panel/pie-formulario";
import { SeccionFormulario } from "@/componentes/panel/seccion-formulario";
import { Button, buttonVariants } from "@/componentes/ui/button";
import { mostrarMonto } from "@/modulos/catalogo/reglas";
import type { EstadoCliente } from "@/modulos/clientes/acciones";
import { CamposCliente, CamposVehiculo } from "@/modulos/clientes/componentes/campos";
import { ResumenClienteVehiculo } from "@/modulos/clientes/componentes/resumen-cliente-vehiculo";
import { detalleVehiculo, normalizarPlaca } from "@/modulos/clientes/reglas";
import { leerValores, PREFIJO_VEHICULO } from "@/modulos/clientes/valores";
import type { Tamano } from "@/modulos/configuracion/consultas";
import { formatearWhatsApp, normalizarWhatsApp } from "@/lib/whatsapp";
import { crearCotizacion } from "../acciones";
import type { OpcionServicio } from "../consultas/servicios";
import { erroresDelPaso, PASO_CLIENTE, PASO_SERVICIOS, PASO_VEHICULO, PASOS_NUEVA_COTIZACION, pasoDeCampo, primerPasoConError } from "../pasos";
import { CLIENTE_NUEVO, VEHICULO_OTRO } from "../reglas";
import { CamposVehiculoInteresado, useFotoInteresado } from "./campos-interesado";
import { CamposPrecio, ResumenPrecios, TotalEnPie, usePrecios } from "./campos-precio";
import type { Linea } from "./lineas-servicio";
import { conDesde } from "@/lib/volver";
import { ConResumen } from "@/componentes/panel/con-resumen";
import type { CatalogoVehiculos } from "@/modulos/clientes/catalogo-vehiculos";

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
  /** Las marcas de la lista, para el vehículo nuevo (pedido 52). */
  catalogo: CatalogoVehiculos;
  /** Las opciones del catálogo para cada tamaño (los activos y los de sus vehículos). */
  opciones: Record<number, OpcionServicio[]>;
  inicio: { validaHasta: string; adelanto: string };
  hoy: string;
  /** La pantalla de origen (pedido 43): va en el formulario y la cotización creada vuelve ahí. */
  volver?: string | null;
  /** Sin cliente elegido (24/11): la lista para elegirlo, con "Cliente nuevo" que se llena ahí mismo, y su nota. */
  clientes?: { opciones: { id: number; titulo: string; detalle: string }[]; nota: string | null };
  /** "Cliente nuevo" ya marcado (llega con ?nuevo=1). */
  nuevoMarcado?: boolean;
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

export function FormularioNuevaCotizacion({ cliente, tamanos, catalogo, opciones, inicio, hoy, volver, clientes, nuevoMarcado }: Props) {
  const clienteNuevo = !cliente;
  const router = useRouter();
  // En el paso del cliente: el marcado de la lista (uno registrado o NUEVO); "Siguiente" lo confirma
  const [quien, setQuien] = useState<string | null>(nuevoMarcado ? NUEVO : null);
  const primerPaso = clienteNuevo ? PASO_CLIENTE : PASO_VEHICULO;
  const [paso, setPaso] = useState(primerPaso);
  // El paso a la vista, para los que escuchan el historial (sin esperar al próximo dibujo)
  const pasoActual = useRef(primerPaso);
  // Errores de "Siguiente", y los pasos ya revisados desde el último envío (sus errores de la acción ya no valen). Atados
  // al resultado de la acción con que se hicieron: con un envío nuevo dejan de valer solos (reiniciarlos tras el await
  // se dibujaba antes que el resultado, y volvían un momento los errores viejos)
  const [locales, setLocales] = useState<{ en: EstadoCliente | null; errores: Record<string, string> }>({ en: null, errores: {} });
  const [revisados, setRevisados] = useState<{ en: EstadoCliente | null; pasos: Set<number> }>({ en: null, pasos: new Set() });
  // Lo elegido o escrito, para el resumen de arriba: se lee del formulario cada vez que se muestra un paso
  const [resumen, setResumen] = useState<{ cliente?: [string, string]; vehiculo?: { placa: string; detalle: (string | number)[] } }>({});
  const errorAlLlegar = useRef(false);
  const formulario = useRef<HTMLFormElement>(null);

  // Lo que devuelve la acción: los errores de nuevo, y la pantalla al primer paso con uno (como conAviso: al terminar la
  // acción, no en un efecto). Lo que hace al terminar está más abajo (`alTerminar`): usa el foco, que necesita el
  // resultado de la acción
  const alTerminar = useRef<(r: EstadoCliente) => void>(() => {});
  const [estado, accion, enviando] = useActionState<EstadoCliente, FormData>(async (previo, datos) => {
    const r = await crearCotizacion(previo, datos);
    alTerminar.current(r);
    return r;
  }, {});
  const foto = useFotoInteresado(accion);
  // Al cambiar de paso, a su primer campo (no a "Buscar un cliente registrado")
  const foco = useFocoDePaso(formulario, paso, estado, 'input:not([type="hidden"]), select, textarea, button[role="radio"]');

  /** Lo que se ve arriba del paso, con lo que tiene el formulario ahora. */
  function leerResumen() {
    if (!formulario.current) return;
    const valores = leerValores(new FormData(formulario.current));
    const elegido = cliente?.vehiculos.find((x) => String(x.id) === valores.vehiculo);
    const nuevo = (c: string) => valores[PREFIJO_VEHICULO + c]?.trim() || null;
    const placa = valores[`${PREFIJO_VEHICULO}placa`] ?? "";
    setResumen({
      cliente: clienteNuevo ? [valores.nombre?.trim() ?? "", formatearWhatsApp(normalizarWhatsApp(valores.telefono ?? "") ?? valores.telefono ?? "")] : undefined,
      // Alguien nuevo (P31b): su placa, como la guarda el servidor
      vehiculo: clienteNuevo
        ? { placa: normalizarPlaca(valores.interesadoPlaca ?? "") ?? (valores.interesadoPlaca ?? "").trim().toUpperCase(), detalle: [] }
        : elegido
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
    foco.pedir(errorAlLlegar.current);
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

  useEffect(() => {
    alTerminar.current = (r) => {
      const conError = primerPasoConError(r.errores ?? {});
      if (conError === null) return;
      foco.esperar(r);
      const destino = Math.max(conError, primerPaso);
      if (destino < pasoActual.current) {
        errorAlLlegar.current = true;
        volverA(destino);
      } else foco.pedir(true);
    };
  });
  const v = estado.valores ?? {};

  // Controlados, y su valor viaja en un campo oculto propio: React reinicia el formulario al terminar la acción y el
  // campo interno de los radios de base-ui quedaba vacío tras un error, aunque la opción se siguiera viendo marcada
  const conVehiculos = !!cliente && cliente.vehiculos.length > 0;
  const [vehiculo, setVehiculo] = useState(
    v.vehiculo ?? (cliente?.vehiculos.length === 1 ? String(cliente.vehiculos[0].id) : cliente && cliente.vehiculos.length === 0 ? VEHICULO_OTRO : ""),
  );
  const [tamanoNuevo, setTamanoNuevo] = useState(v[CAMPO_TAMANO] ?? "");
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

  // El historial: Atrás y Adelante del navegador (o del celular) cambian de paso. Adelante revisa los pasos que salta
  usePasosEnHistorial(() => {
    const i = ANCLAS.indexOf(window.location.hash.slice(1) as (typeof ANCLAS)[number]);
    const destino = i >= primerPaso ? i : primerPaso;
    if (destino > pasoActual.current && formulario.current) {
      const valores = leerValores(new FormData(formulario.current));
      for (let p = pasoActual.current; p < destino; p++) {
        const errores = erroresDelPaso(p, valores, clienteNuevo);
        if (Object.keys(errores).length === 0) continue;
        setLocales({ en: estado, errores });
        errorAlLlegar.current = true;
        window.history.go(p - destino);
        return;
      }
    }
    mostrar(destino);
  });

  function siguiente() {
    const valores = leerValores(new FormData(formulario.current!));
    const errores = erroresDelPaso(paso, valores, clienteNuevo);
    setLocales({ en: estado, errores });
    if (Object.keys(errores).length > 0) {
      foco.pedir(true);
      return;
    }
    setRevisados((r) => ({ en: estado, pasos: new Set(r.en === estado ? r.pasos : []).add(paso) }));
    window.history.pushState(window.history.state, "", `#${ANCLAS[paso + 1]}`);
    mostrar(paso + 1);
  }

  // Los errores que se ven: los de la acción (salvo los de pasos ya revisados de nuevo) y los de "Siguiente". Lo mismo
  // con los datos repetidos: corregido el WhatsApp, ya no se ofrece "Usar a …"
  const yaRevisados = revisados.en === estado ? revisados.pasos : new Set<number>();
  const vigente = ([campo]: [string, unknown]) => !yaRevisados.has(pasoDeCampo(campo));
  const vista: EstadoCliente = {
    ...estado,
    errores: { ...Object.fromEntries(Object.entries(estado.errores ?? {}).filter(vigente)), ...(locales.en === estado ? locales.errores : {}) },
    existentes: Object.fromEntries(Object.entries(estado.existentes ?? {}).filter(vigente)),
  };
  const e = vista.errores ?? {};
  const datosCliente = cliente ? [cliente.nombre, formatearWhatsApp(cliente.telefono)] : resumen.cliente;
  // Lo ya elegido (pulido final del 09/11, como Nueva reserva), con "Cambiar" para volver a su paso: arriba y, en el
  // paso de servicios de la computadora, al costado. `id` distinto en cada lugar: los dos están en la página
  const cotizacionPara = (id: string, pie?: React.ReactNode) =>
    datosCliente && (
      <ResumenClienteVehiculo
        id={id}
        pie={pie}
        titulo="Cotización para"
        cliente={{ nombre: datosCliente[0], detalle: datosCliente[1], href: clienteNuevo ? undefined : conDesde("/panel/cotizaciones/nueva", volver), alCambiar: () => volverA(PASO_CLIENTE) }}
        vehiculo={
          paso > PASO_VEHICULO && resumen.vehiculo
            ? { ...resumen.vehiculo, tamano: tamanos.find((t) => t.id === tamanoId)?.nombre ?? "", alCambiar: () => volverA(PASO_VEHICULO) }
            : null
        }
      />
    );

  return (
    <form
      ref={formulario}
      action={accion}
      className="flex flex-col gap-6"
      noValidate
      // Con la foto del vehículo del interesado, va achicada (P31b); sin ella, el formulario sigue solo
      onSubmit={(ev) => void foto.enviar(ev, clienteNuevo)}
      onKeyDown={(ev) => {
        // Enter en un campo de los primeros pasos sigue al próximo, no crea la cotización
        if (ev.key !== "Enter" || paso === PASO_SERVICIOS || !(ev.target instanceof HTMLInputElement)) return;
        ev.preventDefault();
        siguiente();
      }}
    >
      {/* Los pasos hechos se tocan para volver (20/11): el cliente registrado, a buscar otro; el nuevo, a sus datos */}
      <PasosFlujo
        pasos={PASOS_NUEVA_COTIZACION}
        actual={paso}
        etiqueta="Pasos de la cotización"
        destinos={[clienteNuevo ? { alTocar: () => volverA(PASO_CLIENTE) } : { href: conDesde("/panel/cotizaciones/nueva", volver) }, { alTocar: () => volverA(PASO_VEHICULO) }]}
      />
      <input type="hidden" name="cliente" value={cliente ? cliente.id : CLIENTE_NUEVO} />
      {volver && <input type="hidden" name="volver" value={volver} />}
      {estado.mensaje && !estado.ok && <MensajeError id="cotizacion-error">{estado.mensaje}</MensajeError>}

      {/* Para quién es, en una línea (20/11, como Nueva reserva): se vuelve a un paso tocándolo en el indicador. En el
          paso de servicios, en la computadora, el resumen con el cliente y el total va al costado (ConResumen, C7 §5.2) */}
      {paso > PASO_CLIENTE && datosCliente && (
        // En el paso de servicios de la computadora, ya lo dice el resumen del costado
        <div className={paso === PASO_SERVICIOS ? "@4xl:hidden" : undefined}>
        <ParaQuien
          etiqueta="Cotización para"
          nombre={datosCliente[0]}
          placa={paso > PASO_VEHICULO ? resumen.vehiculo?.placa : null}
          tamano={paso > PASO_VEHICULO ? tamanos.find((t) => t.id === tamanoId)?.nombre : null}
        />
        </div>
      )}

      <div data-paso={PASO_CLIENTE} hidden={paso !== PASO_CLIENTE} className="flex flex-col gap-3">
        {/* La lista de clientes con "Cliente nuevo" que se llena ahí mismo (24/11): sin otra pantalla ni "Buscar un cliente
            registrado" */}
        {clienteNuevo && (
          <ListaConNuevo
            id="cliente"
            titulo="Cliente"
            encima={
              <div className="px-4 pt-4 sm:px-5">
                <Buscador />
              </div>
            }
            debajo={clientes?.nota && <p className="border-t border-border px-4 py-3 text-sm text-tinta-suave">{clientes.nota}</p>}
            etiqueta="Elegir cliente"
            opciones={(clientes?.opciones ?? []).map((c) => ({ clave: String(c.id), titulo: c.titulo, detalle: c.detalle }))}
            nuevo={{ titulo: "Cliente nuevo", detalle: "Registrar a alguien que todavía no está" }}
            elegida={quien}
            alElegir={setQuien}
          >
            {/* Sin registrarlo (P31b): solo nombre y WhatsApp; el resto, si vuelve a reservar */}
            <CamposCliente estado={vista} compacto enlaceExistente={usarExistente} />
          </ListaConNuevo>
        )}
      </div>

      <div data-paso={PASO_VEHICULO} hidden={paso !== PASO_VEHICULO}>
        {clienteNuevo ? (
        <SeccionFormulario titulo="Vehículo" claseContenido="gap-4">
            <CamposVehiculoInteresado
              estado={vista}
              enlaceExistente={usarExistente}
              tamanos={tamanos}
              valores={v}
              errores={{ ...e, ...(foto.error ? { foto: foto.error } : {}) }}
              alCambiarTamano={(t) => {
                cambiarTamano(VEHICULO_OTRO, t);
                setTamanoNuevo(t);
              }}
              foto={foto}
            />
        </SeccionFormulario>
        ) : (
          // Sus vehículos con "Otro vehículo" que se llena ahí mismo (24/11), como el cliente. Con su campo oculto
          <ListaConNuevo
            id="vehiculo"
            titulo="Vehículo"
            etiqueta="Elegir vehículo"
            opciones={cliente.vehiculos.map((ve) => ({ clave: String(ve.id), titulo: ve.placa, esPlaca: true, detalle: [...ve.detalle, `Tamaño: ${ve.tamano}`].join(" · ") }))}
            nuevo={{ titulo: "Otro vehículo", detalle: "Registrar uno nuevo" }}
            elegida={vehiculo === VEHICULO_OTRO ? NUEVO : vehiculo || null}
            alElegir={(clave) => {
              const valor = clave === NUEVO ? VEHICULO_OTRO : clave;
              cambiarTamano(valor, tamanoNuevo);
              setVehiculo(valor);
            }}
            conError={!!e.vehiculo}
          >
            <input type="hidden" name="vehiculo" value={vehiculo} />
              {/* Completo: placa y tamaño, y marca, modelo, año y color a la vista (pedido 40) */}
              <CamposVehiculo
                estado={vista}
                prefijo={PREFIJO_VEHICULO}
                tamanos={tamanos}
                catalogo={catalogo}
                enlaceExistente={usarExistente}
                // Otro tamaño, otro precio sugerido
                alCambiarTamano={(t) => {
                  cambiarTamano(vehiculo, t);
                  setTamanoNuevo(t);
                }}
              />
          </ListaConNuevo>
        )}
        {e.vehiculo && <MensajeError id="vehiculo-error">{e.vehiculo}</MensajeError>}
      </div>

      <div data-paso={PASO_SERVICIOS} hidden={paso !== PASO_SERVICIOS} className="flex flex-col gap-6">
        <ConResumen
          etiqueta="Resumen de la cotización"
          // Lo elegido y el total en una sola tarjeta, con su título adentro (sistema-del-panel.md §2, 18/11)
          resumen={cotizacionPara("cotizacion-para-lateral", <ResumenPrecios precios={precios} opciones={delTamano(tamanoId)} />)}
        >
          <CamposPrecio precios={precios} opciones={delTamano(tamanoId)} errores={e} hoy={hoy} />
        </ConResumen>
      </div>

      <AvisoAlSalir formulario={formulario} estado={estado} ademas={!!foto.vista} />
      <PieFormulario pegado>
        <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-2">
          {paso === PASO_SERVICIOS && <TotalEnPie total={precios.totales.total} />}
          <div className="flex gap-2">
            {paso > primerPaso && (
              <Button type="button" variant="outline" disabled={enviando} onClick={() => volverA(paso - 1)}>
                Atrás
              </Button>
            )}
            {/* Con un cliente registrado, el vehículo es el primer paso de aquí: "Atrás" vuelve a buscar el cliente (20/11) */}
            {paso === primerPaso && !clienteNuevo && (
              <Link href={conDesde("/panel/cotizaciones/nueva", volver)} className={buttonVariants({ variant: "outline" })}>
                Atrás
              </Link>
            )}
            {/* Una key distinta en cada uno: si React reusara el botón, "Siguiente" se volvía "Crear cotización" durante
                el mismo toque y el navegador enviaba la cotización a medias */}
            {paso < PASO_SERVICIOS ? (
              <Button
                key="siguiente"
                type="button"
                // En gris hasta que se elige (24/11): el cliente (uno registrado o "Cliente nuevo") y el vehículo
                disabled={(paso === PASO_CLIENTE && clienteNuevo && !quien) || (paso === PASO_VEHICULO && !clienteNuevo && !vehiculo)}
                className={GRIS_SIN_ELEGIR}
                onClick={(ev) => {
                  ev.preventDefault();
                  // Uno registrado: su cotización empieza en el vehículo, con sus datos
                  if (paso === PASO_CLIENTE && clienteNuevo && quien && quien !== NUEVO) {
                    router.push(conDesde(`/panel/cotizaciones/nueva?cliente=${quien}`, volver));
                    return;
                  }
                  siguiente();
                }}
              >
                {paso === PASO_CLIENTE ? "Siguiente: vehículo" : "Siguiente: servicios"}
              </Button>
            ) : (
              <Button key="crear" type="submit" disabled={enviando || foto.preparando}>
                {foto.preparando ? "Preparando la foto…" : enviando ? "Creando y generando el PDF…" : "Crear cotización"}
              </Button>
            )}
          </div>
        </div>
      </PieFormulario>
    </form>
  );
}

