import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { cn } from "cn";
import { PlusIcon } from "lucide-react";
import { AvisoEnPagina } from "@/componentes/panel/aviso-en-pagina";
import { Cargando } from "@/componentes/panel/cargando";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { EstadoVacio } from "@/componentes/panel/estado-vacio";
import { Insignia } from "@/componentes/panel/insignia";
import { CeldaDoble, TablaLista } from "@/componentes/panel/tabla-lista";
import { buttonVariants } from "@/componentes/ui/button";
import { exigirModulo } from "@/lib/sesion";
import { listarUsuarios } from "@/modulos/usuarios/consultas";
import { NOMBRE_ROL } from "@/modulos/usuarios/textos";

export const metadata: Metadata = { title: "Usuarios" };

// HU-02: lista de usuarios (pedido 26: en una tabla, con el estado en una insignia). Toda la fila abre el usuario;
// el propio dice "(tú)". Solo el dueño (módulo "usuarios").
export default function PaginaUsuarios({ searchParams }: PageProps<"/panel/usuarios">) {
  return (
    <section className="flex max-w-4xl flex-col gap-6">
      <EncabezadoPagina
        titulo="Usuarios"
        accion={
          // Enlace con forma de botón: lleva a otra pantalla, así que se anuncia como enlace
          <Link href="/panel/usuarios/nuevo" className={cn(buttonVariants())}>
            <PlusIcon />
            Agregar usuario
          </Link>
        }
      />
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
      {typeof creado === "string" && <AvisoEnPagina>Usuario {creado} creado. Pásale su usuario y contraseña.</AvisoEnPagina>}
      {otros.length === 0 && <EstadoVacio>Todavía no hay otros usuarios. Agrega uno para cada persona del taller.</EstadoVacio>}
      <TablaLista
        etiqueta="Usuarios"
        columnas={[
          { titulo: "Nombre", ancho: "minmax(0,1.4fr)", movil: "titulo" },
          { titulo: "Usuario", movil: "par" },
          { titulo: "Rol", movil: "par" },
          { titulo: "Estado", ancho: "8rem", movil: "estado" },
        ]}
        filas={usuarios.map((u) => ({
          href: `/panel/usuarios/${u.id}`,
          atenuada: u.desactivado,
          celdas: [
            <CeldaDoble
              key="n"
              principal={
                <>
                  {u.nombre}
                  {String(u.id) === yo.id && <span className="ml-2 font-normal text-tinta-suave">(tú)</span>}
                </>
              }
            />,
            <span key="u" className="break-all">
              {u.usuario}
            </span>,
            // El rol es un dato, no un estado: texto, como las demás columnas
            NOMBRE_ROL[u.rol],
            u.desactivado ? <Insignia key="e">Desactivado</Insignia> : <Insignia key="e" tono="exito">Activo</Insignia>,
          ],
        }))}
      />
    </>
  );
}
