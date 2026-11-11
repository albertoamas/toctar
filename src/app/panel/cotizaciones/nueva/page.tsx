import type { Metadata } from "next";
import { Suspense } from "react";
import { Cargando } from "@/componentes/panel/cargando";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { EstadoVacio } from "@/componentes/panel/estado-vacio";
import { PaginaPanel } from "@/componentes/panel/pagina-panel";
import { PasosFlujo } from "@/componentes/panel/pasos-flujo";
import { fechaEnBolivia } from "@/lib/fechas";
import { exigirAccion } from "@/lib/sesion";
import { ElegirCliente } from "@/modulos/clientes/componentes/elegir-cliente";
import { obtenerCliente } from "@/modulos/clientes/consultas";
import { detalleVehiculo } from "@/modulos/clientes/reglas";
import { tamanosActivos } from "@/modulos/configuracion/consultas";
import { FormularioNuevaCotizacion, type ClienteElegido } from "@/modulos/cotizaciones/componentes/formulario-nueva-cotizacion";
import { inicioCotizacion, opcionesPorTamano } from "@/modulos/cotizaciones/consultas";
import { PASO_CLIENTE, PASOS_NUEVA_COTIZACION } from "@/modulos/cotizaciones/pasos";
import { conDesde, leerDesde, volverDesde } from "@/lib/volver";

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
          .map((v) => ({ id: v.id, placa: v.placa, tamanoId: v.tamanoId, tamano: v.tamano, detalle: detalleVehiculo(v) })),
      };
      return (
        <>
          {encabezado}
          <Formulario cliente={elegido} volver={origen} />
        </>
      );
    }
  }

  if (texto("nuevo"))
    return (
      <>
        {encabezado}
        <Formulario cliente={null} volver={origen} />
      </>
    );

  // Paso 1: elegir el cliente (o "Cliente nuevo", que sigue en el formulario)
  return (
    <>
      {encabezado}
      <PasosFlujo pasos={PASOS_NUEVA_COTIZACION} actual={PASO_CLIENTE} etiqueta="Pasos de la cotización" />
      <ElegirCliente q={texto("q")} hrefCliente={(id) => conDesde(`/panel/cotizaciones/nueva?cliente=${id}`, origen)} hrefNuevo={conDesde("/panel/cotizaciones/nueva?nuevo=1", origen)} />
    </>
  );
}

async function Formulario({ cliente, volver }: { cliente: ClienteElegido | null; volver: string | null }) {
  const tamanos = await tamanosActivos();
  // Los precios de cada tamaño activo y de los de sus vehículos (un tamaño desactivado sigue valiendo para un auto que ya lo tiene)
  const [opciones, inicio] = await Promise.all([opcionesPorTamano([...tamanos.map((t) => t.id), ...(cliente?.vehiculos.map((v) => v.tamanoId) ?? [])]), inicioCotizacion()]);
  if (Object.values(opciones).every((o) => o.length === 0)) {
    // El catálogo es del dueño: el encargado no tiene a dónde ir, así que no se enlaza
    return <EstadoVacio>No hay servicios activos para cotizar: se activan en Catálogo y precios.</EstadoVacio>;
  }
  return <FormularioNuevaCotizacion cliente={cliente} tamanos={tamanos} opciones={opciones} inicio={inicio} hoy={fechaEnBolivia()} volver={volver} />;
}
