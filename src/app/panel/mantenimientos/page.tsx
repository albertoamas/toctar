import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { cn } from "cn";
import { CalendarIcon } from "lucide-react";
import { AvisarPorWhatsApp } from "@/componentes/panel/avisar-whatsapp";
import { Cargando } from "@/componentes/panel/cargando";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { ENLACE_TEXTO } from "@/componentes/panel/enlace-texto";
import { EstadoVacio } from "@/componentes/panel/estado-vacio";
import { Pestanas } from "@/componentes/panel/pestanas";
import { buttonVariants } from "@/componentes/ui/button";
import { diaYHora, fechaCorta, fechaEnBolivia } from "@/lib/fechas";
import { puedeVerModulo } from "@/lib/permisos";
import { exigirModulo } from "@/lib/sesion";
import { enlaceWhatsApp } from "@/lib/whatsapp";
import { vehiculoEnLista } from "@/modulos/clientes/reglas";
import { obtenerDatosPublicos, obtenerPlantillas } from "@/modulos/configuracion/consultas";
import { avisarMantenimiento } from "@/modulos/mantenimientos/acciones";
import { NoLeInteresa } from "@/modulos/mantenimientos/componentes/no-le-interesa";
import {
  contarPorVista,
  mantenimientosCerrados,
  mantenimientosMasAdelante,
  mantenimientosPorAvisar,
  type MantenimientoCerrado,
  type MantenimientoPorAvisar,
} from "@/modulos/mantenimientos/consultas";
import {
  agruparPorMes,
  DIAS_PROXIMOS,
  textoCadaMeses,
  NOMBRE_ESTADO_RECORDATORIO,
  seccionMantenimiento,
  textoVencimiento,
  MAXIMO_CERRADOS,
  VISTAS_MANTENIMIENTOS,
  type VistaMantenimientos,
} from "@/modulos/mantenimientos/reglas";
import { enlaceTrabajo } from "@/modulos/ordenes/reglas";
import { mensajeMantenimiento } from "@/modulos/ordenes/mensajes";
import { Insignia } from "@/componentes/panel/insignia";
import { FilaConAcciones, ListaEnTarjeta } from "@/componentes/panel/fila-lista";
import { PaginaPanel } from "@/componentes/panel/pagina-panel";
import { CabeceraSeccion } from "@/componentes/panel/cabecera-seccion";

export const metadata: Metadata = { title: "Mantenimientos" };

// HU-38: a quién le toca volver (RF-50, RN-08). El dueño o el encargado con "Mantenimientos". Los vencidos y los que
// vencen en los próximos 15 días, por fecha. Desde cada uno: avisar por WhatsApp (queda registrado), agendar (una
// reserva directa del cliente y su vehículo: lleva precios, así que solo para quien ve agenda y pagos) o cerrarlo.
// Pulido 12.2: las filas como en Saldos pendientes (acciones con borde, a la derecha en la computadora), "Sin avisar"
// en una insignia como en Órdenes y "No le interesa" sin fondo, con su modal.
// Pedido 20: todos los mantenimientos en tres pestañas (`?vista=`): "Por avisar" (lo de hoy, la tarea de la pantalla),
// "Más adelante" (los abiertos que vencen después, por mes, para planificar) y "Cerrados" (agendados y "No le
// interesa", el más reciente primero, sin acciones). Los de un cliente o vehículo desactivado, en ninguna.
export default function PaginaMantenimientos({ searchParams }: PageProps<"/panel/mantenimientos">) {
  return (
    <PaginaPanel tipo="ficha">
      <EncabezadoPagina titulo="Mantenimientos" />
      <Suspense fallback={<Cargando />}>
        <Listas searchParams={searchParams} />
      </Suspense>
    </PaginaPanel>
  );
}

const TITULOS: Record<VistaMantenimientos, string> = { "por-avisar": "Por avisar", "mas-adelante": "Más adelante", cerrados: "Cerrados" };
const enlace = (vista: VistaMantenimientos) => (vista === "por-avisar" ? "/panel/mantenimientos" : `/panel/mantenimientos?vista=${vista}`);
const cantidad = (n: number) => (n === 1 ? "1 mantenimiento" : `${n} mantenimientos`);

