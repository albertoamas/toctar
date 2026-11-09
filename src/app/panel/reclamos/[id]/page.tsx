import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { cn } from "cn";
import { Seccion } from "@/componentes/panel/cabecera-seccion";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { ListaDatos } from "@/componentes/panel/lista-datos";
import { PaginaPanel } from "@/componentes/panel/pagina-panel";
import { Cargando } from "@/componentes/panel/cargando";
import { IconoWhatsApp } from "@/componentes/sitio/iconos-marca";
import { buttonVariants } from "@/componentes/ui/button";
import { fechaEnBolivia, formatearFecha, formatearFechaHora } from "@/lib/fechas";
import { exigirModulo } from "@/lib/sesion";
import { enlaceWhatsApp, formatearWhatsApp } from "@/lib/whatsapp";
import { AtenderReclamo } from "@/modulos/reclamos/componentes/atender-reclamo";
import { InsigniaEstado } from "@/modulos/reclamos/componentes/estado-reclamo";
import { FotosReclamo } from "@/modulos/reclamos/componentes/fotos-reclamo";
import { obtenerReclamo } from "@/modulos/reclamos/consultas";
import { mensajeAlCliente } from "@/modulos/reclamos/reglas";

export const metadata: Metadata = { title: "Reclamo" };

// HU-17: datos y fotos de un reclamo; escribirle al cliente y marcarlo como atendido. C6 (sistema-del-panel.md §2 y §3):
// las dos acciones en el encabezado ("Marcar como atendido", con su nota en un modal, y "Escribir por WhatsApp" con el
// saludo ya escrito); a la izquierda lo que mandó el cliente (qué pasó y sus fotos), que es lo que se viene a leer; a la
// derecha sus datos y, ya atendido, la atención.
export default function PaginaReclamo({ params }: PageProps<"/panel/reclamos/[id]">) {
  return (
    <PaginaPanel tipo="ficha">
      <Suspense fallback={<Cargando volver={{ href: "/panel/reclamos", texto: "Reclamos" }} />}>
        <Detalle params={params} />
      </Suspense>
    </PaginaPanel>
  );
}

async function Detalle({ params }: Pick<PageProps<"/panel/reclamos/[id]">, "params">) {
  await exigirModulo("reclamos");
  const { id } = await params;
  const numero = Number(id);
  if (!Number.isInteger(numero) || numero <= 0) notFound();
  const r = await obtenerReclamo(numero);
  if (!r) notFound();
  const recibido = formatearFecha(fechaEnBolivia(r.createdAt));

  return (
    <>
      <EncabezadoPagina
        titulo={r.nombre}
        estado={<InsigniaEstado estado={r.estado} />}
        volver={{ href: "/panel/reclamos", texto: "Reclamos" }}
        accion={
          <div className="flex flex-wrap gap-2">
            {r.estado === "pendiente" && <AtenderReclamo id={r.id} />}
            {/* Con cn: sin él, el borde transparente de la base le ganaba al del contorno y no se veía (revisión de botones) */}
            <a href={enlaceWhatsApp(r.telefono, mensajeAlCliente(r.nombre, recibido))} target="_blank" rel="noreferrer" className={cn(buttonVariants({ variant: "outline" }))}>
              <IconoWhatsApp />
              Escribir por WhatsApp
            </a>
          </div>
        }
      />

      <div className="grid items-start gap-8 @4xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex flex-col gap-8">
          <Seccion id="que-paso" titulo="Qué pasó">
            <p className="whitespace-pre-line">{r.descripcion}</p>
          </Seccion>
          <Seccion id="fotos" titulo="Fotos">
            {r.fotos.length > 0 ? <FotosReclamo fotos={r.fotos} /> : <p className="text-tinta-suave">No mandó fotos.</p>}
          </Seccion>
        </div>

        <div className="flex flex-col gap-8">
          <Seccion id="datos" titulo="Datos">
            <ListaDatos
              filas={[
                ["Recibido", formatearFechaHora(r.createdAt)],
                ["WhatsApp", formatearWhatsApp(r.telefono)],
                ["Placa", <span key="placa" className="font-semibold">{r.placa}</span>],
                ["Servicio", r.servicio ?? <span key="servicio" className="text-tinta-suave">No indicó</span>],
                [
                  "Fecha del trabajo",
                  r.fechaAproximada ? `${formatearFecha(r.fechaAproximada)} (aproximada)` : <span key="fecha" className="text-tinta-suave">No la indicó</span>,
                ],
              ]}
            />
          </Seccion>
          {r.estado !== "pendiente" && (
            <Seccion id="atencion" titulo="Atención">
              <div className="flex flex-col gap-1">
                <p className="whitespace-pre-line">{r.notaAtencion}</p>
                <p className="text-sm text-tinta-suave">
                  {r.atendidoPor ?? "Usuario borrado"}
                  {r.atendidoAt && `, ${formatearFechaHora(r.atendidoAt)}`}
                </p>
              </div>
            </Seccion>
          )}
        </div>
      </div>
    </>
  );
}
