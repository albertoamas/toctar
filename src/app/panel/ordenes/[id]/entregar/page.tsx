import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { Cargando } from "@/componentes/panel/cargando";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { PaginaPanel } from "@/componentes/panel/pagina-panel";
import { Seccion } from "@/componentes/panel/cabecera-seccion";
import { AvisoEstado } from "@/componentes/panel/aviso-estado";
import { PasoConCostado } from "@/componentes/panel/con-resumen";
import { RegistrarPago } from "@/modulos/pagos/componentes/registrar-pago";
import { ListaDatos } from "@/componentes/panel/lista-datos";
import { fechaEnBolivia, formatearFecha } from "@/lib/fechas";
import { puede, puedeVerModulo } from "@/lib/permisos";
import { exigirModulo } from "@/lib/sesion";
import { mostrarMonto } from "@/modulos/catalogo/reglas";
import { detalleVehiculo } from "@/modulos/clientes/reglas";
import { FormularioEntrega } from "@/modulos/ordenes/componentes/formulario-entrega";
import { vistaPreviaPlanes } from "@/modulos/mantenimientos/planes";
import { obtenerOrden } from "@/modulos/ordenes/consultas";
import { MontosTrabajo } from "@/modulos/pagos/componentes/montos-trabajo";
import { estaPagada } from "@/modulos/pagos/reglas";
import { filaVehiculo } from "@/modulos/clientes/componentes/datos-vehiculo";
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
      {/* El marco de los pasos del taller (C7 §5.3, 18/11): arriba lo que decide, si está pagado o cuánto falta (sin Pagos,
          solo si queda saldo; si además no puede entregar con saldo, lo dice una vez el formulario, con por qué) */}
      {conPagos ? (
        conDeuda ? (
          <AvisoEstado tono="aviso" accion={<RegistrarPago trabajoId={o.id} saldo={saldo} hoy={hoy} variante="outline" />}>
            Falta cobrar {mostrarMonto(saldo)} Bs
          </AvisoEstado>
        ) : (
          <AvisoEstado tono="exito">Pagado por completo.</AvisoEstado>
        )
      ) : conDeuda && !puede(usuario, "entrega_con_saldo") ? null : (
        <AvisoEstado tono={conDeuda ? "aviso" : "exito"}>{conDeuda ? "Queda saldo pendiente." : "Pagado por completo."}</AvisoEstado>
      )}

      {/* Lo que se entrega al costado en la computadora; en el celular, arriba de la firma */}
      <PasoConCostado
        etiqueta="Lo que se entrega"
        costado={
          <>
            <Seccion id="se-entrega" titulo="Se entrega" dentro>
              <ListaDatos
                nombre="Lo que se entrega"
                filas={[
                  ["Cliente", <span key="cliente" className="font-semibold">{o.cliente}</span>],
                  filaVehiculo(detalle, o.tamano),
                ]}
              />
            </Seccion>
            {conPagos && <MontosTrabajo trabajoId={o.id} montos={o.montos} cerrado={false} hoy={hoy} cobrar />}
          </>
        }
      >
        <FormularioEntrega
          id={o.id}
          volver={leerDesde(busqueda.volver)}
          conDeuda={conDeuda}
          saldo={conPagos ? `${mostrarMonto(saldo)} Bs` : null}
          puedeAutorizar={puede(usuario, "entrega_con_saldo")}
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
