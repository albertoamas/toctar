import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { cn } from "cn";
import { GlobeIcon } from "lucide-react";
import { EnlaceVolver } from "@/componentes/enlace-volver";
import { AvisoEnPagina } from "@/componentes/panel/aviso-en-pagina";
import { Cargando } from "@/componentes/panel/cargando";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { FichaEditable, SeccionEditable } from "@/componentes/panel/seccion-editable";
import { buttonVariants } from "@/componentes/ui/button";
import { exigirModulo } from "@/lib/sesion";
import { FormularioDatosCatalogo } from "@/modulos/catalogo/componentes/formulario-datos-catalogo";
import { FormularioPrecios } from "@/modulos/catalogo/componentes/formulario-precios";
import { PreciosVariante } from "@/modulos/catalogo/componentes/precios-variante";
import { VariantesServicio } from "@/modulos/catalogo/componentes/variantes-servicio";
import { obtenerServicioCatalogo } from "@/modulos/catalogo/consultas";
import { textoDias } from "@/modulos/catalogo/reglas";

export const metadata: Metadata = { title: "Servicio del catálogo" };

// HU-19 y HU-20: precios, datos y variantes de un servicio. Solo el dueño (RN-01). Una ficha en lectura (pulido 7.3,
// skill pantallas-panel): primero los precios, que es lo que se consulta; cada sección se edita con "Editar", de a una.
// Su página en el sitio (textos y foto) se edita en Sitio web: el enlace lleva ahí.
export default function PaginaServicioCatalogo({ params, searchParams }: PageProps<"/panel/catalogo/[id]">) {
  return (
    <section className="flex flex-col gap-6">
      <EnlaceVolver href="/panel/catalogo">Catálogo y precios</EnlaceVolver>
      <Suspense fallback={<Cargando />}>
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
  const activas = s.listaVariantes.filter((v) => v.activo);
  const desactivadas = s.listaVariantes.length - activas.length;
  // Recién creado y todavía sin precios: se abre a cargar los de su primera variante. Si ya los tiene (se recargó la
  // página con ?creado=1 después de guardarlos), se ve como cualquier ficha
  const primera = s.variantes[0];
  const sinPrecios = !!primera && s.tamanos.length > 0 && s.tamanos.every((t) => primera.precios[t.id] === undefined);
  const abierta = creado && sinPrecios ? `precios-${primera.id}` : null;

  const leerVariantes = (
    <p className="text-tinta-suave">
      {activas.length === 0 ? "Sin variantes: agrega al menos una." : new Intl.ListFormat("es").format(activas.map((v) => v.nombre))}
      {desactivadas > 0 && ` (${desactivadas === 1 ? "1 desactivada" : `${desactivadas} desactivadas`})`}
    </p>
  );

  return (
    <>
      <EncabezadoPagina
        titulo={s.nombre}
        // Sale en el sitio si está activo y su página se muestra (publico.ts pide las dos)
        estado={<span className="tt-insignia">{!s.activo ? "Inactivo" : s.visibleSitio ? "En el sitio" : "Oculto en el sitio"}</span>}
        accion={
          <Link href={`/panel/sitio/servicios/${s.id}`} className={cn(buttonVariants({ variant: "outline" }))}>
            <GlobeIcon />
            Su página en el sitio
          </Link>
        }
      />
      {creado && sinPrecios && <AvisoEnPagina>Servicio creado. Carga sus precios.</AvisoEnPagina>}

      {/* Como la orden: en la computadora, los precios a la izquierda y los datos en un recuadro a la derecha */}
      <FichaEditable abierta={abierta}>
        <div className="grid max-w-6xl grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-start">
          <section aria-labelledby="precios-titulo" className="flex flex-col gap-4">
            <h2 id="precios-titulo" className="font-heading text-2xl font-bold italic">
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
              s.variantes.map((v) => (
                <div key={v.id} className="rounded-sm border border-border p-4">
                  <SeccionEditable
                    id={`precios-${v.id}`}
                    titulo={v.nombre}
                    nivel={3}
                    etiquetaEditar={`Editar precios de ${v.nombre}`}
                    lectura={<PreciosVariante variante={v} tamanos={s.tamanos} duracionServicio={s.duracionDias} />}
                  >
                    <FormularioPrecios variante={v} tamanos={s.tamanos} duracionServicio={s.duracionDias} />
                  </SeccionEditable>
                </div>
              ))
            )}
          </section>

          {/* Acompaña al bajar por los precios, como el logo en Configuración */}
          <aside className="flex flex-col gap-8 rounded-sm border border-border p-4 lg:sticky lg:top-8">
            <SeccionEditable
              id="datos"
              titulo="Datos"
              etiquetaEditar="Editar datos del servicio"
              lectura={
                <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-2">
                  <dt className="text-tinta-suave">Duración</dt>
                  <dd>{textoDias(s.duracionDias)}</dd>
                  <dt className="text-tinta-suave">Mantenimiento</dt>
                  <dd>{s.generaMantenimiento ? "Genera recordatorio" : "No genera recordatorio"}</dd>
                  <dt className="text-tinta-suave">Catálogo</dt>
                  <dd>{s.activo ? "Activo" : "Inactivo: no se cotiza ni sale en el sitio"}</dd>
                </dl>
              }
            >
              <FormularioDatosCatalogo servicio={{ id: s.id, nombre: s.nombre, duracionDias: s.duracionDias, generaMantenimiento: s.generaMantenimiento, activo: s.activo }} />
            </SeccionEditable>
            <SeccionEditable id="variantes-seccion" titulo="Variantes" etiquetaEditar="Editar variantes" lectura={leerVariantes}>
              <VariantesServicio servicioId={s.id} variantes={s.listaVariantes} />
            </SeccionEditable>
          </aside>
        </div>
      </FichaEditable>
    </>
  );
}
