import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Cargando } from "@/componentes/panel/cargando";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { Insignia } from "@/componentes/panel/insignia";
import { CheckIcon } from "lucide-react";
import { CabeceraSeccion } from "@/componentes/panel/cabecera-seccion";
import { FilaDato } from "@/componentes/panel/datos-en-bloques";
import { PaginaPanel } from "@/componentes/panel/pagina-panel";
import { SeccionConEditar } from "@/componentes/panel/seccion-con-editar";
import { perfilDe, permisosAsignables } from "@/lib/permisos";
import { exigirModulo } from "@/lib/sesion";
import { FormularioDatosUsuario, FormularioPermisos, MasMiCuenta, MasUsuario } from "@/modulos/usuarios/componentes/ficha-usuario";
import { NO_SE_CAMBIA_DUENO } from "@/modulos/usuarios/reglas";
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

  const esDueno = usuario.rol === "dueno";
  const perfil = perfilDe(usuario.permisos);
  // Pedido 50: de un encargado, todo; del propio dueño, el nombre y su contraseña; de otro dueño, nada
  const soloLectura = esDueno && !esUnoMismo;
  let accion: React.ReactNode;
  if (!esDueno) accion = <MasUsuario id={usuario.id} nombre={usuario.nombre} desactivado={usuario.desactivado} />;
  else if (esUnoMismo) accion = <MasMiCuenta />;
  let nota: string | undefined;
  if (usuario.desactivado) nota = "No puede ingresar. Su historial se conserva.";
  else if (esUnoMismo) nota = "Es tu usuario.";
  else if (esDueno) nota = NO_SE_CAMBIA_DUENO;

  // Datos en bloques, como la orden y el catálogo: lo que identifica, en negrita
  const datos = (
    <dl className="flex flex-col gap-2">
      <FilaDato etiqueta="Nombre">
        <span className="font-semibold">{usuario.nombre}</span>
      </FilaDato>
      <FilaDato etiqueta="Usuario">{usuario.usuario}</FilaDato>
      <FilaDato etiqueta="Rol">
        <span className="font-semibold">{NOMBRE_ROL[usuario.rol]}</span>
        {esDueno && <span className="text-sm text-tinta-suave">{DESCRIPCION_ROL.dueno}</span>}
      </FilaDato>
    </dl>
  );

  return (
    <>
      <EncabezadoPagina
        titulo={usuario.nombre}
        // Solo lo que pide atención (pulido, como el catálogo 13.57)
        estado={usuario.desactivado ? <Insignia>Desactivado</Insignia> : undefined}
        volver={volver}
        accion={accion}
      >
        {nota}
      </EncabezadoPagina>

      {soloLectura ? (
        <section aria-labelledby="datos-titulo" className="flex flex-col gap-3">
          <CabeceraSeccion id="datos" titulo="Datos" />
          <div className="tt-tarjeta-panel p-4">{datos}</div>
        </section>
      ) : (
        <SeccionConEditar id="datos" titulo="Datos" etiquetaEditar="Editar datos del usuario" tituloModal="Datos del usuario" lectura={datos}>
          <FormularioDatosUsuario usuario={usuario} />
        </SeccionConEditar>
      )}

      {!esDueno && (
        <SeccionConEditar
          id="permisos"
          titulo="Permisos"
          etiquetaEditar="Editar permisos"
          tituloModal="Permisos"
          lectura={
            suyos.length > 0 ? (
              <div className="flex flex-col gap-2">
                <p className="font-semibold">{perfil ? `Perfil ${perfil.nombre}` : "Permisos elegidos uno a uno"}</p>
                <ul aria-label="Permisos" className="flex flex-col gap-1">
                  {suyos.map((a) => (
                    <li key={a.permiso} className="flex items-center gap-2">
                      <CheckIcon aria-hidden className="size-4 shrink-0 text-tinta-suave" />
                      {a.nombre}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-tinta-suave">Sin permisos: solo ve el inicio.</p>
            )
          }
        >
          <FormularioPermisos usuario={usuario} asignables={asignables} />
        </SeccionConEditar>
      )}
    </>
  );
}
