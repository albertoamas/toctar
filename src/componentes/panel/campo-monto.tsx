import { Input } from "@/componentes/ui/input";

// Monto en bolivianos: el número y "Bs" después, como en Configuración (pulido 6.3). Acepta coma o punto decimal;
// lo valida el servidor (src/modulos/catalogo/reglas.ts, leerMonto). Lo usan el catálogo y, después, las cotizaciones.
export function CampoMonto(props: React.ComponentProps<typeof Input>) {
  return (
    <div className="flex items-center gap-2">
      <Input inputMode="decimal" autoComplete="off" {...props} className="max-w-32" />
      <span className="text-tinta-suave">Bs</span>
    </div>
  );
}
