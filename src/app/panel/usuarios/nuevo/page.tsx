import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronLeftIcon } from "lucide-react";
import { permisosAsignables } from "@/lib/permisos";
import { exigirModulo } from "@/lib/sesion";
import { FormularioUsuario } from "@/modulos/usuarios/componentes/formulario-usuario";

export const metadata: Metadata = { title: "Crear usuario" };

// HU-02: crear un usuario con su rol; si es encargado, con sus módulos (HU-03).
export default function PaginaNuevoUsuario() {
  return (
    <section className="flex flex-col gap-6">
      <Link href="/panel/usuarios" className="flex items-center gap-1 text-sm text-tinta-suave hover:text-tinta">
        <ChevronLeftIcon className="size-4" aria-hidden />
        Usuarios
      </Link>
      <h1 className="font-heading text-4xl font-extrabold italic">Crear usuario</h1>
      <Suspense fallback={<p className="text-tinta-suave">Cargando…</p>}>
        <Formulario />
      </Suspense>
    </section>
  );
}

async function Formulario() {
  await exigirModulo("usuarios");
  return <FormularioUsuario modo="crear" asignables={permisosAsignables()} />;
}
