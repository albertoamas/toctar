import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { cn } from "cn";
import { PlusIcon } from "lucide-react";
import { AvisoFlotante } from "@/componentes/panel/aviso-flotante";
import { Cargando } from "@/componentes/panel/cargando";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { EstadoVacio } from "@/componentes/panel/estado-vacio";
import { Insignia } from "@/componentes/panel/insignia";
import { PaginaPanel } from "@/componentes/panel/pagina-panel";
import { CeldaDoble, TablaLista } from "@/componentes/panel/tabla-lista";
import { buttonVariants } from "@/componentes/ui/button";
import { exigirModulo } from "@/lib/sesion";
import { listarUsuarios } from "@/modulos/usuarios/consultas";
import { NOMBRE_ROL } from "@/modulos/usuarios/textos";
import { BarraLista } from "@/componentes/panel/barra-lista";
import { PildoraVista } from "@/componentes/panel/filtros";

export const metadata: Metadata = { title: "Usuarios" };

// HU-02: lista de usuarios (pedido 26: en una tabla, con el estado en una insignia). Toda la fila abre el usuario;
// el propio dice "(tú)". Solo el dueño (módulo "usuarios"). Barra de las listas (10/11): los desactivados, aparte, con la
// píldora "Desactivados", como en Clientes y Catálogo (antes iban mezclados con su insignia).
export default function PaginaUsuarios({ searchParams }: PageProps<"/panel/usuarios">) {
  return (
    <PaginaPanel tipo="lista">
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
    </PaginaPanel>
  );
}

async function Lista({ searchParams }: Pick<PageProps<"/panel/usuarios">, "searchParams">) {
  const yo = await exigirModulo("usuarios");
  const [todos, { creado, ver }] = await Promise.all([listarUsuarios(), searchParams]);
  const desactivados = ver === "desactivados";
  const usuarios = todos.filter((u) => !!u.desactivado === desactivados);
  const otros = todos.filter((u) => String(u.id) !== yo.id);

  return (
    <>
      {typeof creado === "string" && <AvisoFlotante mensaje={`Usuario ${creado} creado. Pásale su usuario y contraseña.`} />}
      <BarraLista derecha={<PildoraVista texto="Desactivados" valor="desactivados" />} />
      {otros.length === 0 && !desactivados && <EstadoVacio>Todavía no hay otros usuarios. Agrega uno para cada persona del taller.</EstadoVacio>}
      {desactivados && usuarios.length === 0 ? (
        <EstadoVacio>No hay usuarios desactivados.</EstadoVacio>
      ) : (
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
              peso="fuerte"
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
      )}
    </>
  );
}
