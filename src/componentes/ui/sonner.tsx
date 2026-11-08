"use client"

import { useSyncExternalStore } from "react"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

// Avisos flotantes (pulido 1.5). Solo los usa el panel, que es claro: tema fijo, sin depender del sistema.
// En el celular van arriba: abajo tapaban el botón "Guardar cambios" y el último campo; 64 px desde arriba, debajo de la
// barra del panel. Desde 600 px (donde sonner deja de usar `mobileOffset`), abajo a la derecha (pulido 13.23): arriba al
// centro caían sobre los botones del encabezado ("Reservar en Agenda" después de "Aceptó") y, con el mouse encima, no se
// iban (sonner los detiene).
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

const Toaster = ({ ...props }: ToasterProps) => {
  const pantallaAncha = usePantallaAncha()
  return (
    <Sonner
      theme="light"
      position={pantallaAncha ? "bottom-right" : "top-center"}
      offset={pantallaAncha ? 24 : { top: 64 }}
      mobileOffset={{ top: 64 }}
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
