import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { Cargando } from "@/componentes/panel/cargando";
import { permisosAsignables } from "@/lib/permisos";
import { exigirModulo } from "@/lib/sesion";
import { AccesoUsuario } from "@/modulos/usuarios/componentes/acceso-usuario";
import { FormularioUsuario } from "@/modulos/usuarios/componentes/formulario-usuario";
import { obtenerUsuario } from "@/modulos/usuarios/consultas";
import { Insignia } from "@/componentes/panel/insignia";

export const metadata: Metadata = { title: "Usuario" };

// HU-02 y HU-03: datos, rol, módulos, contraseña y acceso de un usuario.
export default function PaginaUsuario({ params }: PageProps<"/panel/usuarios/[id]">) {
  return (
    <section className="flex flex-col gap-6">
      <Suspense fallback={<Cargando volver={{ href: "/panel/usuarios", texto: "Usuarios" }} />}>
        <Detalle params={params} />
      </Suspense>
    </section>
  );
}

async function Detalle({ params }: Pick<PageProps<"/panel/usuarios/[id]">, "params">) {
  const yo = await exigirModulo("usuarios");
  const { id } = await params;
  const numero = Number(id);
  if (!Number.isInteger(numero) || numero <= 0) notFound();
  const usuario = await obtenerUsuario(numero);
  if (!usuario) notFound();

  return (
    <>
      <EncabezadoPagina
        titulo={usuario.nombre}
        estado={usuario.desactivado ? <Insignia>Desactivado</Insignia> : <Insignia tono="exito">Activo</Insignia>}
        volver={{ href: "/panel/usuarios", texto: "Usuarios" }}
      />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,36rem)_minmax(0,22rem)]">
        <FormularioUsuario modo="editar" asignables={permisosAsignables()} usuario={usuario} />
        <AccesoUsuario
          id={usuario.id}
          nombre={usuario.nombre}
          desactivado={usuario.desactivado}
          esUnoMismo={String(usuario.id) === yo.id}
        />
      </div>
    </>
  );
}