async function Listas({ searchParams }: Pick<PageProps<"/panel/mantenimientos">, "searchParams">) {
  const usuario = await exigirModulo("mantenimientos");
  const { vista: pedida } = await searchParams;
  const vista = VISTAS_MANTENIMIENTOS.find((v) => v === pedida) ?? "por-avisar";
  const hoy = fechaEnBolivia();
  // Las cantidades y la lista a la vez, no una detrás de otra
  const [cantidades, contenido] = await Promise.all([
    contarPorVista(hoy),
    vista === "cerrados"
      ? cerrados(hoy, { ordenes: puedeVerModulo(usuario, "ordenes"), agenda: puedeVerModulo(usuario, "agenda") })
      : abiertos(vista, hoy, puedeVerModulo(usuario, "agenda") && puedeVerModulo(usuario, "pagos")),
  ]);

  return (
    <>
      <Pestanas
        etiqueta="Mantenimientos"
        activa={enlace(vista)}
        pestanas={VISTAS_MANTENIMIENTOS.map((v) => ({ href: enlace(v), texto: `${TITULOS[v]} (${cantidades[v]})` }))}
      />
      {contenido}
      {vista === "cerrados" && cantidades.cerrados > MAXIMO_CERRADOS && (
        <p className="text-sm text-tinta-suave">Se muestran los {MAXIMO_CERRADOS} más recientes. Los demás están en la ficha de cada cliente.</p>
      )}
    </>
  );
}

/**
 * "Por avisar" (vencidos y próximos) y "Más adelante" (por mes): las mismas filas. En "Más adelante" no se avisa: el
 * mensaje dice que ya le toca, y avisado antes de tiempo, no figuraría "Sin avisar" cuando de verdad le toque.
 */
async function abiertos(vista: "por-avisar" | "mas-adelante", hoy: string, puedeAgendar: boolean) {
  const [lista, negocio, plantillas] = await Promise.all([
    vista === "por-avisar" ? mantenimientosPorAvisar(hoy) : mantenimientosMasAdelante(hoy),
    obtenerDatosPublicos(),
    obtenerPlantillas(),
  ]);
  if (lista.length === 0) {
    return <EstadoVacio>{vista === "por-avisar" ? "No hay mantenimientos por avisar." : `Ninguno vence después de los próximos ${DIAS_PROXIMOS} días.`}</EstadoVacio>;
  }
  const fila = (m: MantenimientoPorAvisar) => (
    <Fila key={m.id} m={m} hoy={hoy} mensaje={{ plantilla: plantillas.mantenimiento, negocio: negocio.nombre }} puedeAgendar={puedeAgendar} conAviso={vista === "por-avisar"} />
  );

  if (vista === "mas-adelante") {
    return agruparPorMes(lista, (m) => m.fechaProgramada).map((g) => (
      <Seccion key={g.mes} titulo={g.titulo} cantidad={g.elementos.length}>
        {g.elementos.map(fila)}
      </Seccion>
    ));
  }
  const vencidos = lista.filter((m) => seccionMantenimiento(m.fechaProgramada, hoy) === "vencido");
  const proximos = lista.filter((m) => seccionMantenimiento(m.fechaProgramada, hoy) === "proximo");
  return (
    <>
      <Seccion titulo="Vencidos" cantidad={vencidos.length} vacio="Ninguno vencido.">
        {vencidos.map(fila)}
      </Seccion>
      <Seccion titulo={`Próximos ${DIAS_PROXIMOS} días`} cantidad={proximos.length} vacio={`Ninguno vence en los próximos ${DIAS_PROXIMOS} días.`}>
        {proximos.map(fila)}
      </Seccion>
    </>
  );
}

/** Agendados (con su reserva) y "No le interesa" (con su nota): para consultar, sin acciones. */
async function cerrados(hoy: string, ve: { ordenes: boolean; agenda: boolean }) {
  const lista = await mantenimientosCerrados();
  if (lista.length === 0) return <EstadoVacio>Todavía no hay mantenimientos reservados ni cerrados.</EstadoVacio>;
  return (
    <ListaEnTarjeta etiqueta="Cerrados">
      {lista.map((m) => (
        <FilaCerrada key={m.id} m={m} hoy={hoy} ve={ve} />
      ))}
    </ListaEnTarjeta>
  );
}

