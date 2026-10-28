import { LogOutIcon } from "lucide-react";
import { Button } from "@/componentes/ui/button";
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
      <form action={cerrarSesion}>
        <Button type="submit" variant="ghost" size="icon" className="size-11" aria-label="Cerrar sesión">
          <LogOutIcon />
        </Button>
      </form>
    </div>
  );
}
