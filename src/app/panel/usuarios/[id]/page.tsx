import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Cargando } from "@/componentes/panel/cargando";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { Insignia } from "@/componentes/panel/insignia";
import { ListaDatos } from "@/componentes/panel/lista-datos";
import { PaginaPanel, PartesIguales } from "@/componentes/panel/pagina-panel";
import { SeccionConEditar } from "@/componentes/panel/seccion-con-editar";
import { permisosAsignables } from "@/lib/permisos";
import { exigirModulo } from "@/lib/sesion";
import { FormularioDatosUsuario, FormularioRolPermisos, MasUsuario } from "@/modulos/usuarios/componentes/ficha-usuario";
import { obtenerUsuario } from "@/modulos/usuarios/consultas";
import { DESCRIPCION_ROL, NOMBRE_ROL } from "@/modulos/usuarios/textos";
import { volverDesde } from "@/lib/volver";

export const metadata: Metadata = { title: "Usuario" };

// HU-02 y HU-03: datos, rol, permisos, contraseña y acceso de un usuario. C6 (fase 4): una ficha como las demás. Datos y
// "Rol y permisos" se leen y cada uno se edita en su modal; restablecer la contraseña y desactivar, en "Más". Antes era un
// formulario abierto con un "Guardar cambios" general y dos tarjetas de acciones.
export default function PaginaUsuario({ params, searchParams }: PageProps<"/panel/usuarios/[id]">) {
  return (
    <PaginaPanel tipo="ficha">
      <Suspense fallback={<Cargando volver={{ href: "/panel/usuarios", texto: "Usuarios" }} />}>
        <Detalle params={params} searchParams={searchParams} />
      </Suspense>
    </PaginaPanel>
  );
}

async function Detalle({ params, searchParams }: Pick<PageProps<"/panel/usuarios/[id]">, "params" | "searchParams">) {
  const yo = await exigirModulo("usuarios");
  const [{ id }, busqueda] = await Promise.all([params, searchParams]);
  // Pedido 43: vuelve a Usuarios con su píldora ("Desactivados")
  const volver = volverDesde(busqueda.volver, { href: "/panel/usuarios", texto: "Usuarios" }, yo);
  const numero = Number(id);
  if (!Number.isInteger(numero) || numero <= 0) notFound();
  const usuario = await obtenerUsuario(numero);
  if (!usuario) notFound();
  const asignables = permisosAsignables();
  const esUnoMismo = String(usuario.id) === yo.id;
  const suyos = asignables.filter((a) => usuario.permisos.includes(a.permiso));

  return (
    <>
      <EncabezadoPagina
        titulo={usuario.nombre}
        estado={usuario.desactivado ? <Insignia>Desactivado</Insignia> : <Insignia tono="exito">Activo</Insignia>}
        volver={volver}
        accion={<MasUsuario id={usuario.id} nombre={usuario.nombre} desactivado={usuario.desactivado} esUnoMismo={esUnoMismo} />}
      >
        {usuario.desactivado
          ? "No puede ingresar. Su historial se conserva."
          : esUnoMismo && "Es tu usuario: no puedes desactivarlo. Si hace falta, pídeselo a otro dueño."}
      </EncabezadoPagina>

      <PartesIguales>
        <SeccionConEditar
          id="datos"
          titulo="Datos"
          etiquetaEditar="Editar datos del usuario"
          tituloModal="Datos del usuario"
          lectura={
            <ListaDatos
              filas={[
                ["Nombre", usuario.nombre],
                ["Usuario", usuario.usuario],
              ]}
            />
          }
        >
          <FormularioDatosUsuario usuario={usuario} />
        </SeccionConEditar>

        <SeccionConEditar
          id="rol"
          titulo="Rol y permisos"
          etiquetaEditar="Editar rol y permisos"
          tituloModal="Rol y permisos"
          lectura={
            <div className="flex flex-col gap-2">
              <p className="font-semibold">{NOMBRE_ROL[usuario.rol]}</p>
              {usuario.rol === "dueno" ? (
                <p className="text-sm text-tinta-suave">{DESCRIPCION_ROL.dueno}</p>
              ) : suyos.length > 0 ? (
                <ul aria-label="Permisos" className="flex flex-wrap gap-x-4 gap-y-1">
                  {suyos.map((a) => (
                    <li key={a.permiso}>{a.nombre}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-tinta-suave">Sin permisos: solo ve el inicio.</p>
              )}
            </div>
          }
        >
          <FormularioRolPermisos usuario={usuario} asignables={asignables} />
        </SeccionConEditar>
      </PartesIguales>
    </>
  );
}
