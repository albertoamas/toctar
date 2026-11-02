import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeftRightIcon, SearchIcon } from "lucide-react";
import { EnlaceVolver } from "@/componentes/enlace-volver";
import { Cargando } from "@/componentes/panel/cargando";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { EstadoVacio } from "@/componentes/panel/estado-vacio";
import { CabeceraSeccion } from "@/componentes/panel/seccion-con-editar";
import { buttonVariants } from "@/componentes/ui/button";
import { fechaEnBolivia } from "@/lib/fechas";
import { exigirAccion } from "@/lib/sesion";
import { formatearWhatsApp } from "@/lib/whatsapp";
import { ElegirCliente } from "@/modulos/clientes/componentes/elegir-cliente";
import { obtenerCliente } from "@/modulos/clientes/consultas";
import { detalleVehiculo } from "@/modulos/clientes/reglas";
import { tamanosActivos } from "@/modulos/configuracion/consultas";
import { FormularioNuevaCotizacion, type ClienteElegido } from "@/modulos/cotizaciones/componentes/formulario-nueva-cotizacion";
import { inicioCotizacion, opcionesPorTamano } from "@/modulos/cotizaciones/consultas";

export const metadata: Metadata = { title: "Nueva cotización" };

// Pedido 23: nueva cotización, sin consulta antes. Primero el cliente: se busca (el buscador de Clientes, HU-22) y se
// elige, o se registra ahí mismo con "Cliente nuevo". La elección va en la dirección (?cliente=, ?nuevo=1): la ficha del
// cliente enlaza acá con el cliente ya elegido, y Atrás vuelve a la búsqueda. Después, en un formulario, el vehículo,
// los servicios con su precio y cómo se cotizó. Cotiza el dueño o el encargado con "Cotizaciones" (pedido 24).
export default function PaginaNuevaCotizacion({ searchParams }: PageProps<"/panel/cotizaciones/nueva">) {
  return (
    <section className="flex max-w-3xl flex-col gap-6">
      <EnlaceVolver href="/panel/cotizaciones">Cotizaciones</EnlaceVolver>
      <EncabezadoPagina titulo="Nueva cotización" />
      <Suspense fallback={<Cargando />}>
        <Contenido searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

/** "Cambiar" o "Buscar un cliente registrado": vuelve a elegir. Enlace sin borde, como "Editar" en las fichas. */
function VolverAElegir({ children }: { children: React.ReactNode }) {
  return (
    <Link href="/panel/cotizaciones/nueva" className={buttonVariants({ variant: "ghost" })}>
      {children}
    </Link>
  );
}

async function Contenido({ searchParams }: Pick<PageProps<"/panel/cotizaciones/nueva">, "searchParams">) {
  await exigirAccion("cotizar");
  const parametros = await searchParams;
  const texto = (clave: string) => (typeof parametros[clave] === "string" ? (parametros[clave] as string) : "");
  const clienteId = Number(texto("cliente"));

  if (Number.isInteger(clienteId) && clienteId > 0) {
    const c = await obtenerCliente(clienteId);
    if (c?.activo) {
      const elegido: ClienteElegido = {
        id: c.id,
        nombre: c.nombre,
        vehiculos: c.vehiculos
          .filter((v) => v.activo)
          .map((v) => ({ id: v.id, placa: v.placa, tamanoId: v.tamanoId, tamano: v.tamano, detalle: detalleVehiculo(v) })),
      };
      return (
        <>
          <section aria-labelledby="cliente-titulo" className="flex flex-col gap-3">
            <CabeceraSeccion id="cliente" titulo="Cliente">
              <VolverAElegir>
                <ArrowLeftRightIcon />
                Cambiar
              </VolverAElegir>
            </CabeceraSeccion>
            <p className="flex flex-col tt-tarjeta-panel p-4">
              <span className="font-semibold">{c.nombre}</span>
              <span className="text-tinta-suave">{formatearWhatsApp(c.telefono)}</span>
            </p>
          </section>
          <Formulario cliente={elegido} />
        </>
      );
    }
  }

  if (texto("nuevo")) {
    return (
      <>
        <CabeceraSeccion id="cliente" titulo="Cliente nuevo">
          <VolverAElegir>
            <SearchIcon />
            Buscar un cliente registrado
          </VolverAElegir>
        </CabeceraSeccion>
        <Formulario cliente={null} />
      </>
    );
  }

  return <ElegirCliente q={texto("q")} hrefCliente={(id) => `/panel/cotizaciones/nueva?cliente=${id}`} hrefNuevo="/panel/cotizaciones/nueva?nuevo=1" />;
}

async function Formulario({ cliente }: { cliente: ClienteElegido | null }) {
  const tamanos = await tamanosActivos();
  // Los precios de cada tamaño activo y de los de sus vehículos (un tamaño desactivado sigue valiendo para un auto que ya lo tiene)
  const [opciones, inicio] = await Promise.all([opcionesPorTamano([...tamanos.map((t) => t.id), ...(cliente?.vehiculos.map((v) => v.tamanoId) ?? [])]), inicioCotizacion()]);
  if (Object.values(opciones).every((o) => o.length === 0)) {
    // El catálogo es del dueño: el encargado no tiene a dónde ir, así que no se enlaza
    return <EstadoVacio>No hay servicios activos para cotizar: se activan en Catálogo y precios.</EstadoVacio>;
  }
  return <FormularioNuevaCotizacion cliente={cliente} tamanos={tamanos} opciones={opciones} inicio={inicio} hoy={fechaEnBolivia()} />;
}
