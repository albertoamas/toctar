import "server-only";
import { CarFrontIcon, ClockIcon, InboxIcon, WrenchIcon } from "lucide-react";
import { Seccion } from "@/componentes/panel/cabecera-seccion";
import { ordenesPorEstado, serviciosRealizados } from "../calculos";
import { enElTallerAhora } from "../datos";
import { Dona, GraficoBarrasDobles, ListaProgreso } from "../componentes/graficos";
import { bsRedondo } from "../reglas";
import { Cambio, cambioDe, Indicadores, porciento, puntosDe, SinDatos, textoDias, type Cargado } from "./comun";

// Taller (Reportes v2, 19/11): las órdenes que entraron y las que se entregaron, cuántos días quedan en el taller y
// cuántas hay ahora. Recibidas y completadas por tramo, los servicios más realizados, cómo están hoy las órdenes
// recibidas en las fechas y los días promedio por servicio.

export async function Taller({ c }: { c: Cargado }) {
  const { act, ant, periodo } = c;
  const vs = periodo.vs;
  const ahora = await enElTallerAhora();
  const servicios = serviciosRealizados(c.datos, periodo.inicio, periodo.fin);
  const estados = ordenesPorEstado(c.datos, periodo.inicio, periodo.fin);
  const conDias = servicios.filter((s) => s.diasPromedio !== null).sort((a, b) => (b.diasPromedio ?? 0) - (a.diasPromedio ?? 0));
  const ESTADOS = [
    { nombre: "Entregadas", valor: estados.entregadas, color: "var(--grafico-ingreso)" },
    { nombre: "Listas para entregar", valor: estados.listas, color: "var(--grafico-1)" },
    { nombre: "En el taller", valor: estados.enTaller, color: "var(--grafico-2)" },
  ];
  const totalEstados = ESTADOS.reduce((s, e) => s + e.valor, 0);
  return (
    <>
      <Indicadores
        etiqueta="El taller en el período"
        items={[
          { icono: InboxIcon, titulo: "Órdenes recibidas", valor: String(act.recibidas), nota: <Cambio cambio={cambioDe(act.recibidas, ant.recibidas)} contra={vs} /> },
          { icono: CarFrontIcon, titulo: "Órdenes completadas", valor: String(act.completadas), nota: <Cambio cambio={cambioDe(act.completadas, ant.completadas)} contra={vs} /> },
          {
            icono: ClockIcon,
            titulo: "Días en el taller",
            valor: act.diasPromedio === null ? "—" : textoDias(act.diasPromedio),
            nota: act.diasPromedio === null ? "Sin órdenes completadas" : <Cambio cambio={ant.diasPromedio ? cambioDe(act.diasPromedio, ant.diasPromedio) : null} contra={vs} subirEsMalo />,
          },
          { icono: WrenchIcon, titulo: "En el taller ahora", valor: String(ahora), nota: "En proceso o listas", href: "/panel/ordenes" },
        ]}
      />
      <Seccion id="recibidas-completadas" titulo={`Recibidas y completadas ${c.por}`} descripcion="Las órdenes que entraron y las que se entregaron.">
        {act.recibidas + act.completadas === 0 || !c.tramos.length ? (
          <SinDatos>Sin órdenes recibidas ni completadas en estas fechas.</SinDatos>
        ) : (
          <GraficoBarrasDobles
            series={[
              { nombre: "Recibidas", color: "var(--grafico-1)" },
              { nombre: "Completadas", color: "var(--grafico-ingreso)" },
            ]}
            puntos={puntosDe(c, (p) => [p.recibidas, p.completadas])}
          />
        )}
      </Seccion>
      <div className="grid gap-x-4 gap-y-6 lg:grid-cols-2">
        <Seccion id="mas-realizados" titulo="Servicios más realizados" descripcion="Cuántas veces se hizo cada uno.">
          {servicios.length ? (
            <ListaProgreso
              etiqueta="Servicios más realizados"
              ranking
              color="var(--grafico-1)"
              filas={servicios.map((s) => ({ clave: String(s.servicioId), nombre: s.nombre, valor: `${s.veces} ${s.veces === 1 ? "vez" : "veces"}`, extra: bsRedondo(s.monto), parte: porciento(s.veces, servicios[0].veces) }))}
            />
          ) : (
            <SinDatos>Sin órdenes completadas en estas fechas.</SinDatos>
          )}
        </Seccion>
        <Seccion id="por-estado" titulo="Órdenes por estado" descripcion="Las recibidas en estas fechas, según cómo están hoy.">
          {totalEstados === 0 ? (
            <SinDatos>Sin órdenes recibidas en estas fechas.</SinDatos>
          ) : (
            <div className="flex flex-col items-center gap-5 sm:flex-row">
              <div className="w-48 shrink-0">
                <Dona formato="cantidad" porciones={ESTADOS} centro={String(totalEstados)} centroTexto={totalEstados === 1 ? "orden" : "órdenes"} />
              </div>
              <dl className="flex w-full flex-col text-sm">
                {ESTADOS.map((e, i) => (
                  <div key={e.nombre} className={`flex justify-between gap-3 py-2 ${i ? "border-t border-border/60" : ""}`}>
                    <dt className="flex items-center gap-2">
                      <span aria-hidden className="size-2.5 rounded-[3px]" style={{ background: e.color }} />
                      {e.nombre}
                    </dt>
                    <dd className="tabular-nums">
                      <span className="font-semibold">{e.valor}</span>
                      <span className="text-tinta-suave"> · {porciento(e.valor, totalEstados)} %</span>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </Seccion>
      </div>
      <Seccion id="dias-servicio" titulo="Días promedio por servicio" descripcion="De las órdenes completadas que lo incluyen, de recibida a entregada.">
        {conDias.length ? (
          <ListaProgreso
            etiqueta="Días promedio por servicio"
            inicial={8}
            color="var(--grafico-1)"
            filas={conDias.map((s) => ({ clave: String(s.servicioId), nombre: s.nombre, sub: `${s.veces} ${s.veces === 1 ? "orden" : "órdenes"}`, valor: textoDias(s.diasPromedio ?? 0), parte: porciento(s.diasPromedio ?? 0, conDias[0].diasPromedio ?? 1) }))}
          />
        ) : (
          <SinDatos>Sin órdenes completadas en estas fechas.</SinDatos>
        )}
      </Seccion>
    </>
  );
}
