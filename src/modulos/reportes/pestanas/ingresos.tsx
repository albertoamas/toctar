import "server-only";
import { BanknoteIcon, CalculatorIcon, HandCoinsIcon, ReceiptIcon } from "lucide-react";
import { Seccion } from "@/componentes/panel/cabecera-seccion";
import { saldosPendientes } from "@/modulos/pagos/consultas";
import { NOMBRE_METODO } from "@/modulos/pagos/reglas";
import { cobradoPorMetodo, cobradoPorServicio } from "../calculos";
import { GraficoSerie, ListaProgreso } from "../componentes/graficos";
import { bsRedondo } from "../reglas";
import { Cambio, cambioDe, Indicadores, porciento, puntosDe, SinDatos, type Cargado } from "./comun";

// Ingresos (Reportes v2, 19/11): lo cobrado (pagos y adelantos, no lo vendido), cuántas órdenes se cobraron, el ticket
// promedio y lo que falta cobrar. Lo cobrado y las órdenes por tramo, los servicios que más generan y cómo se cobró.

const COLOR_METODO = { efectivo: "var(--grafico-servicio-1)", qr: "var(--grafico-servicio-2)", transferencia: "var(--grafico-servicio-3)" } as const;

export async function Ingresos({ c }: { c: Cargado }) {
  const { act, ant, periodo } = c;
  const vs = periodo.vs;
  const saldos = await saldosPendientes();
  const porCobrar = saldos.reduce((s, x) => s + Number(x.saldo), 0);
  const servicios = cobradoPorServicio(c.datos.cobros, c.datos.lineas);
  const metodos = cobradoPorMetodo(c.datos.cobros);
  const sinCobros = act.ingresos === 0;
  return (
    <>
      <Indicadores
        etiqueta="Ingresos del período"
        items={[
          { icono: BanknoteIcon, titulo: "Ingresos cobrados", valor: bsRedondo(act.ingresos), nota: <Cambio cambio={cambioDe(act.ingresos, ant.ingresos)} contra={vs} /> },
          { icono: ReceiptIcon, titulo: "Órdenes cobradas", valor: String(act.cobradas), nota: <Cambio cambio={cambioDe(act.cobradas, ant.cobradas)} contra={vs} /> },
          { icono: CalculatorIcon, titulo: "Ticket promedio", valor: act.cobradas ? bsRedondo(act.ticket) : "—", nota: act.cobradas ? <Cambio cambio={cambioDe(act.ticket, ant.ticket)} contra={vs} /> : "Sin cobros en estas fechas" },
          // No depende de las fechas: lo que falta cobrar hoy, y lleva a Saldos pendientes
          { icono: HandCoinsIcon, titulo: "Por cobrar hoy", valor: bsRedondo(porCobrar), nota: saldos.length ? `En ${saldos.length} ${saldos.length === 1 ? "orden" : "órdenes"}` : "Nada pendiente", href: "/panel/pagos" },
        ]}
      />
      <div className="grid gap-x-4 gap-y-6 lg:grid-cols-2">
        <Seccion id="ingresos-tramo" titulo={`Ingresos ${c.por}`} descripcion="En bolivianos (Bs).">
          {sinCobros || !c.tramos.length ? <SinDatos>Sin cobros en estas fechas.</SinDatos> : <GraficoSerie formato="bs" series={[{ nombre: "Ingresos", color: "var(--grafico-ingreso)", area: true }]} puntos={puntosDe(c, (p) => [p.ingresos])} />}
        </Seccion>
        <Seccion id="cobradas-tramo" titulo={`Órdenes cobradas ${c.por}`} descripcion="Cantidad de órdenes con un cobro.">
          {sinCobros || !c.tramos.length ? <SinDatos>Sin cobros en estas fechas.</SinDatos> : <GraficoSerie formato="cantidad" series={[{ nombre: "Órdenes", color: "var(--grafico-1)", area: true }]} puntos={puntosDe(c, (p) => [p.cobradas])} />}
        </Seccion>
      </div>
      <div className="grid gap-x-4 gap-y-6 lg:grid-cols-2">
        <Seccion id="servicios-generan" titulo="Servicios que más generan" descripcion="Por lo cobrado en el período.">
          {servicios.length ? (
            <ListaProgreso
              etiqueta="Servicios que más generan"
              ranking
              color="var(--grafico-ingreso)"
              filas={servicios.map((s) => ({ clave: String(s.servicioId), nombre: s.nombre, sub: `${porciento(s.total, act.ingresos)} % de lo cobrado`, valor: bsRedondo(s.total), extra: `${s.veces} ${s.veces === 1 ? "orden" : "órdenes"}`, parte: porciento(s.total, servicios[0].total) }))}
            />
          ) : (
            <SinDatos>Sin cobros en estas fechas.</SinDatos>
          )}
        </Seccion>
        <Seccion id="como-se-cobro" titulo="Cómo se cobró" descripcion={`Total cobrado: ${bsRedondo(act.ingresos)}.`}>
          {metodos.length ? (
            <ListaProgreso
              etiqueta="Cómo se cobró"
              filas={metodos.map((m) => ({ clave: m.metodo, nombre: NOMBRE_METODO[m.metodo], valor: bsRedondo(m.total), extra: `${porciento(m.total, act.ingresos)} %`, parte: porciento(m.total, act.ingresos), color: COLOR_METODO[m.metodo] }))}
            />
          ) : (
            <SinDatos>Sin cobros en estas fechas.</SinDatos>
          )}
        </Seccion>
      </div>
    </>
  );
}
