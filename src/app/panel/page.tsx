import Link from "next/link";
import type { Route } from "next";
import { Suspense } from "react";
import { CalendarClockIcon, CalendarPlusIcon, CarFrontIcon, ChevronRightIcon, FilePlusIcon, MessageSquareWarningIcon, type LucideIcon } from "lucide-react";
import { cn } from "cn";
import { Cargando } from "@/componentes/panel/cargando";
import { EstadoVacio } from "@/componentes/panel/estado-vacio";
import { ICONO_MODULO } from "@/componentes/panel/iconos-modulo";
import { Insignia } from "@/componentes/panel/insignia";
import { PaginaPanel } from "@/componentes/panel/pagina-panel";
import { CabeceraSeccion } from "@/componentes/panel/cabecera-seccion";
import { CeldaDoble, TablaLista } from "@/componentes/panel/tabla-lista";
import { TarjetaNumero } from "@/componentes/panel/tarjeta-numero";
import { buttonVariants } from "@/componentes/ui/button";
import { cantidad } from "@/lib/cantidad";
import { fechaConDia, fechaEnBolivia } from "@/lib/fechas";
import { MODULOS, modulosDelMenu, nombreEnMenu, puedeVerModulo, type Modulo } from "@/lib/permisos";
import { exigirModulo } from "@/lib/sesion";
import { NOMBRE_ESTADO_TRABAJO, TONO_ESTADO_TRABAJO } from "@/modulos/agenda/reglas";
import { primerNombre } from "@/modulos/clientes/reglas";
import { obtenerParametros } from "@/modulos/configuracion/consultas";
import { cotizacionesPorReservar, listarCotizaciones } from "@/modulos/cotizaciones/consultas";
import { bs, diasDesde, sinRespuesta, textoDias } from "@/modulos/cotizaciones/reglas";
import { ParaAtender, type Pendiente } from "@/modulos/inicio/componentes/para-atender";
import { ingresosDeHoy } from "@/modulos/inicio/consultas";
import { paraHoy, type FilaDelDia } from "@/modulos/inicio/reglas";
import { contarSinAvisar } from "@/modulos/mantenimientos/consultas";
import { ordenesAbiertas } from "@/modulos/ordenes/consultas";
import { enlaceTrabajo, estaAtrasada, rutaTrabajo } from "@/modulos/ordenes/reglas";
import { saldosPendientes } from "@/modulos/pagos/consultas";
import { reclamosPorAtender } from "@/modulos/reclamos/consultas";
import { conDesde } from "@/lib/volver";

/** Lo que se abre desde Inicio vuelve a Inicio (pedido 43). */
const INICIO = "/panel";

// Inicio del panel (HU-39, RF-52; pedido 26, etapas/P26-rediseno-panel.md). Para el dueño y el encargado: arriba sus dos
// tareas de todos los días (nueva reserva, nueva cotización); los números del día en tarjetas que llevan a su lista;
// "Para hoy" (lo que llega, lo que se entrega y lo que espera aviso) y "Para atender" (reclamos, cotizaciones sin
// respuesta, saldos y mantenimientos vencidos). Cada parte, solo si quien entra ve ese módulo: los montos, solo con Pagos
// o Cotizaciones (RN-12). Llega entera: el saludo lleva el nombre de la sesión.
// Pedido 31 (P31-flujo-de-un-trabajo.md §2 C1): "Para atender" suma las cotizaciones aceptadas sin fecha, para
// reservarlas; "Para hoy" dice el paso siguiente de cada vehículo, con el texto del botón de su pantalla.
export default function InicioPanel() {
  return (
    <PaginaPanel tipo="portada">
      <Suspense fallback={<Cargando />}>
        <Contenido />
      </Suspense>
    </PaginaPanel>
  );
}

/** Cuántos de cada tipo entran en "Para atender": lo demás está en su lista. */
const POR_TIPO = 3;

