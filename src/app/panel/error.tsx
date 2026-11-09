"use client";

import Link from "next/link";
import { cn } from "cn";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { PaginaPanel } from "@/componentes/panel/pagina-panel";
import { Button, buttonVariants } from "@/componentes/ui/button";

// Un error inesperado en una pantalla del panel (pulido 13.5): dentro del panel, con su menú. "Volver a intentar"
// vuelve a cargar solo esta pantalla. El código es el `digest` que Next genera para encontrar el error en el registro
// del servidor: no revela datos (en producción, el mensaje del error no llega al navegador).
export default function ErrorPanel({ error, retry }: { error: unknown; retry: () => void }) {
  const codigo = error instanceof Error && "digest" in error && typeof error.digest === "string" ? error.digest : null;
  return (
    <PaginaPanel tipo="formulario">
      <EncabezadoPagina titulo="Algo salió mal">
        No se pudo cargar esta pantalla. Vuelve a intentar; si sigue pasando, avisa a YankoSoft
        {codigo ? ` con este código: ${codigo}` : ""}.
      </EncabezadoPagina>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => retry()}>
          Volver a intentar
        </Button>
        {/* Enlace con forma de botón: lleva a otra pantalla */}
        <Link href="/panel" className={cn(buttonVariants({ variant: "outline" }))}>
          Ir al inicio
        </Link>
      </div>
    </PaginaPanel>
  );
}
