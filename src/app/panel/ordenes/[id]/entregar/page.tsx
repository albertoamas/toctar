import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { Cargando } from "@/componentes/panel/cargando";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { PaginaPanel } from "@/componentes/panel/pagina-panel";
import { PasoConCostado } from "@/componentes/panel/con-resumen";
import { RegistrarPago } from "@/modulos/pagos/componentes/registrar-pago";
import { fechaEnBolivia, formatearFecha } from "@/lib/fechas";
import { puede, puedeVerModulo } from "@/lib/permisos";
import { exigirModulo } from "@/lib/sesion";
import { mostrarMonto } from "@/modulos/catalogo/reglas";
import { detalleVehiculo } from "@/modulos/clientes/reglas";
import { CuentaPlegable } from "@/modulos/ordenes/componentes/cuenta-plegable";
import { FormularioEntrega } from "@/modulos/ordenes/componentes/formulario-entrega";
import { ResumenDelTrabajo } from "@/modulos/ordenes/componentes/resumen-del-trabajo";
import { vistaPreviaPlanes } from "@/modulos/mantenimientos/planes";
import { obtenerOrden } from "@/modulos/ordenes/consultas";
import { MontosTrabajo } from "@/modulos/pagos/componentes/montos-trabajo";
import { estaPagada } from "@/modulos/pagos/reglas";
import { conDesde, leerDesde, sinElTrabajo, volverDesde } from "@/lib/volver";

export const metadata: Metadata = { title: "Entregar vehículo" };

// HU-36: entregar el vehículo (RF-43, RF-49, CU-19). El dueño o el encargado con "Órdenes", desde una orden lista: el
// precio final, lo pagado y el saldo (con "Pagos"; sin ellos, solo si queda saldo), cobrar ahí mismo y confirmar. Con
// saldo, solo quien puede autorizarlo (RN-13). Se anticipa lo que pasa con los planes de mantenimiento del vehículo (RN-08, pedido 21).
// Pulido 11.4: con saldo, "Falta cobrar" y "Registrar pago" van antes de la casilla de entregar con saldo, que es la
// excepción; el botón, fijo abajo en el celular.
export default function PaginaEntregar({ params, searchParams }: PageProps<"/panel/ordenes/[id]/entregar">) {
  return (
    <PaginaPanel tipo="formulario">
      <Suspense fallback={<Cargando />}>
        <Entrega params={params} searchParams={searchParams} />
      </Suspense>
    </PaginaPanel>
  );
}

async function Entrega({ params, searchParams }: Pick<PageProps<"/panel/ordenes/[id]/entregar">, "params" | "searchParams">) {
  const usuario = await exigirModulo("ordenes");
  if (!puede(usuario, "entregar_vehiculo")) redirect("/panel/sin-acceso");
  const [{ id }, busqueda] = await Promise.all([params, searchParams]);
  if (!/^\d+$/.test(id)) notFound();
  const conPagos = puedeVerModulo(usuario, "pagos");
  // Con los montos siempre, para saber si queda saldo; se muestran solo a quien ve pagos
  const o = await obtenerOrden(Number(id), true);
  if (!o || !o.montos) notFound();
  // Ya entregada o todavía no lista: a la orden, con el origen de antes (pedido 43)
  if (o.estado !== "listo") redirect(conDesde(`/panel/ordenes/${o.id}`, sinElTrabajo(String(busqueda.volver ?? ""), o.id)));
  const hoy = fechaEnBolivia();
  // Lo que la entrega va a hacer con los planes de mantenimiento del vehículo: la misma regla que la acción (pedido 21)
  const planes = await vistaPreviaPlanes(o.id, o.vehiculoId, hoy);
  const saldo = o.montos.saldo.saldo;
  const conDeuda = !estaPagada(saldo);
  const detalle = detalleVehiculo(o);

  return (
    <>
      <EncabezadoPagina titulo={`Entregar ${o.placa}`} volver={volverDesde(busqueda.volver, { href: `/panel/ordenes/${o.id}`, texto: "Orden" }, usuario)} />
      {/* Lo que se entrega al costado en la computadora; en el celular, arriba de la firma */}
      <PasoConCostado
        etiqueta="Lo que se entrega"
        costado={
          <>
            {/* Compacto, como en Recibir (21/11). Con Pagos, los servicios van en la cuenta, con sus montos */}
            <ResumenDelTrabajo cliente={o.cliente} vehiculo={[...detalle, o.tamano]} servicios={conPagos ? [] : o.servicios} />
            {conPagos && (
              <CuentaPlegable total={`${mostrarMonto(o.montos.saldo.total)} Bs`}>
                <MontosTrabajo trabajoId={o.id} montos={o.montos} cerrado={false} hoy={hoy} cobrar />
              </CuentaPlegable>
            )}
          </>
        }
      >
        <FormularioEntrega
          id={o.id}
          volver={leerDesde(busqueda.volver)}
          conDeuda={conDeuda}
          saldo={conPagos ? `${mostrarMonto(saldo)} Bs` : null}
          puedeAutorizar={puede(usuario, "entrega_con_saldo")}
          // Lo que decide el paso, arriba y en un solo lugar (21/11): cuánto falta, "Registrar pago" y, en el mismo aviso,
          // la casilla para entregar con el saldo
          cobro={conPagos && conDeuda ? <RegistrarPago trabajoId={o.id} saldo={saldo} hoy={hoy} variante="outline" /> : null}
          cliente={o.cliente}
          alEntregar={
            // Lo que la entrega hace con los planes de mantenimiento, dicho antes del botón
            (planes.programa.length > 0 || planes.hechos.length > 0) && (
              <ul aria-label="Al entregar" className="flex flex-col gap-1 text-sm text-tinta-suave">
                {/* Por posición: dos planes pueden decir lo mismo (dos servicios con el mismo mantenimiento) */}
                {planes.hechos.map((servicio, i) => (
                  <li key={`hecho-${i}`}>Queda hecho el mantenimiento de {servicio}.</li>
                ))}
                {planes.programa.map((p, i) => (
                  <li key={`programa-${i}`}>
                    Se programará: {p.servicio}, el {formatearFecha(p.fecha)}.
                  </li>
                ))}
              </ul>
            )
          }
        />
      </PasoConCostado>
    </>
  );
}
