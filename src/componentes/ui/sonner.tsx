"use client"

import { useSyncExternalStore } from "react"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

// Avisos flotantes (pulido 1.5). Solo los usa el panel, que es claro: tema fijo, sin depender del sistema.
// Abajo, en todos los tamaños: arriba caían sobre el encabezado. En la computadora tapaban "Reservar en Agenda" después de
// "Aceptó" (pulido 13.23); en el celular, el botón de volver, que no se podía tocar mientras duraba el aviso (09/11, lo vio
// hu-07). En el celular, abajo al centro y encima del botón fijo del pie cuando la pantalla lo tiene (`--alto-pie-movil`,
// globals.css): así no tapa "Recibir vehículo", "Crear …" ni el pie de un modal. Desde 600 px (donde sonner deja de usar
// `mobileOffset`), abajo a la derecha.
// El de error se distingue por su color y su borde (globals.css, "Avisos flotantes") y dura más.
let ancha: MediaQueryList | undefined
/** Una sola consulta para toda la página, creada la primera vez que se pide (en el navegador). */
const consultaAncha = () => (ancha ??= window.matchMedia("(min-width: 600px)"))

function usePantallaAncha(): boolean {
  return useSyncExternalStore(
    (avisar) => {
      consultaAncha().addEventListener("change", avisar)
      return () => consultaAncha().removeEventListener("change", avisar)
    },
    () => consultaAncha().matches,
    () => false,
  )
}

/** En el celular, el aviso queda 16 px encima del pie fijo de la pantalla (o del borde, si no tiene). */
const ENCIMA_DEL_PIE = "calc(16px + var(--alto-pie-movil, 0px))"

const Toaster = ({ ...props }: ToasterProps) => {
  const pantallaAncha = usePantallaAncha()
  return (
    <Sonner
      theme="light"
      position={pantallaAncha ? "bottom-right" : "bottom-center"}
      offset={pantallaAncha ? 24 : { bottom: ENCIMA_DEL_PIE }}
      mobileOffset={{ bottom: ENCIMA_DEL_PIE }}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4 text-exito" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4 text-rojo-texto" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
        // El botón de cerrar (pedido 39), con nombre en español para el lector de pantalla: el de sonner es "Close toast"
        closeButtonAriaLabel: "Cerrar el aviso",
      }}
      {...props}
    />
  )
}

export { Toaster }
