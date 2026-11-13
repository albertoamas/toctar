import { describe, expect, it } from "vitest";
import { bloquesDeTexto, conDatosDelNegocio } from "@/modulos/sitio/texto-con-formato";

// Pedido 49: la política de privacidad se escribe en el panel con los datos del negocio entre llaves y un formato mínimo.

const datos = { negocio: "TocTar Detailing", direccion: "Barrio Aeropuerto, Tarija", whatsapp: "+591 7123 4567", correo: null };

describe("conDatosDelNegocio", () => {
  it("completa los datos del negocio entre llaves", () => {
    expect(conDatosDelNegocio("En {negocio}, en {direccion}. WhatsApp: {whatsapp}.", datos)).toBe("En TocTar Detailing, en Barrio Aeropuerto, Tarija. WhatsApp: +591 7123 4567.");
  });

  it("un dato que falta en Configuración queda vacío, y otras llaves quedan como están", () => {
    expect(conDatosDelNegocio("Correo: {correo}. {otro} se queda.", datos)).toBe("Correo: . {otro} se queda.");
  });
});

describe("bloquesDeTexto", () => {
  it("separa párrafos con un renglón vacío y respeta los saltos dentro de uno", () => {
    expect(bloquesDeTexto("Primero.\nSigue igual.\n\nSegundo.")).toEqual([
      { tipo: "parrafo", texto: "Primero.\nSigue igual." },
      { tipo: "parrafo", texto: "Segundo." },
    ]);
  });

  it("las líneas que empiezan con «- » forman una lista, también pegada a un párrafo", () => {
    expect(bloquesDeTexto("Guardamos:\n- tu nombre;\n-  tu teléfono.\nY nada más.")).toEqual([
      { tipo: "parrafo", texto: "Guardamos:" },
      { tipo: "lista", items: ["tu nombre;", "tu teléfono."] },
      { tipo: "parrafo", texto: "Y nada más." },
    ]);
  });

  it("un guion sin espacio no es una lista, y un texto vacío no da nada", () => {
    expect(bloquesDeTexto("-sin espacio")).toEqual([{ tipo: "parrafo", texto: "-sin espacio" }]);
    expect(bloquesDeTexto("  \n\n ")).toEqual([]);
  });
});
