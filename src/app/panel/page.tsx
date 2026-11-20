import Link from "next/link";
import type { Route } from "next";
import { Suspense } from "react";
import { CalendarClockIcon, CalendarPlusIcon, ChevronRightIcon, FilePlusIcon, MessageSquareWarningIcon, type LucideIcon } from "lucide-react";
import { cn } from "cn";
import { Cargando } from "@/componentes/panel/cargando";
import { EstadoVacio } from "@/componentes/panel/estado-vacio";
import { ICONO_MODULO } from "@/componentes/panel/iconos-modulo";
import { PaginaPanel } from "@/componentes/panel/pagina-panel";
import { buttonVariants } from "@/componentes/ui/button";
import { cantidad } from "@/lib/cantidad";
import { fechaConDia, fechaEnBolivia } from "@/lib/fechas";
import { MODULOS, modulosDelMenu, nombreEnMenu, puedeVerModulo, type Modulo } from "@/lib/permisos";
import { exigirModulo } from "@/lib/sesion";
import { primerNombre } from "@/modulos/clientes/reglas";
import { obtenerDatosPublicos, obtenerParametros, obtenerPlantillas } from "@/modulos/configuracion/consultas";
import { cotizacionesPendientes, cotizacionesPorReservar } from "@/modulos/cotizaciones/consultas/lista";
import { bs, diasDesde, sinRespuesta, textoDias } from "@/modulos/cotizaciones/reglas";
import { ListaInicio, type FilaInicio } from "@/modulos/inicio/componentes/lista-inicio";
import { ingresosDeHoy } from "@/modulos/inicio/consultas";
import { numerosDelDia, repartirDia, type FilaDelDia } from "@/modulos/inicio/reglas";
import { contarSinAvisar } from "@/modulos/mantenimientos/consultas";
import { ordenesAbiertas } from "@/modulos/ordenes/consultas";
import { enlaceTrabajo, rutaTrabajo } from "@/modulos/ordenes/reglas";
import { obtenerOrden } from "@/modulos/ordenes/consultas";
import { registrarAvisoListo } from "@/modulos/ordenes/acciones/estado";
import { mensajeListo } from "@/modulos/ordenes/mensajes";
import { AvisarPorWhatsApp } from "@/componentes/panel/avisar-whatsapp";
import { RegistrarPago } from "@/modulos/pagos/componentes/registrar-pago";
import { enlaceWhatsApp } from "@/lib/whatsapp";
import { puede } from "@/lib/permisos";
import { saldosPendientes } from "@/modulos/pagos/consultas";
import { reclamosPorAtender } from "@/modulos/reclamos/consultas";
import { conDesde } from "@/lib/volver";

/** Lo que se abre desde Inicio vuelve a Inicio (pedido 43). */
const INICIO = "/panel";

