"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "cn";
import { CLASE_PILDORA, CLASE_PILDORA_ACTIVA } from "./filtros";

/**
 * Una píldora que prende y apaga una vista de la lista por la dirección (`?ver=desactivados`), sin perder lo buscado:
 * "Desactivados" en Clientes, Usuarios y Catálogo, apagada al entrar. Lee la dirección: va dentro de un Suspense.
 */
export function PildoraVista({ texto, parametro = "ver", valor }: { texto: string; parametro?: string; valor: string }) {
  const ruta = usePathname();
  const actuales = useSearchParams();
  const prendida = actuales.get(parametro) === valor;
  const siguientes = new URLSearchParams(actuales);
  siguientes.delete("pagina");
  if (prendida) siguientes.delete(parametro);
  else siguientes.set(parametro, valor);
  const consulta = siguientes.toString();
  return (
    <Link href={(consulta ? `${ruta}?${consulta}` : ruta) as Route} aria-current={prendida ? "true" : undefined} className={cn(CLASE_PILDORA, prendida && CLASE_PILDORA_ACTIVA)}>
      {texto}
    </Link>
  );
}
