import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { cn } from "cn";
import { CalendarIcon } from "lucide-react";
import { AvisarPorWhatsApp } from "@/componentes/panel/avisar-whatsapp";
import { Cargando } from "@/componentes/panel/cargando";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { EstadoVacio } from "@/componentes/panel/estado-vacio";
import { buttonVariants } from "@/componentes/ui/button";
import { diaYHora, fechaCorta, fechaEnBolivia } from "@/lib/fechas";
import { puedeVerModulo } from "@/lib/permisos";
import { exigirModulo } from "@/lib/sesion";
import { enlaceWhatsApp } from "@/lib/whatsapp";
import { vehiculoEnLista } from "@/modulos/clientes/reglas";
import { obtenerDatosPublicos, obtenerPlantillas } from "@/modulos/configuracion/consultas";
import { avisarMantenimiento } from "@/modulos/mantenimientos/acciones";
import { NoLeInteresa } from "@/modulos/mantenimientos/componentes/no-le-interesa";
import { mantenimientosPorAvisar, type MantenimientoPorAvisar } from "@/modulos/mantenimientos/consultas";
import { DIAS_PROXIMOS, seccionMantenimiento, textoVencimiento } from "@/modulos/mantenimientos/reglas";
import { mensajeMantenimiento } from "@/modulos/ordenes/mensajes";

export const metadata: Metadata = { title: "Mantenimientos" };

// HU-38: a quién le toca volver (RF-50, RN-08). El dueño o el encargado con "Mantenimientos". Los vencidos y los que
// vencen en los próximos 15 días, por fecha. Desde cada uno: avisar por WhatsApp (queda registrado), agendar (una
// reserva directa del cliente y su vehículo: lleva precios, así que solo para quien ve agenda y pagos) o cerrarlo.
// Pulido 12.2: las filas como en Saldos pendientes (acciones con borde, a la derecha en la computadora), "Sin avisar"
// en una insignia como en Órdenes y "No le interesa" sin fondo, con su modal.
export default function PaginaMantenimientos() {
  return (
    <section className="flex flex-col gap-6">
      <EncabezadoPagina titulo="Mantenimientos" />
      <Suspense fallback={<Cargando />}>
        <Listas />
      </Suspense>
    </section>
  );
}

async function Listas() {
  const usuario = await exigirModulo("mantenimientos");
  const puedeAgendar = puedeVerModulo(usuario, "agenda") && puedeVerModulo(usuario, "pagos");
  const hoy = fechaEnBolivia();
  const [todos, negocio, plantillas] = await Promise.all([mantenimientosPorAvisar(hoy), obtenerDatosPublicos(), obtenerPlantillas()]);
  if (todos.length === 0) return <EstadoVacio>No hay mantenimientos por avisar.</EstadoVacio>;
  const vencidos = todos.filter((m) => seccionMantenimiento(m.fechaProgramada, hoy) === "vencido");
  const proximos = todos.filter((m) => seccionMantenimiento(m.fechaProgramada, hoy) === "proximo");
  const fila = (m: MantenimientoPorAvisar) => <Fila key={m.id} m={m} hoy={hoy} mensaje={{ plantilla: plantillas.mantenimiento, negocio: negocio.nombre }} puedeAgendar={puedeAgendar} />;

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

function Seccion({ titulo, cantidad, vacio, children }: { titulo: string; cantidad: number; vacio: string; children: React.ReactNode }) {
  return (
    // El lector oye la sección como "Vencidos, 2 mantenimientos"; a la vista, "Vencidos (2)"
    <section aria-label={`${titulo}, ${cantidad === 1 ? "1 mantenimiento" : `${cantidad} mantenimientos`}`} className="flex max-w-3xl flex-col gap-3">
      <h2 className="font-heading text-2xl font-bold italic">
        {titulo} <span className="tabular-nums text-tinta-suave">({cantidad})</span>
      </h2>
      {cantidad === 0 ? (
        <p className="text-tinta-suave">{vacio}</p>
      ) : (
        <ul aria-label={titulo} className="flex flex-col divide-y divide-border rounded-sm border border-border">
          {children}
        </ul>
      )}
    </section>
  );
}

function Fila({ m, hoy, mensaje, puedeAgendar }: { m: MantenimientoPorAvisar; hoy: string; mensaje: { plantilla: string; negocio: string }; puedeAgendar: boolean }) {
  const vehiculo = { marca: m.marca, modelo: m.modelo, placa: m.placa };
  const avisado = m.avisadoAt ? `Avisado el ${diaYHora(m.avisadoAt)}${m.avisadoPor ? ` por ${m.avisadoPor}` : ""}` : null;
  const agendar = new URLSearchParams({ cliente: String(m.clienteId), vehiculo: String(m.vehiculoId), recordatorio: String(m.id) });
  return (
    <li className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:gap-6">
      <div className="flex min-w-0 flex-1 items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col">
          <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-semibold">{m.cliente}</span>
            {!avisado && <span className="tt-insignia tt-insignia--aviso">Sin avisar</span>}
          </span>
          <span className="text-sm text-tinta-suave">{vehiculoEnLista(vehiculo)}</span>
          <span className="text-sm">Mantenimiento de {m.servicio}</span>
          {avisado && <span className="text-sm text-tinta-suave">{avisado}</span>}
        </div>
        {/* La fecha es lo que ordena la lista: se lee primero, como el monto en Saldos pendientes */}
        <span className="flex shrink-0 flex-col items-end">
          <span className="font-heading text-2xl font-extrabold whitespace-nowrap italic tabular-nums">{fechaCorta(m.fechaProgramada, hoy)}</span>
          <span className="text-sm whitespace-nowrap text-tinta-suave">{textoVencimiento(m.fechaProgramada, hoy)}</span>
        </span>
      </div>
      <div className="flex flex-col gap-1 lg:items-end">
        <div className="flex flex-wrap gap-2">
          <AvisarPorWhatsApp
            enlace={enlaceWhatsApp(m.telefono, mensajeMantenimiento({ ...mensaje, cliente: m.cliente, vehiculo, servicio: m.servicio }))}
            avisado={avisado}
            conDetalle={false}
            enLista
            registrarAction={avisarMantenimiento.bind(null, { id: m.id })}
          />
          {puedeAgendar && (
            <Link href={`/panel/agenda/nueva?${agendar.toString()}`} className={cn(buttonVariants({ variant: "outline" }))}>
              <CalendarIcon />
              Agendar
            </Link>
          )}
        </div>
        <NoLeInteresa id={m.id} />
      </div>
    </li>
  );
}
