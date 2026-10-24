import { MODULOS, nombreEnMenu, modulosDelMenu } from "@/lib/permisos";
import { exigirSesion } from "@/lib/sesion";
import { NavegacionPanel } from "./navegacion";

// Menú del panel según el rol y los permisos del usuario. Lee la sesión: va dentro de <Suspense>.
// Esconder un módulo no lo protege: cada página llama a exigirModulo.
export async function MenuPanel() {
  const usuario = await exigirSesion();
  const modulos = modulosDelMenu(usuario).map((m) => ({ href: MODULOS[m].ruta, texto: nombreEnMenu(m) }));
  return <NavegacionPanel modulos={modulos} />;
}
