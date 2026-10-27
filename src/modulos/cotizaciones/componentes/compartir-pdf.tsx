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
type Estado = "listo" | "bajando" | "compartiendo" | "falta-tocar";

/** Si el navegador comparte PDF, sin bajar nada todavía: se pregunta con un archivo vacío del mismo tipo. */
const comparteArchivos = (nombre: string) => !!navigator.canShare?.({ files: [new File([], nombre, { type: "application/pdf" })] });

const NO_SE_PUDO = "No se pudo compartir el PDF. Usa «Descargar» y mándalo desde WhatsApp.";

export function CompartirPdf({ cotizacionId, nombre, titulo }: Props) {
  // El PDF bajado se guarda solo para el segundo toque; después de compartir se suelta
  const archivo = useRef<File | null>(null);
  const [estado, setEstado] = useState<Estado>("listo");
  const ruta = `/panel/cotizaciones/${cotizacionId}/pdf`;

  async function compartir() {
    if (!comparteArchivos(nombre)) {
      // Sin menú de compartir archivos: se descarga, y se manda desde el WhatsApp de la computadora. Con un enlace y no
      // navegando: la ruta entrega un archivo, no una página
      const enlace = document.createElement("a");
      enlace.href = `${ruta}?descargar=1`;
      enlace.click();
      return;
    }
    const segundoToque = estado === "falta-tocar";
    let bajadoAhora = false;
    try {
      if (!archivo.current) {
        setEstado("bajando");
        const respuesta = await fetch(`${ruta}?para=compartir`);
        // Con la sesión vencida, la ruta lleva a la pantalla de ingreso y llega una página, no el PDF
        if (!respuesta.ok || respuesta.headers.get("content-type") !== "application/pdf") {
          avisarResultado({ mensaje: respuesta.status === 404 ? "Ese PDF ya no está. Usa «Generar PDF»." : "No se pudo traer el PDF. Recarga la página; si sigue, vuelve a ingresar." });
          return setEstado("listo");
        }
        archivo.current = new File([await respuesta.blob()], nombre, { type: "application/pdf" });
        bajadoAhora = true;
      }
      setEstado("compartiendo");
      await navigator.share({ files: [archivo.current], title: titulo });
      archivo.current = null;
      setEstado("listo");
    } catch (error) {
      const nombreError = error instanceof DOMException ? error.name : "";
      // Cerró el menú sin elegir: no es un error
      if (nombreError === "AbortError") return setEstado("listo");
      // Pasó demasiado tiempo desde el toque mientras bajaba: el archivo ya está y un toque nuevo lo abre al instante.
      // Solo una vez: si también falla al instante, el navegador no lo permite
      if (nombreError === "NotAllowedError" && bajadoAhora && !segundoToque) return setEstado("falta-tocar");
      archivo.current = null;
      avisarResultado({ mensaje: NO_SE_PUDO });
      setEstado("listo");
    }
  }

  const ocupado = estado === "bajando" || estado === "compartiendo";
  return (
    <Button type="button" variant="outline" disabled={ocupado} onClick={() => void compartir()}>
      <Share2Icon />
      {estado === "bajando" ? "Preparando…" : estado === "falta-tocar" ? "Compartir ahora" : "Compartir"}
    </Button>
  );
}
