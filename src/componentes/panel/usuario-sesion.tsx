import { BookOpenIcon, LogOutIcon } from "lucide-react";
import { Button, buttonVariants } from "@/componentes/ui/button";
import { exigirSesion } from "@/lib/sesion";
import { cerrarSesion } from "@/modulos/acceso/acciones";
import { NOMBRE_ROL } from "@/modulos/usuarios/textos";

// Lee la sesión: va dentro de <Suspense>.
export async function UsuarioSesion() {
  const usuario = await exigirSesion();
  return (
    <div className="flex items-center justify-between gap-2 px-3">
      <div className="min-w-0">
        {/* Hasta dos renglones: un nombre completo ("Yerko Tejerina Aparicio") no se corta a la mitad (pulido 13.1) */}
        <p className="line-clamp-2 text-sm font-medium break-words">{usuario.nombre}</p>
        <p className="text-xs text-muted-foreground">{NOMBRE_ROL[usuario.rol]}</p>
      </div>
      <div className="flex items-center">
        {/* El manual del panel (pedido 44): una página propia que sirve una ruta (no del panel): un enlace común, sin el router */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- /panel/manual es una ruta que devuelve su propio HTML */}
        <a href="/panel/manual" className={buttonVariants({ variant: "ghost", size: "icon", className: "size-11" })} aria-label="Manual del panel" title="Manual del panel">
          <BookOpenIcon />
        </a>
        <form action={cerrarSesion}>
          <Button type="submit" variant="ghost" size="icon" className="size-11" aria-label="Cerrar sesión" data-preguntar-salir>
            <LogOutIcon />
          </Button>
        </form>
      </div>
    </div>
  );
}
