import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { cn } from "cn";
import { enlaceWhatsApp, mensajeWhatsApp } from "@/lib/whatsapp";
import { obtenerDatosPublicos } from "@/modulos/configuracion/consultas";
import { IconoWhatsApp } from "./iconos-marca";
import { ATRIBUTO_PRINCIPAL } from "./whatsapp-comun";
import { WhatsAppFlotante } from "./whatsapp-flotante";

// WhatsApp en el sitio (HU-15, RF-08). El número sale de los datos del negocio (HU-04), nunca del código.
// Cada página pone su botón fijo: así la del servicio abre el chat con ese servicio ya escrito.
// Garantía y reclamos no lo lleva: ahí la tarea es el formulario y el botón lo tapaba.

async function numero(): Promise<string | null> {
  await connection();
  return (await obtenerDatosPublicos()).whatsapp;
}

/** Botón redondo fijo abajo a la derecha (componente BotonWhatsApp). Uno por página; se esconde mientras el botón principal está a la vista. */
export function WhatsAppFijo({ servicio }: { servicio?: string }) {
  return (
    <Suspense fallback={null}>
      <BotonFijo servicio={servicio} />
    </Suspense>
  );
}

async function BotonFijo({ servicio }: { servicio?: string }) {
  const n = await numero();
  if (!n) return null;
  return <WhatsAppFlotante href={enlaceWhatsApp(n, mensajeWhatsApp(servicio))} />;
}

/**
 * Botón con texto que abre WhatsApp (por defecto, el principal de la pantalla).
 * Si todavía no hay número cargado, lleva a la página de contacto.
 */
export function BotonWhatsApp({
  texto = "Escribir por WhatsApp",
  servicio,
  variante = "principal",
  className,
}: {
  texto?: string;
  servicio?: string;
  variante?: "principal" | "contorno";
  className?: string;
}) {
  const clase = cn("tt-boton", variante === "principal" ? "tt-boton--principal" : "tt-boton--contorno", className);
  // El principal marca su lugar: mientras se ve, el botón fijo se esconde (whatsapp-flotante.tsx).
  const marca: Record<string, string> = variante === "principal" ? { [ATRIBUTO_PRINCIPAL]: "" } : {};
  return (
    <Suspense
      fallback={
        <Link href="/contacto" className={clase} {...marca}>
          <IconoWhatsApp />
          {texto}
        </Link>
      }
    >
      <EnlaceConNumero texto={texto} servicio={servicio} clase={clase} marca={marca} />
    </Suspense>
  );
}

async function EnlaceConNumero({ texto, servicio, clase, marca }: { texto: string; servicio?: string; clase: string; marca: Record<string, string> }) {
  const n = await numero();
  if (!n) {
    return (
      <Link href="/contacto" className={clase} {...marca}>
        {texto}
      </Link>
    );
  }
  return (
    <a href={enlaceWhatsApp(n, mensajeWhatsApp(servicio))} target="_blank" rel="noreferrer" className={clase} {...marca}>
      <IconoWhatsApp />
      {texto}
    </a>
  );
}
