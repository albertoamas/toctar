import { beforeEach, describe, expect, test, vi } from "vitest";

// La limpieza de fotos cuando algo falla a mitad (auditoría QA-04 y QA-07), con el almacenamiento, la conversión y la
// base simulados: lo que se prueba es qué se borra y qué no.

const almacenamiento = vi.hoisted(() => ({
  subirArchivo: vi.fn(async (clave: string) => clave),
  borrarArchivo: vi.fn<(clave: string, visibilidad: string) => Promise<void>>(async () => {}),
}));
const base = vi.hoisted(() => ({ insertar: vi.fn(), borrar: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/almacenamiento", () => ({
  ...almacenamiento,
  leerArchivo: vi.fn(),
  urlArchivo: (c: string) => c,
  urlArchivoPrivado: async (c: string) => c,
}));
vi.mock("@/lib/imagen", () => ({
  convertirAWebp: async (_: Buffer, lados: number[]) => lados.map(() => ({ data: Buffer.from("x"), info: { size: 1, width: 10, height: 10 } })),
}));
vi.mock("@/db", () => ({
  db: {
    insert: () => ({ values: () => ({ returning: base.insertar }) }),
    delete: () => ({ where: () => ({ returning: base.borrar }) }),
  },
}));

const { eliminarFotosSinFallar, guardarFoto } = await import("@/lib/fotos");

const png = () => new File([new Uint8Array([1, 2, 3])], "foto.png", { type: "image/png" });
const opciones = { carpeta: "pruebas", autorId: 1, miniatura: true };

beforeEach(() => vi.clearAllMocks());

describe("guardarFoto", () => {
  test("si falla la miniatura, se borra la original que ya se había subido", async () => {
    almacenamiento.subirArchivo.mockImplementationOnce(async (clave: string) => clave).mockRejectedValueOnce(new Error("R2 caído"));
    await expect(guardarFoto(png(), opciones)).rejects.toThrow("R2 caído");
    expect(almacenamiento.borrarArchivo).toHaveBeenCalledTimes(1);
    expect(almacenamiento.borrarArchivo.mock.calls[0][0]).toMatch(/^pruebas\/.+\.webp$/);
    expect(base.insertar).not.toHaveBeenCalled();
  });

  test("si falla el registro, se borran la original y la miniatura", async () => {
    base.insertar.mockRejectedValueOnce(new Error("base caída"));
    await expect(guardarFoto(png(), opciones)).rejects.toThrow("base caída");
    expect(almacenamiento.borrarArchivo).toHaveBeenCalledTimes(2);
  });

  test("si todo sale bien, no se borra nada", async () => {
    base.insertar.mockResolvedValueOnce([{ id: 7 }]);
    await expect(guardarFoto(png(), opciones)).resolves.toMatchObject({ ok: true, archivoId: 7 });
    expect(almacenamiento.borrarArchivo).not.toHaveBeenCalled();
  });
});

describe("eliminarFotosSinFallar", () => {
  test("si el almacenamiento falla, lo anota y no corta lo que sigue (renovar el sitio, avisar que se guardó)", async () => {
    base.borrar.mockResolvedValue([{ clave: "a.webp", miniaturaClave: null, privado: false }]);
    almacenamiento.borrarArchivo.mockRejectedValueOnce(new Error("R2 caído"));
    const registro = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(eliminarFotosSinFallar([1, null, undefined, 2], "No se pudo borrar")).resolves.toBeUndefined();
    expect(base.borrar).toHaveBeenCalledTimes(2);
    expect(registro).toHaveBeenCalledWith("No se pudo borrar", expect.any(Error));
    registro.mockRestore();
  });
});
