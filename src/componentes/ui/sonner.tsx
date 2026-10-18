"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

// Avisos flotantes (pulido 1.5). Solo los usa el panel, que es claro: tema fijo, sin depender del sistema.
// Van arriba: abajo, en el celular, tapaban el botón "Guardar cambios" y el último campo.
// 64 px desde arriba: debajo de la barra del panel en el celular y la tableta.
// El de error se distingue por su color y su borde (globals.css, "Avisos flotantes") y dura más.
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      position="top-center"
      offset={{ top: 64 }}
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
      }}
      {...props}
    />
  )
}

export { Toaster }