async function Contenido() {
  const usuario = await exigirModulo("inicio");
  const hoy = fechaEnBolivia();
  const ahora = new Date();
  const modulos = modulosDelMenu(usuario).filter((m) => m !== "inicio");
  const ve = (m: Modulo) => puedeVerModulo(usuario, m);
  const [ingresos, abiertas, saldos, pendientes, aceptadas, mantenimientos, reclamos, parametros] = await Promise.all([
    ve("agenda") ? ingresosDeHoy(hoy) : null,
    ve("ordenes") ? ordenesAbiertas() : null,
    ve("pagos") ? saldosPendientes() : null,
    ve("cotizaciones") ? listarCotizaciones("pendientes", "").then((r) => r.cotizaciones) : null,
    ve("cotizaciones") ? cotizacionesPorReservar() : null,
    ve("mantenimientos") ? contarSinAvisar(hoy) : null,
    ve("reclamos") ? reclamosPorAtender(POR_TIPO) : null,
    // Los días sin respuesta de una cotización: solo hacen falta con Cotizaciones
    ve("cotizaciones") ? obtenerParametros() : null,
  ]);
  const conDia = [ingresos, abiertas, saldos, pendientes, mantenimientos, reclamos].some((b) => b !== null);

  if (!conDia) {
    return (
      <section className="flex flex-col gap-6">
        <Saludo nombre={usuario.nombre} hoy={hoy} />
        {modulos.length === 0 ? (
          // Un encargado al que todavía no le marcaron permisos
          <EstadoVacio>Por ahora no hay nada para ti en el panel. Pídele al dueño que te dé acceso a lo que vas a usar.</EstadoVacio>
        ) : (
          <nav aria-label="Ir a" className="grid max-w-3xl gap-3 md:grid-cols-2">
            {modulos.map((m) => (
              <Acceso key={m} href={MODULOS[m].ruta as Route} icono={ICONO_MODULO[m]} titulo={nombreEnMenu(m)} />
            ))}
          </nav>
        )}
      </section>
    );
  }

  const sinResponder = parametros
    ? (pendientes ?? []).filter((c) => sinRespuesta(c.estado, diasDesde(c.ultimoMovimientoAt, ahora), parametros.dias_cotizacion_sin_respuesta))
    : [];
  const delDia = paraHoy(ingresos ?? [], abiertas ?? [], hoy);

  // De cada tipo, los que más urgen (los más antiguos) y, si hay más, una fila a su lista: nada queda sin decirse
  const masDe = (total: number, href: Route, icono: LucideIcon, que: string): Pendiente[] =>
    total > POR_TIPO ? [{ href, icono, titulo: `${total - POR_TIPO} ${que} más`, detalle: `${total} en total`, accion: "Ver todos" }] : [];
  const atender: Pendiente[] = [
    ...(reclamos?.primeros ?? []).map((r) => ({
      href: conDesde(`/panel/reclamos/${r.id}` as Route, INICIO),
      icono: MessageSquareWarningIcon,
      titulo: `Reclamo de ${r.nombre}`,
      detalle: [r.servicio ?? r.placa, `llegó ${textoDias(diasDesde(r.createdAt, ahora))}`].join(", "),
      accion: "Responder",
    })),
    ...masDe(reclamos?.total ?? 0, "/panel/reclamos", MessageSquareWarningIcon, "reclamos pendientes"),
    ...sinResponder.slice(0, POR_TIPO).map((c) => ({
      href: conDesde(`/panel/cotizaciones/${c.id}` as Route, INICIO),
      icono: ICONO_MODULO.cotizaciones,
      titulo: `Cotización de ${c.cliente}`,
      detalle: `${bs(c.total)}, sin respuesta hace ${cantidad(diasDesde(c.ultimoMovimientoAt, ahora), "día", "días")}`,
      accion: "Ver",
    })),
    ...masDe(sinResponder.length, "/panel/cotizaciones", ICONO_MODULO.cotizaciones, "cotizaciones sin respuesta"),
    // Aceptadas sin fecha (pedido 31): falta reservarlas
    ...(aceptadas ?? []).slice(0, POR_TIPO).map((c) => ({
      // A la reserva, para quien ve la Agenda; si no, a la cotización
      href: conDesde((ve("agenda") ? `/panel/agenda/nueva?cotizacion=${c.cotizacionId}` : `/panel/cotizaciones/${c.id}`) as Route, INICIO),
      icono: CalendarClockIcon,
      titulo: `Cotización aceptada de ${c.cliente}`,
      detalle: `${bs(c.total)}, sin fecha`,
      // Reservar lo hace quien ve la Agenda; si no, la abre para verla
      accion: ve("agenda") ? "Reservar" : "Ver",
    })),
    ...masDe(aceptadas?.length ?? 0, ve("agenda") ? "/panel/agenda" : "/panel/cotizaciones?vista=aceptadas", CalendarClockIcon, "aceptadas sin fecha"),
    ...(saldos ?? []).slice(0, POR_TIPO).map((s) => ({
      // A la orden si quien mira puede abrirla; si no (Pagos sin Órdenes), a Saldos pendientes, donde se cobra
      href: conDesde((enlaceTrabajo(s.id, "entregado", { ordenes: ve("ordenes"), agenda: ve("agenda") })?.href ?? "/panel/pagos") as Route, INICIO),
      icono: ICONO_MODULO.pagos,
      titulo: `Saldo de ${s.cliente}`,
      detalle: `${bs(s.saldo)}, entregada ${textoDias(diasDesde(s.entregadoAt, ahora))}`,
      accion: "Cobrar",
    })),
    ...masDe(saldos?.length ?? 0, "/panel/pagos", ICONO_MODULO.pagos, "saldos"),
    ...(mantenimientos && mantenimientos.vencidos > 0
      ? [
          {
            href: "/panel/mantenimientos" as Route,
            icono: ICONO_MODULO.mantenimientos,
            titulo: cantidad(mantenimientos.vencidos, "mantenimiento vencido", "mantenimientos vencidos"),
            detalle: "Sin avisar todavía",
            accion: "Avisar",
          },
        ]
      : []),
  ];

  const atrasadas = abiertas?.filter((o) => estaAtrasada(o, hoy)).length ?? 0;
  const sinAvisar = abiertas?.filter((o) => o.sinAvisar).length ?? 0;
  const porCobrar = saldos?.reduce((suma, s) => suma + Number(s.saldo), 0) ?? 0;
  const notaTaller = [atrasadas > 0 && cantidad(atrasadas, "atrasada", "atrasadas"), sinAvisar > 0 && cantidad(sinAvisar, "lista sin avisar", "listas sin avisar")].filter(Boolean).join(", ");
  const llegaHoy = ingresos?.filter((i) => i.fechaInicio === hoy).length ?? 0;
  const debianLlegar = (ingresos?.length ?? 0) - llegaHoy;
  // Cuántas tarjetas se ven: con un número impar, una va a todo el ancho en el celular
  const tarjetasImpar = [abiertas, ingresos, saldos, pendientes, mantenimientos].filter(Boolean).length % 2 === 1;

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 @xl:flex-row @xl:items-end @xl:justify-between">
        <Saludo nombre={usuario.nombre} hoy={hoy} />
        {(ve("cotizaciones") || ve("agenda")) && (
          <div className="grid grid-cols-2 gap-2 @xl:flex">
            {ve("cotizaciones") && (
              <Link href={conDesde("/panel/cotizaciones/nueva", INICIO)} className={cn(buttonVariants({ variant: "outline" }), !ve("agenda") && "col-span-2")}>
                <FilePlusIcon />
                Nueva cotización
              </Link>
            )}
            {ve("agenda") && (
              <Link href={conDesde("/panel/agenda/nueva", INICIO)} className={cn(buttonVariants(), !ve("cotizaciones") && "col-span-2")}>
                <CalendarPlusIcon />
                Nueva reserva
              </Link>
            )}
          </div>
        )}
      </div>

      {/* En el celular, de a dos; con un número impar, una va a todo el ancho y no queda un hueco: "Por cobrar", la cifra más
          larga, si se ve (con Pagos; pulido final, 10/11); si no, la última */}
      <section aria-label="Resumen de hoy" className={cn("grid grid-cols-2 gap-3 @4xl:grid-cols-5", !saldos && "*:last:odd:col-span-2 @4xl:*:last:odd:col-span-1")}>
        {saldos && (
          <TarjetaNumero
            href="/panel/pagos"
            className={tarjetasImpar ? "col-span-2 @4xl:col-span-1" : undefined}
            icono={ICONO_MODULO.pagos}
            titulo="Por cobrar"
            valor={bs(porCobrar.toFixed(2))}
            nota={saldos.length > 0 ? cantidad(saldos.length, "entregada con saldo", "entregadas con saldo") : "Nadie debe"}
          />
        )}
        {abiertas && (
          <TarjetaNumero href="/panel/ordenes" icono={ICONO_MODULO.ordenes} titulo="En el taller" valor={abiertas.length} nota={notaTaller || "Nada atrasado"} aviso={notaTaller !== ""} />
        )}
        {ingresos && (
          <TarjetaNumero
            href="/panel/agenda"
            icono={CarFrontIcon}
            titulo="Llegan hoy"
            valor={llegaHoy}
            nota={debianLlegar > 0 ? `${cantidad(debianLlegar, "debía", "debían")} llegar antes` : llegaHoy > 0 ? "Por recibir" : "Nada para hoy"}
            aviso={debianLlegar > 0}
          />
        )}
        {pendientes && (
          <TarjetaNumero
            href="/panel/cotizaciones"
            icono={ICONO_MODULO.cotizaciones}
            titulo="Cotizaciones"
            valor={pendientes.length}
            nota={sinResponder.length > 0 ? `${sinResponder.length} sin respuesta` : "Pendientes de respuesta"}
            aviso={sinResponder.length > 0}
          />
        )}
        {mantenimientos && (
          <TarjetaNumero
            href="/panel/mantenimientos"
            icono={ICONO_MODULO.mantenimientos}
            titulo="Mantenimientos"
            valor={mantenimientos.vencidos + mantenimientos.proximos}
            nota={mantenimientos.vencidos > 0 ? cantidad(mantenimientos.vencidos, "vencido sin avisar", "vencidos sin avisar") : "Por avisar"}
            aviso={mantenimientos.vencidos > 0}
          />
        )}
      </section>

      <div className="grid items-start gap-6 @5xl:grid-cols-[minmax(0,1fr)_22rem]">
        {(ingresos || abiertas) && <ParaHoy filas={delDia} verOrdenes={ve("ordenes")} />}
        {(reclamos || pendientes || saldos || mantenimientos) && <ParaAtender pendientes={atender} />}
      </div>
    </section>
  );
}

