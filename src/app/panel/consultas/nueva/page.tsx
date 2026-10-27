import type { Metadata } from "next";
import { nombreVehiculo } from "@/modulos/clientes/reglas";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeftRightIcon, SearchIcon } from "lucide-react";
import { EnlaceVolver } from "@/componentes/enlace-volver";
import { Cargando } from "@/componentes/panel/cargando";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { CabeceraSeccion } from "@/componentes/panel/seccion-con-editar";
import { buttonVariants } from "@/componentes/ui/button";
import { exigirModulo } from "@/lib/sesion";
import { formatearWhatsApp } from "@/lib/whatsapp";
import { ElegirCliente } from "@/modulos/clientes/componentes/elegir-cliente";
import { obtenerCliente } from "@/modulos/clientes/consultas";
import { tamanosActivos } from "@/modulos/configuracion/consultas";
import { FormularioConsulta, type ClienteElegido } from "@/modulos/consultas/componentes/formulario-consulta";
import { opcionesServicio } from "@/modulos/sitio/consultas";

export const metadata: Metadata = { title: "Nueva consulta" };

// HU-24: nueva consulta. Primero el cliente: se busca (el buscador de Clientes, HU-22) y se elige, o se registra ahí
// mismo con "Cliente nuevo". La elección va en la dirección (?cliente=, ?nuevo=1): la ficha del cliente enlaza acá con
// el cliente ya elegido, y Atrás vuelve a la búsqueda. Pulido 9.2: el cliente elegido en un recuadro de lectura con
// "Cambiar" en su cabecera (como "Editar" en las fichas) y "Registrar consulta" fijo abajo en el celular.
export default function PaginaNuevaConsulta({ searchParams }: PageProps<"/panel/consultas/nueva">) {
  return (
    <section className="flex max-w-2xl flex-col gap-6">
      <EnlaceVolver href="/panel/consultas">Consultas</EnlaceVolver>
      <EncabezadoPagina titulo="Nueva consulta" />
      <Suspense fallback={<Cargando />}>
        <Contenido searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

/** "Cambiar" o "Buscar un cliente registrado": vuelve a elegir. Enlace sin borde, como "Editar" en las fichas. */
function VolverAElegir({ children }: { children: React.ReactNode }) {
  return (
    <Link href="/panel/consultas/nueva" className={buttonVariants({ variant: "ghost" })}>
      {children}
    </Link>
  );
}

async function Contenido({ searchParams }: Pick<PageProps<"/panel/consultas/nueva">, "searchParams">) {
  await exigirModulo("consultas");
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
          .map((v) => ({ id: v.id, placa: v.placa, detalle: [v.tamano, nombreVehiculo(v), v.color ?? ""].filter(Boolean) })),
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
            <p className="flex flex-col rounded-sm border border-border p-4">
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

  return <ElegirCliente q={texto("q")} hrefCliente={(id) => `/panel/consultas/nueva?cliente=${id}`} hrefNuevo="/panel/consultas/nueva?nuevo=1" />;
}

async function Formulario({ cliente }: { cliente: ClienteElegido | null }) {
  const [tamanos, servicios] = await Promise.all([tamanosActivos(), opcionesServicio()]);
  return <FormularioConsulta cliente={cliente} tamanos={tamanos} servicios={servicios} />;
}
