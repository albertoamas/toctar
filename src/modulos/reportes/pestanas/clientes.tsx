import "server-only";
import { FileCheckIcon, RepeatIcon, UserPlusIcon, UsersIcon } from "lucide-react";
import { Seccion } from "@/componentes/panel/cabecera-seccion";
import { formatearWhatsApp } from "@/lib/whatsapp";
import { clientesQueMasPagaron } from "../calculos";
import { clientesPorId } from "../datos";
import { elTallerEntre } from "../consultas";
import { Dona, GraficoSerie, ListaProgreso } from "../componentes/graficos";
import { bsRedondo } from "../reglas";
import { Cambio, cambioDe, Indicadores, porciento, puntosDe, SinDatos, type Cargado } from "./comun";

// Clientes (Reportes v2, 19/11): cuántos se atendieron (con una orden completada), cuántos eran nuevos y cuántos
// volvieron, y qué parte de las cotizaciones se aceptó. Los que más pagaron, nuevos frente a los que volvieron y los
// atendidos por tramo.

export async function Clientes({ c }: { c: Cargado }) {
  const { act, ant, periodo } = c;
  const vs = periodo.vs;
  const ranking = clientesQueMasPagaron(c.datos.cobros);
  const [datos, cotAct, cotAnt] = await Promise.all([
    clientesPorId(ranking.map((r) => r.clienteId)),
    elTallerEntre(periodo.inicio, periodo.fin),
    elTallerEntre(periodo.antes.inicio, periodo.antes.fin),
  ]);
  const volvieron = act.clientes ? act.volvieron / act.clientes : null;
  const volvieronAntes = ant.clientes ? ant.volvieron / ant.clientes : null;
  const aceptadas = cotAct.cotizaciones.enviadas ? cotAct.cotizaciones.aceptadas / cotAct.cotizaciones.enviadas : null;
  const aceptadasAntes = cotAnt.cotizaciones.enviadas ? cotAnt.cotizaciones.aceptadas / cotAnt.cotizaciones.enviadas : null;
  const puntos = (a: number | null, b: number | null) => (a === null || b === null ? null : Math.round((a - b) * 100));
  return (
    <>
      <Indicadores
        etiqueta="Clientes del período"
        items={[
          { icono: UsersIcon, titulo: "Clientes atendidos", valor: String(act.clientes), nota: <Cambio cambio={cambioDe(act.clientes, ant.clientes)} contra={vs} /> },
          { icono: UserPlusIcon, titulo: "Nuevos", valor: String(act.nuevos), nota: <Cambio cambio={cambioDe(act.nuevos, ant.nuevos)} contra={vs} /> },
          { icono: RepeatIcon, titulo: "Volvieron", valor: volvieron === null ? "—" : `${Math.round(volvieron * 100)} %`, nota: <Cambio cambio={puntos(volvieron, volvieronAntes)} unidad="pts" contra={vs} /> },
          {
            icono: FileCheckIcon,
            titulo: "Cotizaciones aceptadas",
            valor: aceptadas === null ? "—" : `${Math.round(aceptadas * 100)} %`,
            nota: aceptadas === null ? "Ninguna enviada" : <Cambio cambio={puntos(aceptadas, aceptadasAntes)} unidad="pts" contra={vs} sinCambio={`${cotAct.cotizaciones.aceptadas} de ${cotAct.cotizaciones.enviadas}`} />,
          },
        ]}
      />
      <div className="grid gap-x-4 gap-y-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Seccion id="mas-pagaron" titulo="Clientes que más pagaron" descripcion="Por lo cobrado en el período.">
          {ranking.length ? (
            <ListaProgreso
              etiqueta="Clientes que más pagaron"
              ranking
              color="var(--grafico-1)"
              filas={ranking.map((r) => {
                const d = datos.get(r.clienteId);
                return { clave: String(r.clienteId), nombre: d?.nombre ?? "Cliente", sub: d ? formatearWhatsApp(d.telefono) : undefined, valor: bsRedondo(r.total), extra: `${r.ordenes} ${r.ordenes === 1 ? "orden" : "órdenes"}`, parte: porciento(r.total, ranking[0].total) };
              })}
            />
          ) : (
            <SinDatos>Sin cobros en estas fechas.</SinDatos>
          )}
        </Seccion>
        <Seccion id="nuevos-volvieron" titulo="Nuevos y que volvieron" descripcion="Los clientes atendidos en el período.">
          {act.clientes === 0 ? (
            <SinDatos>Sin clientes atendidos en estas fechas.</SinDatos>
          ) : (
            <div className="flex flex-col items-center gap-5">
              <div className="w-48">
                <Dona
                  formato="cantidad"
                  porciones={[
                    { nombre: "Volvieron", valor: act.volvieron, color: "var(--grafico-1)" },
                    { nombre: "Nuevos", valor: act.nuevos, color: "var(--grafico-2)" },
                  ]}
                  centro={String(act.clientes)}
                  centroTexto={act.clientes === 1 ? "cliente" : "clientes"}
                />
              </div>
              <dl className="flex w-full flex-col text-sm">
                {[
                  { nombre: "Volvieron", valor: act.volvieron, color: "var(--grafico-1)" },
                  { nombre: "Nuevos", valor: act.nuevos, color: "var(--grafico-2)" },
                ].map((e, i) => (
                  <div key={e.nombre} className={`flex justify-between gap-3 py-2 ${i ? "border-t border-border/60" : ""}`}>
                    <dt className="flex items-center gap-2">
                      <span aria-hidden className="size-2.5 rounded-[3px]" style={{ background: e.color }} />
                      {e.nombre}
                    </dt>
                    <dd className="tabular-nums">
                      <span className="font-semibold">{e.valor}</span>
                      <span className="text-tinta-suave"> · {porciento(e.valor, act.clientes)} %</span>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </Seccion>
      </div>
      <Seccion id="atendidos-tramo" titulo={`Clientes atendidos ${c.por}`} descripcion="Clientes distintos con una orden completada.">
        {act.clientes === 0 || !c.tramos.length ? <SinDatos>Sin clientes atendidos en estas fechas.</SinDatos> : <GraficoSerie formato="cantidad" series={[{ nombre: "Clientes", color: "var(--grafico-1)", area: true }]} puntos={puntosDe(c, (p) => [p.clientes])} />}
      </Seccion>
    </>
  );
}
