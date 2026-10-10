"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";

// Módulos del panel de la entrega 1. Desde HU-03 la lista se filtra según el rol
// y los permisos del encargado (src/lib/permisos.ts).
const modulos = [
  { href: "/panel", texto: "Inicio" },
  { href: "/panel/sitio", texto: "Sitio web" },
  { href: "/panel/reclamos", texto: "Reclamos" },
  { href: "/panel/usuarios", texto: "Usuarios" },
  { href: "/panel/configuracion", texto: "Configuración" },
];

export function NavegacionPanel() {
  const ruta = usePathname();

  return (
    <nav aria-label="Panel" className="flex flex-col gap-1">
      {modulos.map((m) => {
        const activo = m.href === "/panel" ? ruta === m.href : ruta.startsWith(m.href);
        return (
          <Link
            key={m.href}
            href={m.href}
            aria-current={activo ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-2 text-sm hover:bg-muted",
              activo && "bg-muted font-medium",
            )}
          >
            {m.texto}
          </Link>
        );
      })}
    </nav>
  );
}
