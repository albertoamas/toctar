import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { cn } from "cn";
import { Cargando } from "@/componentes/panel/cargando";
import { IconoWhatsApp } from "@/componentes/sitio/iconos-marca";
import { buttonVariants } from "@/componentes/ui/button";
import { diasEntre, fechaEnBolivia, formatearFecha, textoHace } from "@/lib/fechas";
import { exigirModulo } from "@/lib/sesion";
import { enlaceWhatsApp } from "@/lib/whatsapp";
import { mostrarMonto } from "@/modulos/catalogo/reglas";
import { nombreVehiculo } from "@/modulos/clientes/reglas";
import { obtenerDatosPublicos } from "@/modulos/configuracion/consultas";
import { calcularTotales } from "@/modulos/cotizaciones/reglas";
import { mensajeSaldo } from "@/modulos/ordenes/mensajes";
import { saldosPendientes } from "@/modulos/pagos/consultas";

export const metadata: Metadata = { title: "Saldos pendientes" };

/** Desde cuántos días sin pagar se marca "Hace más de un mes". */
const DIAS_ATRASO = 30;

// HU-37: quién debe todavía (RF-47). El dueño o el encargado con "Pagos". Las órdenes entregadas con saldo, la más
// antigua primero; desde cada una se le escribe al cliente por WhatsApp o se abre la orden para registrar el pago.
export default function PaginaSaldos() {
  return (
    <section className="flex flex-col gap-6">
      <h1 className="font-heading text-4xl font-extrabold italic">Saldos pendientes</h1>
      <Suspense fallback={<Cargando />}>
        <Lista />
      </Suspense>
    </section>
  );
}

async function Lista() {
  await exigirModulo("pagos");
  const [saldos, negocio] = await Promise.all([saldosPendientes(), obtenerDatosPublicos()]);
  if (saldos.length === 0) return <p className="text-tinta-suave">Nadie debe nada.</p>;
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
          return (
            <li key={s.id} className="flex flex-col gap-3 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 flex-col">
                  <span className="font-semibold">{s.cliente}</span>
                  <span className="text-sm text-tinta-suave">{[nombreVehiculo(vehiculo), s.placa].filter(Boolean).join(", ")}</span>
                </div>
                <span className="shrink-0 font-heading text-2xl font-extrabold whitespace-nowrap italic tabular-nums">{mostrarMonto(s.saldo)} Bs</span>
              </div>
              <p className="flex flex-wrap items-center gap-2 text-sm">
                Entregada el {formatearFecha(entregada).slice(0, 5)}, {textoHace(entregada, hoy)}
                {diasEntre(entregada, hoy) >= DIAS_ATRASO && <span className="tt-insignia tt-insignia--aviso">Hace más de un mes</span>}
              </p>
              <div className="flex flex-wrap gap-2">
                <a
                  href={enlaceWhatsApp(s.telefono, mensajeSaldo({ negocio: negocio.nombre, cliente: s.cliente, vehiculo, saldo: s.saldo }))}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(buttonVariants({ variant: "outline" }))}
                >
                  <IconoWhatsApp />
                  Escribir por WhatsApp
                </a>
                {/* Enlace con forma de botón: en la orden se registra el pago */}
                <Link href={`/panel/ordenes/${s.id}`} className={cn(buttonVariants({ variant: "outline" }))}>
                  Ver la orden
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
