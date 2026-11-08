import type { Metadata } from "next";
import { Suspense } from "react";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { Cargando } from "@/componentes/panel/cargando";
import { PaginaPanel } from "@/componentes/panel/pagina-panel";
import { permisosAsignables } from "@/lib/permisos";
import { exigirModulo } from "@/lib/sesion";
import { FormularioUsuario } from "@/modulos/usuarios/componentes/formulario-usuario";

export const metadata: Metadata = { title: "Crear usuario" };

// HU-02: crear un usuario con su rol; si es encargado, con sus módulos (HU-03).
export default function PaginaNuevoUsuario() {
  return (
    <PaginaPanel tipo="formulario">
      <EncabezadoPagina titulo="Crear usuario" volver={{ href: "/panel/usuarios", texto: "Usuarios" }} />
      <Suspense fallback={<Cargando />}>
        <Formulario />
      </Suspense>
    </PaginaPanel>
  );
}

async function Formulario() {
  await exigirModulo("usuarios");
  return <FormularioUsuario modo="crear" asignables={permisosAsignables()} />;
}
