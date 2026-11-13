import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AvisoFlotante } from "@/componentes/panel/aviso-flotante";
import { Cargando } from "@/componentes/panel/cargando";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { PaginaPanel } from "@/componentes/panel/pagina-panel";
import { CabeceraSeccion } from "@/componentes/panel/cabecera-seccion";
import { MenuMas } from "@/componentes/panel/menu-mas";
import { SeccionConEditar } from "@/componentes/panel/seccion-con-editar";
import { cantidad } from "@/lib/cantidad";
import { exigirModulo } from "@/lib/sesion";
import { FormularioDatosCatalogo } from "@/modulos/catalogo/componentes/formulario-datos-catalogo";
import { PreciosServicio } from "@/modulos/catalogo/componentes/precios-servicio";
import { EditarVariantes } from "@/modulos/catalogo/componentes/variantes-servicio";
import { obtenerServicioCatalogo } from "@/modulos/catalogo/consultas";
import { textoDias } from "@/modulos/catalogo/reglas";
import { FilaDato } from "@/componentes/panel/datos-en-bloques";
import { Insignia } from "@/componentes/panel/insignia";
import { aqui, conDesde, volverDesde } from "@/lib/volver";

export const metadata: Metadata = { title: "Servicio del catálogo" };

// HU-19 y HU-20: datos, variantes y precios de un servicio. Solo el dueño (RN-01). Una ficha en lectura (pulido 7.3,
// skill pantallas-panel): arriba, los datos (cuánto dura y qué mantenimiento programa); debajo, los precios
// (PreciosServicio, pulido 13.57: una tabla en la computadora y píldoras por variante en el celular), cada variante con su
// "Editar" en un modal. Las variantes se editan
// desde el título de Precios: sus nombres ya son los de cada recuadro (inventario-pantallas.md, cambio 4b: tenían su
// propia tarjeta, que los repetía).
// Su página en el sitio (textos y foto) se edita en Sitio web: "Más" lleva ahí.
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
  const usuario = await exigirModulo("catalogo");
  const [{ id }, busqueda] = await Promise.all([params, searchParams]);
  const { creado } = busqueda;
  const numero = Number(id);
  if (!Number.isInteger(numero) || numero <= 0) notFound();
  const s = await obtenerServicioCatalogo(numero);
  if (!s) notFound();
  // Pedido 43: "Volver" al Catálogo (con "Inactivos") o a su página del sitio si se vino de ahí
  const volver = volverDesde(busqueda.volver, { href: "/panel/catalogo", texto: "Catálogo y precios" }, usuario);
  const desdeAqui = aqui(`/panel/catalogo/${s.id}`, busqueda);
  // s.variantes son las activas (con sus precios); listaVariantes, todas
  const desactivadas = s.listaVariantes.length - s.variantes.length;
  // Recién creado y todavía sin precios: se abren los de su primera variante. Si ya los tiene (se recargó la página con
  // ?creado=1 después de guardarlos), se ve como cualquier ficha
  const primera = s.variantes[0];
  const sinPrecios = !!primera && s.tamanos.length > 0 && s.tamanos.every((t) => primera.precios[t.id] === undefined);
  const cargarPrecios = !!creado && sinPrecios;

  return (
    <PaginaPanel tipo="ficha">
      <EncabezadoPagina
        volver={volver}
        titulo={s.nombre}
        // Solo lo que pide atención (pulido 13.57, como en la lista): inactivo, u oculto en el sitio. Sale en el sitio si
        // está activo y su página se muestra (publico.ts pide las dos)
        estado={!s.activo ? <Insignia>Inactivo</Insignia> : !s.visibleSitio ? <Insignia>Oculto en el sitio</Insignia> : undefined}
        // Su página del sitio se edita poco desde aquí: en "Más", y el título con todo el ancho en el celular
        accion={<MenuMas acciones={[{ texto: "Su página en el sitio", href: conDesde(`/panel/sitio/servicios/${s.id}`, desdeAqui), mismaPestana: true }]} />}
      />
      {cargarPrecios && <AvisoFlotante mensaje="Servicio creado. Carga sus precios." />}

      <SeccionConEditar
        id="datos"
        titulo="Datos"
        etiquetaEditar="Editar datos del servicio"
        tituloModal="Datos del servicio"
        // En bloques, como los Datos de la orden (DatosEnBloques; pulido 13.57: era una lista con todo en una línea, "Él mismo,
        // cada 3 meses"). Lo que decide, en negrita
        claseRecuadro="gap-0 p-0"
        lectura={
          <div role="group" aria-label="Datos del servicio" className="flex flex-col divide-y divide-border">
            <dl className="px-4 py-3">
              <FilaDato etiqueta="Duración">
                <span className="font-semibold">{textoDias(s.duracionDias)}</span>
              </FilaDato>
            </dl>
            <div className="flex flex-col gap-2 px-4 py-3">
              <p className="text-sm font-semibold text-tinta-suave">Mantenimiento</p>
              {s.mantenimiento ? (
                <dl className="flex flex-col gap-2">
                  <FilaDato etiqueta="Servicio">
                    <span className="font-semibold">{s.mantenimiento.servicioId === s.id ? "Él mismo" : s.mantenimiento.servicio}</span>
                  </FilaDato>
                  <FilaDato etiqueta="Cada">
                    <span className="font-semibold">{cantidad(s.mantenimiento.meses, "mes", "meses")}</span>
                  </FilaDato>
                </dl>
              ) : (
                <p>No programa mantenimiento.</p>
              )}
            </div>
            {/* Solo lo que pide atención: activo, no dice nada (como en la lista, pulido 7.1) */}
            {!s.activo && (
              <dl className="px-4 py-3">
                <FilaDato etiqueta="Catálogo">
                  <span className="font-semibold">Inactivo</span>
                  <span className="text-sm text-tinta-suave">No se cotiza ni sale en el sitio.</span>
                </FilaDato>
              </dl>
            )}
          </div>
        }
      >
        <FormularioDatosCatalogo
          servicio={{ id: s.id, nombre: s.nombre, duracionDias: s.duracionDias, mantenimiento: s.mantenimiento, activo: s.activo }}
          servicios={s.serviciosParaMantenimiento}
        />
      </SeccionConEditar>

      {s.variantes.length > 0 && s.tamanos.length > 0 ? (
        // Los precios (pulido 13.57): con su título, "Editar variantes" y, con varias, "Editar precios"
        <PreciosServicio
          variantes={s.variantes}
          tamanos={s.tamanos}
          duracionServicio={s.duracionDias}
          abrirPrimera={cargarPrecios}
          acciones={<EditarVariantes servicioId={s.id} variantes={s.listaVariantes} />}
          nota={desactivadas > 0 && <VariantesDesactivadas cuantas={desactivadas} />}
        />
      ) : (
        <section aria-labelledby="precios-titulo" className="flex flex-col gap-3">
          <CabeceraSeccion id="precios" titulo="Precios">
            <EditarVariantes servicioId={s.id} variantes={s.listaVariantes} />
          </CabeceraSeccion>
          {s.variantes.length === 0 ? (
            <p className="text-tinta-suave">
              {desactivadas > 0 ? "Sin variantes activas: reactiva una en «Editar variantes»." : "Sin variantes: agrega al menos una en «Editar variantes»."}
            </p>
          ) : (
            <p className="text-tinta-suave">
              {/* Sin tamaños no hay precios: las variantes se nombran aquí */}
              {new Intl.ListFormat("es").format(s.variantes.map((v) => v.nombre))}.{" "}
              Faltan los tamaños de vehículo.{" "}
              <Link href="/panel/configuracion/taller" className="font-semibold text-tinta underline">
                Agrégalos en Configuración
              </Link>
              .
            </p>
          )}
        </section>
      )}
    </PaginaPanel>
  );
}

/** Las desactivadas no tienen columna ni tarjeta: se dice cuántas hay, así no parece que se perdieron. */
function VariantesDesactivadas({ cuantas }: { cuantas: number }) {
  return (
    <p className="-mt-2 text-sm text-tinta-suave">
      {cantidad(cuantas, "variante desactivada", "variantes desactivadas")}: se reactiva{cuantas > 1 && "n"} en «Editar variantes».
    </p>
  );
}
