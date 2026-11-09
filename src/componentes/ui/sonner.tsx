"use client"

import { useSyncExternalStore } from "react"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

// Avisos flotantes (pulido 1.5). Solo los usa el panel, que es claro: tema fijo, sin depender del sistema.
// Abajo, en todos los tamaños: arriba caían sobre el encabezado. En la computadora tapaban "Reservar en Agenda" después de
// "Aceptó" (pulido 13.23); en el celular, el botón de volver, que no se podía tocar mientras duraba el aviso (09/11, lo vio
// hu-07). En el celular, abajo al centro y encima del botón fijo del pie cuando la pantalla lo tiene (`--alto-pie-movil`,
// globals.css): así no tapa "Recibir vehículo", "Crear …" ni el pie de un modal. Desde 600 px (donde sonner deja de usar
// `mobileOffset`), abajo a la derecha. Con un modal abierto en el celular, arriba: el modal sube desde abajo y el aviso
// tapaba sus botones ("Agregar paso" después de crear un servicio, lo vio hu-11); arriba queda sobre la página oscurecida.
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

/** Si hay un modal abierto: se mira el documento, porque los modales van en un portal fuera de este componente. */
function useModalAbierto(): boolean {
  return useSyncExternalStore(
    (avisar) => {
      const observador = new MutationObserver(avisar)
      observador.observe(document.body, { childList: true, subtree: true })
      return () => observador.disconnect()
    },
    () => document.querySelector('[data-slot="dialog-content"]') !== null,
    () => false,
  )
}

const Toaster = ({ ...props }: ToasterProps) => {
  const pantallaAncha = usePantallaAncha()
  const modalAbierto = useModalAbierto()
  // En el celular, con un modal abierto: arriba, 16 px del borde
  const arriba = !pantallaAncha && modalAbierto
  return (
    <Sonner
      theme="light"
      position={pantallaAncha ? "bottom-right" : arriba ? "top-center" : "bottom-center"}
      offset={pantallaAncha ? 24 : arriba ? { top: 16 } : { bottom: ENCIMA_DEL_PIE }}
      mobileOffset={arriba ? { top: 16 } : { bottom: ENCIMA_DEL_PIE }}
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
