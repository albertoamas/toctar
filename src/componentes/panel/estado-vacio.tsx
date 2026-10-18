// Pantalla o lista sin nada todavía: dice qué pasa y qué hacer. Mismo estilo en todo el panel.
// La acción principal ya está arriba en cada pantalla ("Agregar servicio", "Crear usuario"): aquí no se repite.

export function EstadoVacio({ children }: { children: React.ReactNode }) {
  return <p className="rounded-sm border border-dashed border-input px-4 py-6 text-tinta-suave">{children}</p>;
}
