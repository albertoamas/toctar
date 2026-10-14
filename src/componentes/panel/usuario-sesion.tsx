import { LogOutIcon } from "lucide-react";
import { Button } from "@/componentes/ui/button";
import { exigirSesion } from "@/lib/sesion";
import { cerrarSesion } from "@/modulos/acceso/acciones";

const NOMBRE_ROL = { dueno: "Dueño", encargado: "Encargado", tecnico: "Técnico" } as const;

// Lee la sesión: va dentro de <Suspense>.
export async function UsuarioSesion() {
  const usuario = await exigirSesion();
  return (
    <div className="flex items-center justify-between gap-2 px-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{usuario.nombre}</p>
        <p className="text-xs text-muted-foreground">{NOMBRE_ROL[usuario.rol]}</p>
      </div>
      <form action={cerrarSesion}>
        <Button type="submit" variant="ghost" size="icon" aria-label="Cerrar sesión">
          <LogOutIcon />
        </Button>
      </form>
    </div>
  );
}
