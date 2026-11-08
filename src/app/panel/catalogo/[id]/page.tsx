import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { cn } from "cn";
import { GlobeIcon } from "lucide-react";
import { AvisoFlotante } from "@/componentes/panel/aviso-flotante";
import { Cargando } from "@/componentes/panel/cargando";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { SeccionConEditar } from "@/componentes/panel/seccion-con-editar";
import { buttonVariants } from "@/componentes/ui/button";
import { cantidad } from "@/lib/cantidad";
import { exigirModulo } from "@/lib/sesion";
import { FormularioDatosCatalogo } from "@/modulos/catalogo/componentes/formulario-datos-catalogo";
import { FormularioPrecios } from "@/modulos/catalogo/componentes/formulario-precios";
import { PreciosVariante } from "@/modulos/catalogo/componentes/precios-variante";
import { VariantesServicio } from "@/modulos/catalogo/componentes/variantes-servicio";
import { obtenerServicioCatalogo } from "@/modulos/catalogo/consultas";
import { textoDias } from "@/modulos/catalogo/reglas";
import { textoCadaMeses } from "@/modulos/mantenimientos/reglas";
import { Insignia } from "@/componentes/panel/insignia";

export const metadata: Metadata = { title: "Servicio del catálogo" };

// HU-19 y HU-20: datos, variantes y precios de un servicio. Solo el dueño (RN-01). Una ficha en lectura (pulido 7.3,
// skill pantallas-panel): arriba, datos y variantes lado a lado (el contexto en pocas líneas: cuánto dura y qué
// variantes tiene); debajo, los precios, un recuadro por variante en ese orden (de a dos en la computadora). Cada
// recuadro se edita con "Editar", en un modal.
// Su página en el sitio (textos y foto) se edita en Sitio web: el enlace lleva ahí.
export default function PaginaServicioCatalogo({ params, searchParams }: PageProps<"/panel/catalogo/[id]">) {
  return (
    <section className="flex flex-col gap-6">
      <Suspense fallback={<Cargando volver={{ href: "/panel/catalogo", texto: "Catálogo y precios" }} />}>
        <Detalle params={params} searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

async function Detalle({ params, searchParams }: Pick<PageProps<"/panel/catalogo/[id]">, "params" | "searchParams">) {
  await exigirModulo("catalogo");
  const [{ id }, { creado }] = await Promise.all([params, searchParams]);
  const numero = Number(id);
  if (!Number.isInteger(numero) || numero <= 0) notFound();
  const s = await obtenerServicioCatalogo(numero);
  if (!s) notFound();
  // s.variantes son las activas (con sus precios); listaVariantes, todas
  const desactivadas = s.listaVariantes.length - s.variantes.length;
  // Recién creado y todavía sin precios: se abren los de su primera variante. Si ya los tiene (se recargó la página con
  // ?creado=1 después de guardarlos), se ve como cualquier ficha
  const primera = s.variantes[0];
  const sinPrecios = !!primera && s.tamanos.length > 0 && s.tamanos.every((t) => primera.precios[t.id] === undefined);
  const cargarPrecios = !!creado && sinPrecios;

  return (
    <div className="flex max-w-5xl flex-col gap-8">
      <EncabezadoPagina
        volver={{ href: "/panel/catalogo", texto: "Catálogo y precios" }}
        titulo={s.nombre}
        // Sale en el sitio si está activo y su página se muestra (publico.ts pide las dos)
        estado={<Insignia>{!s.activo ? "Inactivo" : s.visibleSitio ? "En el sitio" : "Oculto en el sitio"}</Insignia>}
        accion={
          <Link href={`/panel/sitio/servicios/${s.id}`} className={cn(buttonVariants({ variant: "outline" }))}>
            <GlobeIcon />
            Su página en el sitio
          </Link>
        }
      />
      {cargarPrecios && <AvisoFlotante mensaje="Servicio creado. Carga sus precios." />}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 md:grid-cols-2 md:gap-4">
        <SeccionConEditar
          id="datos"
          titulo="Datos"
          etiquetaEditar="Editar datos del servicio"
          tituloModal="Datos del servicio"
          lectura={
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-2">
              <dt className="text-tinta-suave">Duración</dt>
              <dd>{textoDias(s.duracionDias)}</dd>
              <dt className="text-tinta-suave">Mantenimiento</dt>
              <dd>
                {!s.mantenimiento
                  ? "No programa mantenimiento"
                  : `${s.mantenimiento.servicioId === s.id ? "Él mismo" : s.mantenimiento.servicio}, ${textoCadaMeses(s.mantenimiento.meses)}`}
              </dd>
              <dt className="text-tinta-suave">Catálogo</dt>
              <dd>{s.activo ? "Activo" : "Inactivo: no se cotiza ni sale en el sitio"}</dd>
            </dl>
          }
        >
          <FormularioDatosCatalogo
            servicio={{ id: s.id, nombre: s.nombre, duracionDias: s.duracionDias, mantenimiento: s.mantenimiento, activo: s.activo }}
            servicios={s.serviciosParaMantenimiento}
          />
        </SeccionConEditar>
        <SeccionConEditar
          id="variantes-seccion"
          titulo="Variantes"
          etiquetaEditar="Editar variantes"
          tituloModal="Variantes"
          lectura={
            <p>
              {s.variantes.length === 0 ? "Sin variantes: agrega al menos una." : new Intl.ListFormat("es").format(s.variantes.map((v) => v.nombre))}
              {desactivadas > 0 && <span className="text-tinta-suave"> ({cantidad(desactivadas, "desactivada", "desactivadas")})</span>}
            </p>
          }
        >
          <VariantesServicio servicioId={s.id} variantes={s.listaVariantes} />
        </SeccionConEditar>
      </div>

      <section aria-labelledby="precios-titulo" className="flex flex-col gap-3">
        <h2 id="precios-titulo" className="flex min-h-11 items-center tt-titulo-seccion">
          Precios
        </h2>
        {s.tamanos.length === 0 ? (
          <p className="text-tinta-suave">
            Faltan los tamaños de vehículo.{" "}
            <Link href="/panel/configuracion/taller" className="font-semibold text-tinta underline">
              Agrégalos en Configuración
            </Link>
            .
          </p>
        ) : (
          <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">
            {s.variantes.map((v) => (
              <SeccionConEditar
                key={v.id}
                id={`precios-${v.id}`}
                titulo={v.nombre}
                nivel={3}
                etiquetaEditar={`Editar precios de ${v.nombre}`}
                tituloModal={`Precios de ${v.nombre}`}
                abierta={cargarPrecios && v.id === primera.id}
                // Sueltos sobre el gris de la página (no dentro de otra tarjeta): blancos
                claseRecuadro="bg-fondo"
                lectura={<PreciosVariante variante={v} tamanos={s.tamanos} duracionServicio={s.duracionDias} />}
              >
                <FormularioPrecios variante={v} tamanos={s.tamanos} duracionServicio={s.duracionDias} />
              </SeccionConEditar>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
