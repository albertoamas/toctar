"use client"

import { useSyncExternalStore } from "react"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

// Avisos flotantes (pulido 1.5). Solo los usa el panel, que es claro: tema fijo, sin depender del sistema.
// En el celular, arriba, sobre la barra negra, como una notificación del iPhone (19/11, prueba en un iPhone 14): se
// cierran deslizándolos hacia arriba o con la X. Abajo, encima del pie, no se podían cerrar (no atrapaban el toque para no
// tapar "Registrar pago" ni "Recibir vehículo") y salían a media pantalla. Arriba solo tapan la barra con el menú, no el
// botón de volver de la página, que queda más abajo (lo cuida aviso-celular.spec.ts), ni el pie fijo ni el de un modal,
// que sube desde abajo. Desde 640 px, abajo a la derecha, también con su X.
// El de error se distingue por su color (globals.css, "Avisos flotantes") y dura más.
let ancha: MediaQueryList | undefined
/** Una sola consulta para toda la página, creada la primera vez que se pide (en el navegador). */
const consultaAncha = () => (ancha ??= window.matchMedia("(min-width: 640px)"))

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

/** En el celular, a 8 px del borde de arriba (y de la isla o la muesca del iPhone, si la página la ocupa). */
const ARRIBA = "calc(8px + env(safe-area-inset-top, 0px))"

const Toaster = ({ ...props }: ToasterProps) => {
  const pantallaAncha = usePantallaAncha()
  return (
    <Sonner
      theme="light"
      position={pantallaAncha ? "bottom-right" : "top-center"}
      offset={pantallaAncha ? 24 : { top: ARRIBA }}
      mobileOffset={{ top: ARRIBA }}
      closeButton
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-5" />
        ),
        info: (
          <InfoIcon className="size-5" />
        ),
        warning: (
          <TriangleAlertIcon className="size-5" />
        ),
        error: (
          <OctagonXIcon className="size-5" />
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
