import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { cn } from "cn";
import { Cargando } from "@/componentes/panel/cargando";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { EstadoVacio } from "@/componentes/panel/estado-vacio";
import { IconoWhatsApp } from "@/componentes/sitio/iconos-marca";
import { buttonVariants } from "@/componentes/ui/button";
import { fechaCorta, fechaEnBolivia, textoHace } from "@/lib/fechas";
import { puedeVerModulo } from "@/lib/permisos";
import { exigirModulo } from "@/lib/sesion";
import { enlaceWhatsApp } from "@/lib/whatsapp";
import { mostrarMonto } from "@/modulos/catalogo/reglas";
import { vehiculoEnLista } from "@/modulos/clientes/reglas";
import { obtenerDatosPublicos, obtenerPlantillas } from "@/modulos/configuracion/consultas";
import { calcularTotales } from "@/modulos/cotizaciones/reglas";
import { mensajeSaldo } from "@/modulos/ordenes/mensajes";
import { enlaceTrabajo } from "@/modulos/ordenes/reglas";
import { RegistrarPago } from "@/modulos/pagos/componentes/registrar-pago";
import { saldosPendientes } from "@/modulos/pagos/consultas";

export const metadata: Metadata = { title: "Saldos pendientes" };

// HU-37: quién debe todavía (RF-47). El dueño o el encargado con "Pagos". Las órdenes entregadas con saldo, la más
// antigua primero; desde cada una se le escribe al cliente por WhatsApp y se registra el pago ahí mismo (quien tiene
// "Pagos" y no "Órdenes" no podría cobrar desde la orden). "Ver la orden" (o la reserva) para quien puede abrirla.
// Pulido 12.1: en cada fila, WhatsApp y "Registrar pago" con borde (un rojo por fila competía con los demás) y
// "Ver la orden" como enlace; en la computadora, las acciones a la derecha del texto.
export default function PaginaSaldos() {
  return (
    <section className="flex flex-col gap-6">
      <EncabezadoPagina titulo="Saldos pendientes" />
      <Suspense fallback={<Cargando />}>
        <Lista />
      </Suspense>
    </section>
  );
}

async function Lista() {
  const usuario = await exigirModulo("pagos");
  const ve = { ordenes: puedeVerModulo(usuario, "ordenes"), agenda: puedeVerModulo(usuario, "agenda") };
  const [saldos, negocio, plantillas] = await Promise.all([saldosPendientes(), obtenerDatosPublicos(), obtenerPlantillas()]);
  if (saldos.length === 0) return <EstadoVacio>Nadie debe nada.</EstadoVacio>;
  const hoy = fechaEnBolivia();
  // La misma cuenta en centavos que el resto de los montos, no una suma de decimales
  const { total } = calcularTotales(
    saldos.map((s) => s.saldo),
    "0",
  );

  return (
    <>
      <p className="flex flex-wrap items-baseline gap-x-3">
        <span className="text-tinta-suave">Total por cobrar</span>
        <span className="font-heading text-4xl font-extrabold italic tabular-nums">{mostrarMonto(total)} Bs</span>
        <span className="text-sm text-tinta-suave">{saldos.length === 1 ? "1 orden" : `${saldos.length} órdenes`}</span>
      </p>

      <ul aria-label="Órdenes con saldo" className="flex max-w-3xl flex-col divide-y divide-border rounded-sm border border-border">
        {saldos.map((s) => {
          const entregada = fechaEnBolivia(s.entregadoAt);
          const vehiculo = { marca: s.marca, modelo: s.modelo, placa: s.placa };
          const trabajo = enlaceTrabajo(s.id, "entregado", ve);
          return (
            <li key={s.id} className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:gap-6">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 flex-col">
                    <span className="font-semibold">{s.cliente}</span>
                    <span className="text-sm text-tinta-suave">{vehiculoEnLista(vehiculo)}</span>
                  </div>
                  <span className="shrink-0 font-heading text-2xl font-extrabold whitespace-nowrap italic tabular-nums">{mostrarMonto(s.saldo)} Bs</span>
                </div>
                <p className="text-sm">
                  Entregada el {fechaCorta(entregada, hoy)}, {textoHace(entregada, hoy)}
                </p>
              </div>
              <div className="flex flex-col gap-1 lg:items-end">
                <div className="flex flex-wrap gap-2">
                  <a
                    href={enlaceWhatsApp(s.telefono, mensajeSaldo({ plantilla: plantillas.saldo, negocio: negocio.nombre, cliente: s.cliente, vehiculo, saldo: s.saldo }))}
                    target="_blank"
                    rel="noreferrer"
                    className={cn(buttonVariants({ variant: "outline" }))}
                  >
                    <IconoWhatsApp />
                    Escribir por WhatsApp
                  </a>
                  <RegistrarPago trabajoId={s.id} saldo={s.saldo} hoy={hoy} conPagos />
                </div>
                {trabajo && (
                  <Link href={trabajo.href} className="inline-flex min-h-11 items-center self-start font-semibold underline lg:self-end">
                    {trabajo.texto}
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
