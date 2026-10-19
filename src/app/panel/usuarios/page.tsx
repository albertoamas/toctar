import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { cn } from "cn";
import { PlusIcon } from "lucide-react";
import { AvisoEnPagina } from "@/componentes/panel/aviso-en-pagina";
import { EstadoVacio } from "@/componentes/panel/estado-vacio";
import { Cargando } from "@/componentes/panel/cargando";
import { buttonVariants } from "@/componentes/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/componentes/ui/table";
import { exigirModulo } from "@/lib/sesion";
import { listarUsuarios } from "@/modulos/usuarios/consultas";
import { NOMBRE_ROL } from "@/modulos/usuarios/textos";

export const metadata: Metadata = { title: "Usuarios" };

// HU-02: lista de usuarios. Solo el dueño (módulo "usuarios").
export default function PaginaUsuarios({ searchParams }: PageProps<"/panel/usuarios">) {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-heading text-4xl font-extrabold italic">Usuarios</h1>
        {/* Enlace con forma de botón: lleva a otra pantalla, así que se anuncia como enlace (un Button con render de Link se anunciaba como botón) */}
        <Link href="/panel/usuarios/nuevo" className={cn(buttonVariants())}>
          <PlusIcon />
          Agregar usuario
        </Link>
      </div>
      <Suspense fallback={<Cargando />}>
        <Lista searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

async function Lista({ searchParams }: Pick<PageProps<"/panel/usuarios">, "searchParams">) {
  const yo = await exigirModulo("usuarios");
  const [usuarios, { creado }] = await Promise.all([listarUsuarios(), searchParams]);
  const otros = usuarios.filter((u) => String(u.id) !== yo.id);

  return (
    <>
      {typeof creado === "string" && (
        <AvisoEnPagina>Usuario {creado} creado. Pásale su usuario y contraseña.</AvisoEnPagina>
      )}

      {otros.length === 0 && (
        <EstadoVacio>Todavía no hay otros usuarios. Agrega uno para cada persona del taller.</EstadoVacio>
      )}

      {/* Celular: tarjetas */}
      <ul className="flex flex-col gap-2 md:hidden">
        {usuarios.map((u) => (
          <li key={u.id}>
            <Link href={`/panel/usuarios/${u.id}`} className="flex items-center justify-between gap-3 rounded-sm border border-border p-4 hover:bg-superficie">
              {/* "(tú)" como en la tabla, y el usuario y el rol sin partirse (pulido 5.3) */}
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-semibold">
                  {u.nombre}
                  {String(u.id) === yo.id && <span className="ml-2 font-normal text-tinta-suave">(tú)</span>}
                </span>
                <span className="flex flex-wrap gap-x-3 text-sm text-tinta-suave">
                  <span className="break-all">{u.usuario}</span>
                  <span className="whitespace-nowrap">{NOMBRE_ROL[u.rol]}</span>
                </span>
              </span>
              <Estado desactivado={u.desactivado} />
            </Link>
          </li>
        ))}
      </ul>

      {/* Computadora: tabla */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {usuarios.map((u) => (
              <TableRow key={u.id} className="relative">
                <TableCell>
                  {/* El enlace cubre toda la fila, como en Reclamos (pulido 5.3) */}
                  <Link href={`/panel/usuarios/${u.id}`} className="font-semibold after:absolute after:inset-0 hover:underline">
                    {u.nombre}
                  </Link>
                  {String(u.id) === yo.id && <span className="ml-2 text-sm text-tinta-suave">(tú)</span>}
                </TableCell>
                <TableCell>{u.usuario}</TableCell>
                <TableCell>{NOMBRE_ROL[u.rol]}</TableCell>
                <TableCell>
                  <Estado desactivado={u.desactivado} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

function Estado({ desactivado }: { desactivado: boolean }) {
  return desactivado ? (
    <span className="tt-insignia">Desactivado</span>
  ) : (
    <span className="tt-insignia tt-insignia--exito">Activo</span>
  );
}
