import type { Metadata } from "next";
import { nombreVehiculo } from "@/modulos/clientes/reglas";
import Link from "next/link";
import { Suspense } from "react";
import { EnlaceVolver } from "@/componentes/enlace-volver";
import { Cargando } from "@/componentes/panel/cargando";
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
// el cliente ya elegido, y Atrás vuelve a la búsqueda.
export default function PaginaNuevaConsulta({ searchParams }: PageProps<"/panel/consultas/nueva">) {
  return (
    <section className="flex max-w-2xl flex-col gap-6">
      <EnlaceVolver href="/panel/consultas">Consultas</EnlaceVolver>
      <h1 className="font-heading text-4xl font-extrabold italic">Nueva consulta</h1>
      <Suspense fallback={<Cargando />}>
        <Contenido searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

const titulo = "font-heading text-2xl font-bold italic";

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
          <div className="flex flex-col gap-3">
            <h2 className={titulo}>Cliente</h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-sm border border-tinta p-3">
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-semibold">{c.nombre}</span>
                <span className="text-sm text-tinta-suave">{formatearWhatsApp(c.telefono)}</span>
              </span>
              <Link href="/panel/consultas/nueva" className="inline-flex min-h-11 items-center text-sm font-semibold underline">
                Cambiar
              </Link>
            </div>
          </div>
          <Formulario cliente={elegido} />
        </>
      );
    }
  }

  if (texto("nuevo")) {
    return (
      <>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4">
          <h2 className={titulo}>Cliente nuevo</h2>
          <Link href="/panel/consultas/nueva" className="inline-flex min-h-11 items-center text-sm font-semibold underline">
            Buscar un cliente registrado
          </Link>
        </div>
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