function Saludo({ nombre, hoy }: { nombre: string; hoy: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <h1 className="tt-titulo-pagina">Hola, {primerNombre(nombre)}</h1>
      <p className="text-sm text-tinta-suave">{fechaConDia(hoy)}</p>
    </div>
  );
}

/** Lo del día en una tabla: la placa y el cliente, el estado con lo que pide atención y cuándo. */
function ParaHoy({ filas, verOrdenes }: { filas: FilaDelDia[]; verOrdenes: boolean }) {
  return (
    <section aria-labelledby="hoy-titulo" className="flex min-w-0 flex-col gap-3">
      <CabeceraSeccion id="hoy" titulo="Para hoy" />
      {filas.length === 0 ? (
        <EstadoVacio>Nada para hoy: no llega ni se entrega ningún vehículo.</EstadoVacio>
      ) : (
        <TablaLista
          etiqueta="Para hoy"
          columnas={[
            { titulo: "Vehículo", ancho: "minmax(0,1fr)", movil: "titulo" },
            // En el celular, en su renglón debajo de la placa: dos insignias al lado partían el nombre del cliente
            { titulo: "Estado", ancho: "minmax(0,1.3fr)", movil: "detalle" },
            { titulo: "Cuándo", ancho: "minmax(0,1fr)", movil: "detalle" },
            { titulo: "Siguiente paso", ancho: "minmax(0,1fr)", movil: "oculta" },
          ]}
          filas={filas.map((f) => ({
            href: conDesde(rutaTrabajo(f.id, f.estado, verOrdenes), INICIO),
            celdas: [
              <CeldaDoble key="v" principal={f.placa} secundario={f.cliente} peso="placa" />,
              <span key="e" className="flex flex-wrap gap-1.5">
                <Insignia tono={TONO_ESTADO_TRABAJO[f.estado]}>{NOMBRE_ESTADO_TRABAJO[f.estado]}</Insignia>
                {f.avisos.map((a) => (
                  <Insignia key={a} tono="aviso">
                    {a}
                  </Insignia>
                ))}
              </span>,
              <span key="c">
                {f.cuando}
                {/* En el celular, el paso siguiente en la misma línea: su columna no se muestra */}
                {f.siguiente && <span className="@2xl:hidden">, {f.siguiente.charAt(0).toLowerCase() + f.siguiente.slice(1)}</span>}
              </span>,
              f.siguiente,
            ],
          }))}
        />
      )}
    </section>
  );
}

function Acceso({ href, icono: Icono, titulo }: { href: Route; icono: LucideIcon; titulo: string }) {
  return (
    <Link href={href} className="tt-tarjeta-panel flex min-h-11 items-center gap-4 p-4 hover:border-tinta-suave/50">
      <Icono className="size-6 shrink-0 text-tinta-suave" aria-hidden />
      <span className="flex-1 font-semibold">{titulo}</span>
      <ChevronRightIcon className="size-5 shrink-0 text-tinta-suave" aria-hidden />
    </Link>
  );
}
