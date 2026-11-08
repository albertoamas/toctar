import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { cn } from "cn";
import { ExternalLinkIcon } from "lucide-react";
import { Cargando } from "@/componentes/panel/cargando";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { Insignia } from "@/componentes/panel/insignia";
import { CabeceraSeccion, SeccionConEditar } from "@/componentes/panel/seccion-con-editar";
import { IconoBeneficio } from "@/componentes/sitio/icono-beneficio";
import { buttonVariants } from "@/componentes/ui/button";
import { puedeVerModulo } from "@/lib/permisos";
import { exigirModulo } from "@/lib/sesion";
import { FotoDeSeccion, FotoServicio } from "@/modulos/sitio/componentes/foto-servicio";
import { FormularioBeneficios, FormularioOpciones, FormularioPasos, FormularioResumen, MasServicio } from "@/modulos/sitio/componentes/formulario-servicio";
import { iconoDe } from "@/modulos/sitio/beneficios";
import { fotosDeSecciones, obtenerServicio, opcionesDelSitio } from "@/modulos/sitio/consultas";

export const metadata: Metadata = { title: "Servicio" };

// HU-07: la página del servicio en el sitio. El nombre, las variantes y los precios son del catálogo ("Más" lleva ahí).
// Pulido 13.19: una ficha que se lee como el sitio y en su orden (arriba, beneficios, cómo lo hacemos, opciones), cada
// parte con su foto al lado y su "Editar" en un modal. Lo que se usa poco (ocultar, la dirección), en "Más".

const VOLVER = { href: "/panel/sitio/servicios", texto: "Servicios" } as const;

export default function PaginaServicio({ params }: PageProps<"/panel/sitio/servicios/[id]">) {
  return (
    <div className="flex max-w-4xl flex-col gap-8">
      <Suspense fallback={<Cargando volver={VOLVER} />}>
        <Detalle params={params} />
      </Suspense>
    </div>
  );
}

/** El texto a todo el ancho y su foto al pie, en una fila compacta: la tarjeta mide lo que su texto (pulido 13.19). */
const CON_FOTO = "flex flex-col gap-4";

async function Detalle({ params }: Pick<PageProps<"/panel/sitio/servicios/[id]">, "params">) {
  const usuario = await exigirModulo("sitio");
  const { id } = await params;
  const numero = Number(id);
  if (!Number.isInteger(numero) || numero <= 0) notFound();
  const [s, fotos, opciones] = await Promise.all([obtenerServicio(numero), fotosDeSecciones(numero), opcionesDelSitio(numero)]);
  if (!s) notFound();
  const enElSitio = s.activo && s.visible;
  // Sin opciones en el catálogo, "Opciones" no sale en el sitio (pulido 13.2): no se ofrece. Si ya tenía una foto, queda
  // a la vista con su aviso, para poder quitarla
  const conOpciones = opciones.length > 0;

  return (
    <>
      <EncabezadoPagina
        titulo={s.nombre}
        volver={VOLVER}
        estado={
          !s.activo ? (
            <Insignia tono="aviso">Inactivo en el catálogo</Insignia>
          ) : s.visible ? (
            <Insignia tono="exito">En el sitio</Insignia>
          ) : (
            <Insignia>Oculto</Insignia>
          )
        }
        accion={
          <div className="flex flex-wrap gap-2">
            {enElSitio && (
              <a href={`/servicios/${s.slug}`} target="_blank" rel="noopener" className={cn(buttonVariants({ variant: "outline" }))}>
                <ExternalLinkIcon />
                Ver en el sitio
              </a>
            )}
            <MasServicio id={s.id} slug={s.slug} visible={s.visible} catalogo={puedeVerModulo(usuario, "catalogo")} />
          </div>
        }
      >
        {/* Llegó por un enlace viejo: la lista del sitio ya no lo muestra */}
        {!s.activo && "No sale en el sitio mientras esté inactivo en el catálogo."}
      </EncabezadoPagina>

      <SeccionConEditar
        id="arriba"
        titulo="Arriba de la página"
        etiquetaEditar="Editar resumen"
        tituloModal="Resumen"
        lectura={
          <div className={CON_FOTO}>
            {s.resumen ? <p>{s.resumen}</p> : <p className="text-tinta-suave">Sin resumen: escríbelo para poder mostrar el servicio en el sitio.</p>}
            <FotoServicio servicioId={s.id} nombre={s.nombre} foto={s.foto} />
          </div>
        }
      >
        <FormularioResumen id={s.id} resumen={s.resumen} />
      </SeccionConEditar>

      <SeccionConEditar
        id="beneficios"
        titulo="Beneficios"
        etiquetaEditar="Editar beneficios"
        tituloModal="Beneficios"
        lectura={
          s.beneficios.length > 0 ? (
            <ul className="grid gap-3 sm:grid-cols-2">
              {s.beneficios.map((b, i) => (
                <li key={i} className="flex items-center gap-3">
                  <IconoBeneficio icono={iconoDe(b.icono)} className="size-6 shrink-0 text-rojo" />
                  {b.texto}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-tinta-suave">Sin beneficios: la fila de íconos no sale en el sitio.</p>
          )
        }
      >
        <FormularioBeneficios id={s.id} beneficios={s.beneficios} />
      </SeccionConEditar>

      <SeccionConEditar
        id="proceso"
        titulo="Cómo lo hacemos"
        etiquetaEditar="Editar pasos"
        tituloModal="Cómo lo hacemos"
        lectura={
          <div className={CON_FOTO}>
            {s.pasos.length > 0 ? (
              <ol className="flex flex-col gap-3">
                {s.pasos.map((p, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="w-5 shrink-0 text-right text-tinta-suave tabular-nums">{i + 1}.</span>
                    <span className="flex flex-col">
                      <span className="font-semibold">{p.titulo}</span>
                      {p.detalle && <span className="text-sm text-tinta-suave">{p.detalle}</span>}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-tinta-suave">Sin pasos: esta sección no sale en el sitio.</p>
            )}
            <FotoDeSeccion servicioId={s.id} seccion="proceso" foto={fotos.proceso} />
          </div>
        }
      >
        <FormularioPasos id={s.id} pasos={s.pasos} />
      </SeccionConEditar>

      {conOpciones ? (
        <SeccionConEditar
          id="opciones"
          titulo="Opciones"
          etiquetaEditar="Editar cómo se ven las opciones"
          tituloModal="Opciones"
          lectura={
            <div className={CON_FOTO}>
              <div className="flex flex-col gap-2">
                <p>{s.opcionesEnEscalera ? "Como escalones, de menor a mayor:" : "En recuadros:"} {opciones.map((o) => o.nombre).join(", ")}.</p>
                <p className="text-sm text-tinta-suave">Las opciones y sus precios se cargan en el catálogo.</p>
              </div>
              <FotoDeSeccion servicioId={s.id} seccion="opciones" foto={fotos.opciones} />
            </div>
          }
        >
          <FormularioOpciones id={s.id} escalera={s.opcionesEnEscalera} />
        </SeccionConEditar>
      ) : (
        fotos.opciones && (
          <section aria-labelledby="opciones-titulo" className="flex flex-col gap-2">
            <CabeceraSeccion id="opciones" titulo="Opciones" />
            <div className={cn("tt-tarjeta-panel p-4", CON_FOTO)}>
              <p className="text-tinta-suave">No se ve: el servicio no tiene opciones en el catálogo. Su foto puedes quitarla.</p>
              <FotoDeSeccion servicioId={s.id} seccion="opciones" foto={fotos.opciones} />
            </div>
          </section>
        )
      )}
    </>
  );
}
