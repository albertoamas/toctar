import { exigirSesion } from "@/lib/sesion";
import { NOMBRE_ROL } from "@/modulos/usuarios/textos";
import { MenuUsuario } from "./menu-usuario";

// Quién entró, abajo de la barra lateral y del menú del celular: su inicial, su nombre y su rol; al tocarlo, el manual
// del panel y "Cerrar sesión" (menu-usuario.tsx, 19/11).

export async function UsuarioSesion() {
  const usuario = await exigirSesion();
  return <MenuUsuario nombre={usuario.nombre} rol={NOMBRE_ROL[usuario.rol]} />;
}
