import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CheckCircle2Icon, PlusIcon } from "lucide-react";
import { Button } from "@/componentes/ui/button";
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
        <Button nativeButton={false} render={<Link href="/panel/usuarios/nuevo" />}>
          <PlusIcon />
          Crear usuario
        </Button>
      </div>
      <Suspense fallback={<p className="text-tinta-suave">Cargando usuarios…</p>}>
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
        <p role="status" className="flex items-center gap-2 rounded-sm border border-border bg-superficie p-3 text-sm">
          <CheckCircle2Icon className="size-4 shrink-0 text-exito" aria-hidden />
          Usuario {creado} creado. Pásale su usuario y contraseña.
        </p>
      )}

      {otros.length === 0 && (
        <p className="text-tinta-suave">Todavía no hay otros usuarios. Crea uno para cada persona del taller.</p>
      )}

      {/* Celular: tarjetas */}
      <ul className="flex flex-col gap-2 md:hidden">
        {usuarios.map((u) => (
          <li key={u.id}>
            <Link href={`/panel/usuarios/${u.id}`} className="flex items-center justify-between gap-3 rounded-sm border border-border p-4 hover:bg-superficie">
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-semibold">{u.nombre}</span>
                <span className="text-sm text-tinta-suave">{u.usuario} · {NOMBRE_ROL[u.rol]}</span>
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
              <TableRow key={u.id}>
                <TableCell>
                  <Link href={`/panel/usuarios/${u.id}`} className="font-semibold hover:underline">
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