// Inicio del panel (HU-39, RF-52; pedido 26, etapas/P26-rediseno-panel.md; recorrido visual del 19/11). Para el dueño
// y el encargado: arriba sus dos tareas de todos los días (nueva reserva, nueva cotización) y una línea con los números
// del día; debajo, una sola lista por urgencia, sin repetir: "Urgente" (lo atrasado y los reclamos), "Hoy" (lo que llega,
// lo que se entrega y las listas por avisar) y "Pendientes" (saldos, cotizaciones sin respuesta o sin fecha y
// mantenimientos vencidos), cada fila con su acción directa. Cada parte, solo si quien entra ve ese módulo: los montos, solo con Pagos
// o Cotizaciones (RN-12). Llega entera: el saludo lleva el nombre de la sesión.
// Pedido 31 (P31-flujo-de-un-trabajo.md §2 C1): "Pendientes" suma las cotizaciones aceptadas sin fecha, para
// reservarlas.
export default function InicioPanel() {
  return (
    <PaginaPanel tipo="portada">
      <Suspense fallback={<Cargando />}>
        <Contenido />
      </Suspense>
    </PaginaPanel>
  );
}

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
    ve("cotizaciones") ? cotizacionesPendientes() : null,
    ve("cotizaciones") ? cotizacionesPorReservar() : null,
    ve("mantenimientos") ? contarSinAvisar(hoy) : null,
    ve("reclamos") ? reclamosPorAtender(1) : null,
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
  const dia = repartirDia(ingresos ?? [], abiertas ?? [], hoy);
  const numeros = numerosDelDia(ingresos, abiertas, hoy);

  // Las acciones directas (recorrido visual del 19/11): recibir y entregar van a su pantalla; avisar abre WhatsApp con el
  // mensaje de "Vehículo listo" y lo deja registrado, como en la ficha de la orden (con el saldo solo si quien avisa ve
  // Pagos); cobrar abre "Registrar pago" ahí mismo
  const recibe = ve("ordenes") && puede(usuario, "recibir_vehiculo");
  const entrega = ve("ordenes") && puede(usuario, "entregar_vehiculo");
  const porAvisar = ve("ordenes") && puede(usuario, "avisar_cliente") ? dia.hoy.filter((f) => f.paso === "avisar") : [];
  const [negocio, plantillas, ordenesPorAvisar] = await Promise.all([
    porAvisar.length > 0 ? obtenerDatosPublicos() : null,
    porAvisar.length > 0 ? obtenerPlantillas() : null,
    Promise.all(porAvisar.map((f) => obtenerOrden(f.id, ve("pagos")))),
  ]);
  const enlacesAviso = new Map<number, string>();
  if (negocio && plantillas) {
    for (const o of ordenesPorAvisar) {
      if (!o) continue;
      const mensaje = mensajeListo({ plantilla: plantillas.listo, negocio: negocio.nombre, cliente: o.cliente, vehiculo: o, saldo: o.montos?.saldo.saldo ?? null });
      enlacesAviso.set(o.id, enlaceWhatsApp(o.telefono, mensaje));
    }
  }
  const accionDe = (f: FilaDelDia) => {
    if (f.paso === "recibir" && recibe)
      return (
        <Link href={conDesde(`/panel/ordenes/${f.id}/recibir` as Route, INICIO)} className={buttonVariants({ variant: "accion" })} aria-label={`Recibir ${f.placa}`}>
          Recibir
        </Link>
      );
    if (f.paso === "entregar" && entrega)
      return (
        <Link href={conDesde(`/panel/ordenes/${f.id}/entregar` as Route, INICIO)} className={buttonVariants({ variant: "accion" })} aria-label={`Entregar ${f.placa}`}>
          Entregar
        </Link>
      );
    const aviso = f.paso === "avisar" ? enlacesAviso.get(f.id) : undefined;
    if (aviso) return <AvisarPorWhatsApp enlace={aviso} avisado={null} enLista registrarAction={registrarAvisoListo.bind(null, { id: f.id })} />;
    return undefined;
  };
  const vehiculo = (f: FilaDelDia, tono: "peligro" | "aviso"): FilaInicio => ({
    clave: `trabajo-${f.id}`,
    href: conDesde(rutaTrabajo(f.id, f.estado, ve("ordenes")), INICIO),
    titulo: f.placa,
    cliente: f.cliente,
    detalle: f.detalle,
    insignia: f.aviso ? { texto: f.aviso, tono } : undefined,
    accion: accionDe(f),
  });

  // Lo urgente: lo que se atrasó y los reclamos (un cliente que espera respuesta)
  const urgentes: FilaInicio[] = [
    ...dia.urgentes.map((f) => vehiculo(f, "peligro")),
    ...unoOVarios(
      reclamos?.primeros ?? [],
      reclamos?.total ?? 0,
      (r) => ({
        clave: "reclamos",
        href: conDesde(`/panel/reclamos/${r.id}` as Route, INICIO),
        icono: MessageSquareWarningIcon,
        titulo: `Reclamo de ${r.nombre}`,
        detalle: [r.servicio ?? r.placa, `llegó ${textoDias(diasDesde(r.createdAt, ahora))}`].join(", "),
      }),
      (r) => ({
        clave: "reclamos",
        href: "/panel/reclamos",
        icono: MessageSquareWarningIcon,
        titulo: cantidad(reclamos?.total ?? 0, "reclamo pendiente", "reclamos pendientes"),
        detalle: `El más antiguo: ${r.nombre}, llegó ${textoDias(diasDesde(r.createdAt, ahora))}`,
      }),
    ),
  ];

  // Lo que espera, sin apuro de hoy: una fila por tipo (18/11). Con un solo caso, la fila lo abre; con varios, dice
  // cuántos son y cuál espera más, y lleva a su lista
  const saldosPorAntiguedad = [...(saldos ?? [])].sort((x, y) => x.entregadoAt.getTime() - y.entregadoAt.getTime());
  const reservarDe = (c: { id: number; cotizacionId: number }) => (ve("agenda") ? `/panel/agenda/nueva?cotizacion=${c.cotizacionId}` : `/panel/cotizaciones/${c.id}`);
  const cobrarDe = (s: { id: number }) => enlaceTrabajo(s.id, "entregado", { ordenes: ve("ordenes"), agenda: ve("agenda") })?.href ?? "/panel/pagos";
  const pendientesDeAtender: FilaInicio[] = [
    ...unoOVarios(
      saldosPorAntiguedad,
      saldosPorAntiguedad.length,
      (s) => ({
        clave: "saldos",
        href: conDesde(cobrarDe(s) as Route, INICIO),
        icono: ICONO_MODULO.pagos,
        titulo: `Saldo de ${s.cliente}`,
        detalle: `${bs(s.saldo)}, entregada ${textoDias(diasDesde(s.entregadoAt, ahora))}`,
        accion: <RegistrarPago trabajoId={s.id} saldo={s.saldo} hoy={hoy} variante="accion" />,
      }),
      (s) => ({
        clave: "saldos",
        href: "/panel/pagos",
        icono: ICONO_MODULO.pagos,
        titulo: `${saldosPorAntiguedad.length} saldos por cobrar`,
        detalle: `${bs(saldosPorAntiguedad.reduce((suma, x) => suma + Number(x.saldo), 0).toFixed(2))} en total; el más antiguo, ${s.cliente}`,
      }),
    ),
    ...unoOVarios(
      sinResponder,
      sinResponder.length,
      (c) => ({
        clave: "sin-respuesta",
        href: conDesde(`/panel/cotizaciones/${c.id}` as Route, INICIO),
        icono: ICONO_MODULO.cotizaciones,
        titulo: `Cotización de ${c.cliente}`,
        detalle: `${bs(c.total)}, sin respuesta hace ${cantidad(diasDesde(c.ultimoMovimientoAt, ahora), "día", "días")}`,
      }),
      (c) => ({
        clave: "sin-respuesta",
        href: "/panel/cotizaciones",
        icono: ICONO_MODULO.cotizaciones,
        titulo: `${sinResponder.length} cotizaciones sin respuesta`,
        detalle: `La más antigua: ${c.cliente}, hace ${cantidad(diasDesde(c.ultimoMovimientoAt, ahora), "día", "días")}`,
      }),
    ),
    // Aceptadas sin fecha (pedido 31): falta reservarlas. Reservar lo hace quien ve la Agenda; si no, la abre para verla
    ...unoOVarios(
      aceptadas ?? [],
      aceptadas?.length ?? 0,
      (c) => ({
        clave: "aceptadas",
        href: conDesde(reservarDe(c) as Route, INICIO),
        icono: CalendarClockIcon,
        titulo: `Cotización aceptada de ${c.cliente}`,
        detalle: `${bs(c.total)}, sin fecha`,
        accion: ve("agenda") ? (
          <Link href={conDesde(reservarDe(c) as Route, INICIO)} className={buttonVariants({ variant: "accion" })} aria-label={`Reservar la cotización de ${c.cliente}`}>
            Reservar
          </Link>
        ) : undefined,
      }),
      (c) => ({
        clave: "aceptadas",
        href: ve("agenda") ? "/panel/agenda" : "/panel/cotizaciones?vista=aceptadas",
        icono: CalendarClockIcon,
        titulo: `${aceptadas?.length ?? 0} aceptadas sin fecha`,
        detalle: `La que más espera: ${c.cliente}`,
      }),
    ),
    ...(mantenimientos && mantenimientos.vencidos > 0
      ? [
          {
            clave: "mantenimientos",
            href: "/panel/mantenimientos" as Route,
            icono: ICONO_MODULO.mantenimientos,
            titulo: cantidad(mantenimientos.vencidos, "mantenimiento vencido", "mantenimientos vencidos"),
            detalle: "Sin avisar todavía",
            accion: (
              <Link href="/panel/mantenimientos" className={buttonVariants({ variant: "accion" })} aria-label="Avisar los mantenimientos vencidos">
                Avisar
              </Link>
            ),
          },
        ]
      : []),
  ];

  const veDia = ingresos !== null || abiertas !== null;
  // Los reclamos van en "Urgente": sin nada más que ver (un encargado solo con Reclamos), "Urgente" se muestra igual
  const conPendientes = pendientes !== null || saldos !== null || mantenimientos !== null;
  const conUrgente = urgentes.length > 0 || (!veDia && !conPendientes);
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 @xl:flex-row @xl:items-end @xl:justify-between">
        <div className="flex flex-col gap-1">
          <Saludo nombre={usuario.nombre} hoy={hoy} />
          <ResumenDelDia {...numeros} />
        </div>
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

      {/* El mismo orden en el celular y en la computadora: Urgente, Hoy y Pendientes. En pantalla grande, Hoy a la
          derecha, a lo alto de las otras dos */}
      <div className="grid items-start gap-6 @5xl:grid-cols-2">
        {conUrgente && <ListaInicio id="urgente" titulo="Urgente" filas={urgentes} vacio="Nada urgente." urgente className="@5xl:col-start-1" />}
        {veDia && (
          <ListaInicio
            id="hoy"
            titulo="Hoy"
            filas={dia.hoy.map((f) => vehiculo(f, "aviso"))}
            vacio="Hoy no llega ni se entrega ningún vehículo."
            className="@5xl:col-start-2 @5xl:row-span-2 @5xl:row-start-1"
          />
        )}
        {conPendientes && <ListaInicio id="pendientes" titulo="Pendientes" filas={pendientesDeAtender} vacio="Nada pendiente." className="@5xl:col-start-1" />}
      </div>
    </section>
  );
}

