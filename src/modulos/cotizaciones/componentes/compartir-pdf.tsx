"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { avisarResultado } from "@/componentes/panel/avisos";
import { MenuMas, type AccionMas } from "@/componentes/panel/menu-mas";

// HU-27: compartir el PDF con el menú del teléfono (RF-33): WhatsApp, correo, lo que tenga instalado. Donde el navegador
// no comparte archivos (una computadora con un navegador viejo), lo descarga. La app no manda mensajes por la API de
// WhatsApp (fuera de alcance): quien comparte elige el chat.
// Pedido 47: lo de todos los días es "Enviar por WhatsApp" (el chat del cliente con el enlace al PDF); compartir el archivo
// y descargarlo quedan en el "⋯" de la versión.
//
// Algunos teléfonos (Safari, sobre todo) solo abren el menú si se pide enseguida después del toque: si bajar el PDF
// tarda, lo rechazan. Entonces el archivo queda listo y un aviso pide elegirlo otra vez, que lo abre al instante.

/** `ruta`: la del PDF de la versión (`rutaPdf`). */
type Props = { ruta: string; nombre: string; titulo: string };

/** Si el navegador comparte PDF, sin bajar nada todavía: se pregunta con un archivo vacío del mismo tipo. */
const comparteArchivos = (nombre: string) => !!navigator.canShare?.({ files: [new File([], nombre, { type: "application/pdf" })] });

const NO_SE_PUDO = "No se pudo compartir el PDF. Usa «Descargar PDF» y mándalo desde WhatsApp.";
const OTRO_TOQUE = "El PDF está listo: vuelve a elegir «Compartir el PDF».";

/** Compartir el PDF con el menú del teléfono: baja el archivo (una vez) y abre el menú. */
function useCompartirPdf({ ruta, nombre, titulo }: Props) {
  // El PDF bajado se guarda solo para el segundo toque, un minuto como mucho (después podría ser otro); compartido, se suelta
  const archivo = useRef<File | null>(null);
  const soltar = useRef<ReturnType<typeof setTimeout> | null>(null);
  const guardar = (f: File | null) => {
    if (soltar.current) clearTimeout(soltar.current);
    archivo.current = f;
    if (f) soltar.current = setTimeout(() => (archivo.current = null), 60_000);
  };
  const [ocupado, setOcupado] = useState(false);

  async function compartir() {
    if (!comparteArchivos(nombre)) {
      // Sin menú de compartir archivos: se descarga, y se manda desde el WhatsApp de la computadora. Con un enlace y no
      // navegando: la ruta entrega un archivo, no una página
      const enlace = document.createElement("a");
      enlace.href = `${ruta}?descargar=1`;
      enlace.click();
      return;
    }
    let bajadoAhora = false;
    try {
      setOcupado(true);
      if (!archivo.current) {
        // El menú ya se cerró: mientras baja, un aviso dice que está en camino
        toast.loading("Preparando el PDF…", { id: ruta });
        const respuesta = await fetch(`${ruta}?para=compartir`).finally(() => toast.dismiss(ruta));
        // Con la sesión vencida, la ruta lleva a la pantalla de ingreso y llega una página, no el PDF
        if (!respuesta.ok || respuesta.headers.get("content-type") !== "application/pdf") {
          avisarResultado({ mensaje: respuesta.status === 404 ? "Ese PDF ya no está. Usa «Generar PDF»." : "No se pudo traer el PDF. Recarga la página; si sigue, vuelve a ingresar." });
          return;
        }
        guardar(new File([await respuesta.blob()], nombre, { type: "application/pdf" }));
        bajadoAhora = true;
      }
      await navigator.share({ files: [archivo.current!], title: titulo });
      guardar(null);
    } catch (error) {
      const nombreError = error instanceof DOMException ? error.name : "";
      // Cerró el menú sin elegir: no es un error
      if (nombreError === "AbortError") return;
      // Pasó demasiado tiempo desde el toque mientras bajaba: el archivo ya está y elegirlo de nuevo lo abre al instante.
      // Solo una vez: si también falla al instante, el navegador no lo permite
      if (nombreError === "NotAllowedError" && bajadoAhora) return avisarResultado({ ok: true, mensaje: OTRO_TOQUE });
      guardar(null);
      avisarResultado({ mensaje: NO_SE_PUDO });
    } finally {
      setOcupado(false);
    }
  }

  return { compartir, ocupado };
}

/**
 * El "⋯" del PDF de una versión: compartir el archivo con el menú del teléfono (solo la que vale) y descargarlo, en la
 * misma pestaña.
 */
export function MasPdf({ conCompartir, etiqueta, ...pdf }: Props & { conCompartir: boolean; /** "Opciones del PDF de la versión 2". */ etiqueta: string }) {
  const { compartir, ocupado } = useCompartirPdf(pdf);
  const acciones: AccionMas[] = [];
  if (conCompartir) acciones.push({ texto: "Compartir el PDF", alElegir: () => void compartir() });
  acciones.push({ texto: "Descargar PDF", href: `${pdf.ruta}?descargar=1`, descarga: true });
  return <MenuMas icono etiqueta={etiqueta} acciones={acciones} deshabilitado={ocupado} />;
}