function Seccion({ titulo, cantidad: n, vacio, children }: { titulo: string; cantidad: number; /** Si puede quedar vacía. */ vacio?: string; children: React.ReactNode }) {
  return (
    // El lector oye la sección como "Vencidos, 2 mantenimientos"; a la vista, "Vencidos (2)"
    <section aria-label={`${titulo}, ${cantidad(n)}`} className="flex flex-col gap-3">
      <CabeceraSeccion
        titulo={
          <>
            {titulo} <span className="tabular-nums text-tinta-suave">({n})</span>
          </>
        }
      />
      {n === 0 ? (
        <p className="text-tinta-suave">{vacio}</p>
      ) : (
        <ListaEnTarjeta etiqueta={titulo}>{children}</ListaEnTarjeta>
      )}
    </section>
  );
}

function Fila({ m, hoy, mensaje, puedeAgendar, conAviso }: { m: MantenimientoPorAvisar; hoy: string; mensaje: { plantilla: string; negocio: string }; puedeAgendar: boolean; conAviso: boolean }) {
  const vehiculo = { marca: m.marca, modelo: m.modelo, placa: m.placa };
  const avisado = m.avisadoAt ? `Avisado el ${diaYHora(m.avisadoAt)}${m.avisadoPor ? ` por ${m.avisadoPor}` : ""}` : null;
  const agendar = new URLSearchParams({ cliente: String(m.clienteId), vehiculo: String(m.vehiculoId), recordatorio: String(m.id) });
  return (
    <FilaConAcciones>
      <div className="flex min-w-0 flex-1 items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col">
          <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-semibold">{m.cliente}</span>
            {conAviso && !avisado && <Insignia tono="aviso">Sin avisar</Insignia>}
          </span>
          <span className="text-sm text-tinta-suave">{vehiculoEnLista(vehiculo)}</span>
          <span className="text-sm">
            Mantenimiento de {m.servicio}, {textoCadaMeses(m.intervaloMeses)}
          </span>
          {avisado && <span className="text-sm text-tinta-suave">{avisado}</span>}
        </div>
        {/* La fecha es lo que ordena la lista: se lee primero, como el monto en Saldos pendientes */}
        <span className="flex shrink-0 flex-col items-end">
          <span className="tt-placa text-xl whitespace-nowrap">{fechaCorta(m.fechaProgramada, hoy)}</span>
          <span className="text-sm whitespace-nowrap text-tinta-suave">{textoVencimiento(m.fechaProgramada, hoy)}</span>
        </span>
      </div>
      <div className="flex flex-col gap-1 lg:items-end">
        <div className="flex flex-wrap gap-2">
          {conAviso && (
            <AvisarPorWhatsApp
              enlace={enlaceWhatsApp(m.telefono, mensajeMantenimiento({ ...mensaje, cliente: m.cliente, vehiculo, servicio: m.servicio }))}
              avisado={avisado}
              conDetalle={false}
              enLista
              registrarAction={avisarMantenimiento.bind(null, { id: m.id })}
            />
          )}
          {puedeAgendar && (
            <Link href={`/panel/agenda/nueva?${agendar.toString()}`} className={cn(buttonVariants({ variant: "outline" }))}>
              <CalendarIcon />
              Reservar
            </Link>
          )}
        </div>
        <NoLeInteresa id={m.id} />
      </div>
    </FilaConAcciones>
  );
}

function FilaCerrada({ m, hoy, ve }: { m: MantenimientoCerrado; hoy: string; ve: { ordenes: boolean; agenda: boolean } }) {
  // Agendado: a su reserva, o a su orden si ya se recibió; hecho: a la orden que lo hizo (si quien mira puede abrirla)
  const trabajo = m.trabajo && enlaceTrabajo(m.trabajo.id, m.trabajo.estado, ve);
  return (
    <li className="flex flex-col gap-1 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col">
          <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-semibold">{m.cliente}</span>
            <Insignia>{NOMBRE_ESTADO_RECORDATORIO[m.estado]}</Insignia>
          </span>
          <span className="text-sm text-tinta-suave">{vehiculoEnLista({ marca: m.marca, modelo: m.modelo, placa: m.placa })}</span>
          <span className="text-sm">Mantenimiento de {m.servicio}</span>
          {m.nota && <span className="text-sm text-tinta-suave">Nota: {m.nota}</span>}
        </div>
        <span className="flex shrink-0 flex-col items-end">
          <span className="tt-placa text-xl whitespace-nowrap">{fechaCorta(m.fechaProgramada, hoy)}</span>
          <span className="text-sm whitespace-nowrap text-tinta-suave">programado</span>
        </span>
      </div>
      {trabajo && (
        <Link href={trabajo.href} className={ENLACE_TEXTO}>
          {trabajo.texto}
        </Link>
      )}
    </li>
  );
}