/** Con un solo caso, su fila; con varios, una fila que los resume (18/11). */
function unoOVarios<T>(lista: T[], total: number, uno: (e: T) => FilaInicio, varios: (primero: T) => FilaInicio): FilaInicio[] {
  return lista.length === 0 ? [] : total === 1 ? [uno(lista[0])] : [varios(lista[0])];
}

/** La línea bajo el saludo (19/11, en lugar de las tarjetas): cuántos hay en el taller, llegan y se entregan hoy. */
function ResumenDelDia({ enTaller, lleganHoy, seEntreganHoy }: ReturnType<typeof numerosDelDia>) {
  const partes: { href: Route; texto: string }[] = [];
  if (enTaller !== null) partes.push({ href: "/panel/ordenes", texto: `${enTaller} en el taller` });
  if (lleganHoy !== null) partes.push({ href: "/panel/agenda", texto: cantidad(lleganHoy, "llega hoy", "llegan hoy") });
  if (seEntreganHoy !== null) partes.push({ href: "/panel/ordenes", texto: cantidad(seEntreganHoy, "se entrega hoy", "se entregan hoy") });
  if (partes.length === 0) return null;
  return (
    <nav aria-label="Resumen de hoy">
      <ul className="flex flex-wrap gap-x-2 text-sm text-tinta-suave">
        {partes.map((p, n) => (
          <li key={p.texto} className="flex gap-x-2">
            {n > 0 && <span aria-hidden>·</span>}
            <Link href={p.href} className="font-semibold text-foreground underline-offset-4 hover:underline">
              {p.texto}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
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

function Acceso({ href, icono: Icono, titulo }: { href: Route; icono: LucideIcon; titulo: string }) {
  return (
    <Link href={href} className="tt-tarjeta-panel flex min-h-11 items-center gap-4 p-4 hover:border-tinta-suave/50">
      <Icono className="size-6 shrink-0 text-tinta-suave" aria-hidden />
      <span className="flex-1 font-semibold">{titulo}</span>
      <ChevronRightIcon className="size-5 shrink-0 text-tinta-suave" aria-hidden />
    </Link>
  );
}
