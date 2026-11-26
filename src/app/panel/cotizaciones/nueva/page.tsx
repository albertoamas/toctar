import type { Metadata } from "next";
import { Suspense } from "react";
import { Cargando } from "@/componentes/panel/cargando";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { EstadoVacio } from "@/componentes/panel/estado-vacio";
import { PaginaPanel } from "@/componentes/panel/pagina-panel";
import { fechaEnBolivia } from "@/lib/fechas";
import { exigirAccion } from "@/lib/sesion";
import { clientesParaElegir } from "@/modulos/clientes/componentes/elegir-cliente";
import { obtenerCliente } from "@/modulos/clientes/consultas";
import { detalleVehiculo } from "@/modulos/clientes/reglas";
import { tamanosActivos } from "@/modulos/configuracion/consultas";
import { FormularioNuevaCotizacion, type ClienteElegido } from "@/modulos/cotizaciones/componentes/formulario-nueva-cotizacion";
import { inicioCotizacion, opcionesPorTamano } from "@/modulos/cotizaciones/consultas/servicios";
import { leerDesde, volverDesde } from "@/lib/volver";
import { catalogoVehiculos } from "@/modulos/clientes/consultas";

export const metadata: Metadata = { title: "Nueva cotización" };

// Pedido 23: nueva cotización, sin consulta antes. Pedido 40: en tres pasos (Cliente, Vehículo y Servicios y precio,
// etapas/P40-cotizacion-en-pasos.md). Primero el cliente: se busca (el buscador de Clientes, HU-22) y se elige, o se
// registra con "Cliente nuevo". La elección va en la dirección (?cliente=, ?nuevo=1): la ficha del cliente enlaza acá con
// el cliente ya elegido, y Atrás vuelve a la búsqueda. Los pasos siguientes están en FormularioNuevaCotizacion. Cotiza
// el dueño o el encargado con "Cotizaciones" (pedido 24).
const COTIZACIONES = { href: "/panel/cotizaciones", texto: "Cotizaciones" } as const;

export default function PaginaNuevaCotizacion({ searchParams }: PageProps<"/panel/cotizaciones/nueva">) {
  return (
    <PaginaPanel tipo="formulario">
      <Suspense
        fallback={
          <>
            <EncabezadoPagina titulo="Nueva cotización" volver={COTIZACIONES} />
            <Cargando />
          </>
        }
      >
        <Contenido searchParams={searchParams} />
      </Suspense>
    </PaginaPanel>
  );
}

async function Contenido({ searchParams }: Pick<PageProps<"/panel/cotizaciones/nueva">, "searchParams">) {
  const usuario = await exigirAccion("cotizar");
  const parametros = await searchParams;
  const texto = (clave: string) => (typeof parametros[clave] === "string" ? (parametros[clave] as string) : "");
  // Pedido 43: "Volver" a la pantalla de la que se vino; el origen va en cada paso y en el formulario
  const origen = leerDesde(parametros.volver);
  const encabezado = <EncabezadoPagina titulo="Nueva cotización" volver={volverDesde(origen, COTIZACIONES, usuario)} />;
  const clienteId = Number(texto("cliente"));

  if (Number.isInteger(clienteId) && clienteId > 0) {
    const c = await obtenerCliente(clienteId);
    if (c?.activo) {
      const elegido: ClienteElegido = {
        id: c.id,
        nombre: c.nombre,
        telefono: c.telefono,
        vehiculos: c.vehiculos
          .filter((v) => v.activo)
          .map((v) => ({ id: v.id, placa: v.placa, tamanoId: v.tamanoId, tamano: v.tamano, detalle: detalleVehiculo(v), miniatura: v.foto?.miniatura ?? null })),
      };
      return (
        <>
          {encabezado}
          <Formulario cliente={elegido} volver={origen} />
        </>
      );
    }
  }

  // Paso 1 (24/11): en el mismo formulario, la lista de clientes con "Cliente nuevo" que se llena ahí mismo
  const clientes = await clientesParaElegir(texto("q"), true);
  return (
    <>
      {encabezado}
      <Formulario cliente={null} volver={origen} clientes={clientes} nuevoMarcado={!!texto("nuevo")} />
    </>
  );
}

async function Formulario({
  cliente,
  volver,
  clientes,
  nuevoMarcado,
}: {
  cliente: ClienteElegido | null;
  volver: string | null;
  clientes?: Awaited<ReturnType<typeof clientesParaElegir>>;
  nuevoMarcado?: boolean;
}) {
  const [tamanos, catalogo] = await Promise.all([tamanosActivos(), catalogoVehiculos()]);
  // Los precios de cada tamaño activo y de los de sus vehículos (un tamaño desactivado sigue valiendo para un auto que ya lo tiene)
  const [opciones, inicio] = await Promise.all([opcionesPorTamano([...tamanos.map((t) => t.id), ...(cliente?.vehiculos.map((v) => v.tamanoId) ?? [])]), inicioCotizacion()]);
  if (Object.values(opciones).every((o) => o.length === 0)) {
    // El catálogo es del dueño: el encargado no tiene a dónde ir, así que no se enlaza
    return <EstadoVacio>No hay servicios activos para cotizar: se activan en Catálogo y precios.</EstadoVacio>;
  }
  // La key lo rearma si cambia el cliente sin salir de la pantalla ("Usar a …", ya registrado)
  return <FormularioNuevaCotizacion key={cliente?.id} cliente={cliente} tamanos={tamanos} catalogo={catalogo} opciones={opciones} inicio={inicio} hoy={fechaEnBolivia()} volver={volver} clientes={clientes} nuevoMarcado={nuevoMarcado} />;
}
