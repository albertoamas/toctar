import type { Metadata } from "next";
import { Suspense } from "react";
import { ImageIcon } from "lucide-react";
import { Cargando } from "@/componentes/panel/cargando";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { EstadoVacio } from "@/componentes/panel/estado-vacio";
import { PaginaPanel } from "@/componentes/panel/pagina-panel";
import { Pestanas } from "@/componentes/panel/pestanas";
import { TablaLista } from "@/componentes/panel/tabla-lista";
import { fechaEnBolivia, formatearFecha } from "@/lib/fechas";
import { exigirModulo } from "@/lib/sesion";
import { InsigniaEstado } from "@/modulos/reclamos/componentes/estado-reclamo";
import { listarReclamos } from "@/modulos/reclamos/consultas";

export const metadata: Metadata = { title: "Reclamos" };

// HU-17: reclamos que llegan desde el sitio, en una tabla (pedido 26): quién, cuándo, la placa, el servicio, las fotos y
// el estado; toda la fila abre el reclamo. Dueño y encargado con el módulo "reclamos". Abre en "Pendientes", lo que hay que
// atender, como Cotizaciones (inventario-pantallas.md, cambio 4d); "Todos", con `?ver=todos`.
export default function PaginaReclamos({ searchParams }: PageProps<"/panel/reclamos">) {
  return (
    <PaginaPanel tipo="lista">
      <EncabezadoPagina titulo="Reclamos" />
      <Suspense fallback={<Cargando />}>
        <Lista searchParams={searchParams} />
      </Suspense>
    </PaginaPanel>
  );
}

async function Lista({ searchParams }: Pick<PageProps<"/panel/reclamos">, "searchParams">) {
  await exigirModulo("reclamos");
  const { ver } = await searchParams;
  // Un enlace viejo con `?ver=pendientes` también abre los pendientes
  const soloPendientes = ver !== "todos";
  const reclamos = await listarReclamos(soloPendientes);
  const fecha = (d: Date) => formatearFecha(fechaEnBolivia(d));
  // Cuántos hay por atender, a la vista en su pestaña (pulido 5.1). Sale de la misma lista.
  const pendientes = soloPendientes ? reclamos.length : reclamos.filter((r) => r.estado === "pendiente").length;

  return (
    <>
      <Pestanas
        etiqueta="Filtrar reclamos"
        activa={soloPendientes ? "/panel/reclamos" : "/panel/reclamos?ver=todos"}
        pestanas={[
          { href: "/panel/reclamos", texto: "Pendientes", cuenta: pendientes },
          { href: "/panel/reclamos?ver=todos", texto: "Todos" },
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
            // Solo si alguno trae fotos: sin ninguna, era una columna vacía (inventario-pantallas.md, cambio 4d)
            { titulo: "Fotos", ancho: "5rem", movil: "detalle", ocultarSiVacia: true },
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
              // Sin fotos, nada: "Sin fotos" en cada fila no decía nada
              r.fotos > 0 ? (
                <span key="f" className="inline-flex items-center gap-1">
                  <ImageIcon className="size-4 text-tinta-suave" aria-hidden />
                  {r.fotos === 1 ? "1 foto" : `${r.fotos} fotos`}
                </span>
              ) : null,
              <InsigniaEstado key="e" estado={r.estado} />,
            ],
          }))}
        />
      )}
    </>
  );
}
