// El botón principal de un formulario de crear (skill pantallas-panel, §2 "Crear"): al pie, y en el celular fijo abajo
// mientras el formulario se desplaza, así "Crear …" está siempre a mano del pulgar. Desde 640 px, al pie sin más.

export function PieFormulario({ children }: { children: React.ReactNode }) {
  return (
    <div data-pie-movil className="flex flex-wrap gap-2 max-sm:sticky max-sm:bottom-0 max-sm:z-10 max-sm:-mx-4 max-sm:border-t max-sm:border-border max-sm:bg-background max-sm:px-4 max-sm:py-3">
      {children}
    </div>
  );
}
