"use client";

import { useRef, useState } from "react";
import { Share2Icon } from "lucide-react";
import { avisarResultado } from "@/componentes/panel/avisos";
import { Button } from "@/componentes/ui/button";

// HU-27: compartir el PDF con el menú del teléfono (RF-33): WhatsApp, correo, lo que tenga instalado. Donde el navegador
// no comparte archivos (una computadora con un navegador viejo), lo descarga. La app no manda mensajes por la API de
// WhatsApp (fuera de alcance): quien comparte elige el chat.
//
// Algunos teléfonos (Safari, sobre todo) solo abren el menú si se pide enseguida después del toque: si bajar el PDF
// tarda, lo rechazan. Entonces el archivo queda listo y el botón pide un segundo toque, que lo abre al instante.

type Props = { cotizacionId: number; nombre: string; titulo: string };

const puedeCompartir = (archivo: File) => typeof navigator !== "undefined" && !!navigator.canShare?.({ files: [archivo] });

export function CompartirPdf({ cotizacionId, nombre, titulo }: Props) {
  const archivo = useRef<File | null>(null);
  const [estado, setEstado] = useState<"listo" | "bajando" | "falta-tocar">("listo");
  const ruta = `/panel/cotizaciones/${cotizacionId}/pdf`;

  async function bajar(): Promise<File | null> {
    if (archivo.current) return archivo.current;
    const respuesta = await fetch(`${ruta}?para=compartir`);
    // Con la sesión vencida, la ruta lleva a la pantalla de ingreso y llega una página, no el PDF
    if (!respuesta.ok || respuesta.headers.get("content-type") !== "application/pdf") return null;
    archivo.current = new File([await respuesta.blob()], nombre, { type: "application/pdf" });
    return archivo.current;
  }

  async function compartir() {
    setEstado("bajando");
    try {
      const pdf = await bajar();
      if (!pdf) {
        avisarResultado({ mensaje: "No se pudo traer el PDF. Recarga la página; si sigue, vuelve a ingresar." });
        return setEstado("listo");
      }
      if (!puedeCompartir(pdf)) {
        // Sin menú de compartir archivos: se descarga, y se manda desde el WhatsApp de la computadora
        window.location.assign(`${ruta}?descargar=1`);
        return setEstado("listo");
      }
      await navigator.share({ files: [pdf], title: titulo });
      setEstado("listo");
    } catch (error) {
      const nombreError = error instanceof DOMException ? error.name : "";
      // Cerró el menú sin elegir: no es un error
      if (nombreError === "AbortError") return setEstado("listo");
      // Pasó demasiado tiempo desde el toque mientras bajaba: el archivo ya está, falta tocar de nuevo
      if (nombreError === "NotAllowedError" && archivo.current) return setEstado("falta-tocar");
      avisarResultado({ mensaje: "No se pudo compartir el PDF. Usa «Descargar» y mándalo desde WhatsApp." });
      setEstado("listo");
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" disabled={estado === "bajando"} onClick={() => void compartir()}>
      <Share2Icon />
      {estado === "bajando" ? "Preparando…" : estado === "falta-tocar" ? "Compartir ahora" : "Compartir"}
    </Button>
  );
}
