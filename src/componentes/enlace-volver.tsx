import type { Route } from "next";
import Link from "next/link";
import { ChevronLeftIcon } from "lucide-react";
import { cn } from "cn";

// "‹ Servicios", "‹ Usuarios"…: volver a la pantalla anterior. Un solo estilo en el sitio y en el panel, con 44 px de
// alto para el dedo (pulido 4.3; antes estaba copiado en 7 lugares y en el panel medía 20 px).
export function EnlaceVolver({ href, children, className }: { href: Route; children: React.ReactNode; className?: string }) {
  return (
    <Link href={href} className={cn("inline-flex min-h-11 items-center gap-1 self-start text-sm text-tinta-suave hover:text-tinta", className)}>
      <ChevronLeftIcon className="size-4" aria-hidden />
      {children}
    </Link>
  );
}
