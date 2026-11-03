import type { Metadata } from "next";
import { Suspense } from "react";
import { ImageIcon } from "lucide-react";
import { Cargando } from "@/componentes/panel/cargando";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { EstadoVacio } from "@/componentes/panel/estado-vacio";
import { Pestanas } from "@/componentes/panel/pestanas";
import { TablaLista } from "@/componentes/panel/tabla-lista";
import { fechaEnBolivia, formatearFecha } from "@/lib/fechas";
import { exigirModulo } from "@/lib/sesion";
import { InsigniaEstado } from "@/modulos/reclamos/componentes/estado-reclamo";
import { listarReclamos } from "@/modulos/reclamos/consultas";

export const metadata: Metadata = { title: "Reclamos" };

// HU-17: reclamos que llegan desde el sitio, en una tabla (pedido 26): quién, cuándo, la placa, el servicio, las fotos y
// el estado; toda la fila abre el reclamo. Dueño y encargado con el módulo "reclamos".
export default function PaginaReclamos({ searchParams }: PageProps<"/panel/reclamos">) {
  return (
    <section className="flex max-w-5xl flex-col gap-6">
      <EncabezadoPagina titulo="Reclamos" />
      <Suspense fallback={<Cargando />}>
        <Lista searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

async function Lista({ searchParams }: Pick<PageProps<"/panel/reclamos">, "searchParams">) {
  await exigirModulo("reclamos");
  const { ver } = await searchParams;
  const soloPendientes = ver === "pendientes";
  const reclamos = await listarReclamos(soloPendientes);
  const fecha = (d: Date) => formatearFecha(fechaEnBolivia(d));
  // Cuántos hay por atender, a la vista sin entrar a la pestaña (pulido 5.1). Sale de la misma lista.
  const pendientes = reclamos.filter((r) => r.estado === "pendiente").length;

  return (
    <>
      <Pestanas
        etiqueta="Filtrar reclamos"
        activa={soloPendientes ? "/panel/reclamos?ver=pendientes" : "/panel/reclamos"}
        pestanas={[
          { href: "/panel/reclamos", texto: "Todos" },
          { href: "/panel/reclamos?ver=pendientes", texto: pendientes > 0 ? `Pendientes (${pendientes})` : "Pendientes" },
        ]}
      />
      {reclamos.length === 0 ? (
        <EstadoVacio>
          {soloPendientes ? "No hay reclamos pendientes." : "Todavía no llegó ningún reclamo. Llegan desde la página Garantía y reclamos del sitio."}
        </EstadoVacio>
      ) : (
        <TablaLista
          etiqueta="Reclamos"
          columnas={[
            { titulo: "Nombre", ancho: "minmax(0,1.3fr)", movil: "titulo" },
            { titulo: "Fecha", ancho: "6.5rem", movil: "par" },
            { titulo: "Placa", ancho: "6.5rem", movil: "par" },
            { titulo: "Servicio", ancho: "minmax(0,1.4fr)", movil: "detalle" },
            { titulo: "Fotos", ancho: "5rem", movil: "detalle" },
            { titulo: "Estado", ancho: "7rem", movil: "estado" },
          ]}
          filas={reclamos.map((r) => ({
            href: `/panel/reclamos/${r.id}`,
            celdas: [
              <span key="n" className="font-semibold">
                {r.nombre}
              </span>,
              fecha(r.createdAt),
              <span key="p" className="tt-placa">
                {r.placa}
              </span>,
              // En el celular la celda va sola: dice de qué es; en la tabla, bajo su columna
              r.servicio ?? (
                <span className="text-tinta-suave">
                  <span className="@2xl:hidden">Servicio: no indicó</span>
                  <span className="hidden @2xl:inline">No indicó</span>
                </span>
              ),
              r.fotos > 0 ? (
                <span key="f" className="inline-flex items-center gap-1">
                  <ImageIcon className="size-4 text-tinta-suave" aria-hidden />
                  {r.fotos === 1 ? "1 foto" : `${r.fotos} fotos`}
                </span>
              ) : (
                // En la tabla, para que la columna no quede vacía; en el celular, nada
                <span className="hidden text-tinta-suave @2xl:inline">Sin fotos</span>
              ),
              <InsigniaEstado key="e" estado={r.estado} />,
            ],
          }))}
        />
      )}
    </>
  );
}
