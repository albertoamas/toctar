import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { cn } from "cn";
import { PlusIcon } from "lucide-react";
import { Cargando } from "@/componentes/panel/cargando";
import { EstadoVacio } from "@/componentes/panel/estado-vacio";
import { buttonVariants } from "@/componentes/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/componentes/ui/table";
import { exigirModulo } from "@/lib/sesion";
import { formatearWhatsApp } from "@/lib/whatsapp";
import { listarClientes } from "@/modulos/clientes/consultas";

export const metadata: Metadata = { title: "Clientes" };

// HU-21 y HU-22: lista de clientes. Dueño o encargado con el permiso "clientes"; el técnico nunca (RN-12).
export default function PaginaClientes() {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-heading text-4xl font-extrabold italic">Clientes</h1>
        {/* Enlace con forma de botón: lleva a otra pantalla */}
        <Link href="/panel/clientes/nuevo" className={cn(buttonVariants())}>
          <PlusIcon />
          Agregar cliente
        </Link>
      </div>
      <Suspense fallback={<Cargando />}>
        <Lista />
      </Suspense>
    </section>
  );
}

async function Lista() {
  await exigirModulo("clientes");
  const clientes = await listarClientes();
  if (clientes.length === 0) return <EstadoVacio>Todavía no hay clientes. Agrega el primero con «Agregar cliente».</EstadoVacio>;

  return (
    <>
      {/* Celular: tarjetas que se tocan enteras */}
      <ul aria-label="Clientes" className="flex flex-col gap-2 md:hidden">
        {clientes.map((c) => (
          <li key={c.id}>
            <Link href={`/panel/clientes/${c.id}`} className="flex flex-col gap-0.5 rounded-sm border border-border p-4 hover:bg-superficie">
              <span className="truncate font-semibold">{c.nombre}</span>
              <span className="flex flex-wrap gap-x-3 text-sm text-tinta-suave">
                <span className="whitespace-nowrap">{formatearWhatsApp(c.telefono)}</span>
                {c.placas.map((p) => (
                  <span key={p} className="whitespace-nowrap">{p}</span>
                ))}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {/* Computadora: tabla con la fila entera tocable */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>WhatsApp</TableHead>
              <TableHead>Vehículos</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clientes.map((c) => (
              <TableRow key={c.id} className="relative">
                <TableCell>
                  <Link href={`/panel/clientes/${c.id}`} className="font-semibold after:absolute after:inset-0 hover:underline">
                    {c.nombre}
                  </Link>
                </TableCell>
                <TableCell>{formatearWhatsApp(c.telefono)}</TableCell>
                <TableCell>{c.placas.length > 0 ? c.placas.join(", ") : <span className="text-tinta-suave">Sin vehículos</span>}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
