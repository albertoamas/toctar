import { z } from "zod";
import { normalizarWhatsApp } from "@/lib/whatsapp";
import { ANIO_MINIMO, anioMaximo, normalizarPlaca } from "./reglas";

// Validación de clientes y vehículos (C1): el mismo esquema en el formulario y en el servidor.
// Especificación: docs/08-desarrollo/etapas/C1-catalogo-clientes.md §6 y §8.

/** Texto opcional: vacío se guarda como null. */
const opcional = (maximo: number) =>
  z
    .string()
    .trim()
    .max(maximo, `Hasta ${maximo} caracteres.`)
    .transform((v) => v || null);

const camposCliente = {
  nombre: z.string().trim().min(1, "Escribe el nombre.").max(120, "Hasta 120 caracteres."),
  telefono: z.string().transform((v, ctx) => {
    const numero = normalizarWhatsApp(v);
    if (!numero) {
      ctx.addIssue({ code: "custom", message: "Escribe los 8 dígitos del celular." });
      return z.NEVER;
    }
    return numero;
  }),
  correo: z
    .string()
    .trim()
    .transform((v) => v || null)
    .pipe(z.email("Escribe un correo válido.").max(120, "Hasta 120 caracteres.").nullable()),
  nit: z
    .string()
    .trim()
    .regex(/^\d{0,15}$/, "El NIT lleva solo números, hasta 15.")
    .transform((v) => v || null),
  razonSocial: opcional(120),
  notas: opcional(1000),
};

export const esquemaCliente = z.object(camposCliente);

const camposVehiculo = {
  placa: z.string().transform((v, ctx) => {
    if (!v.trim()) {
      ctx.addIssue({ code: "custom", message: "Escribe la placa." });
      return z.NEVER;
    }
    const placa = normalizarPlaca(v);
    if (!placa) {
      ctx.addIssue({ code: "custom", message: "La placa lleva solo letras y números." });
      return z.NEVER;
    }
    return placa;
  }),
  tamanoId: z.coerce.number({ message: "Elige el tamaño." }).int().positive("Elige el tamaño."),
  marca: opcional(40),
  modelo: opcional(40),
  color: opcional(40),
  anio: z
    .string()
    .trim()
    .transform((v, ctx) => {
      if (!v) return null;
      const anio = Number(v);
      const maximo = anioMaximo();
      if (!Number.isInteger(anio) || anio < ANIO_MINIMO || anio > maximo) {
        ctx.addIssue({ code: "custom", message: `Escribe un año entre ${ANIO_MINIMO} y ${maximo}.` });
        return z.NEVER;
      }
      return anio;
    }),
};

export const esquemaVehiculo = z.object(camposVehiculo);

/** Campos del vehículo en el formulario de cliente nuevo: llevan el prefijo "vehiculo-". */
export const CAMPOS_VEHICULO = ["placa", "tamanoId", "marca", "modelo", "anio", "color"] as const;
