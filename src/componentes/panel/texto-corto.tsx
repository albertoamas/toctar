import { cn } from "cn";
import { Textarea } from "@/componentes/ui/textarea";

// Componente de cliente: se usa dentro de otros componentes de cliente.
// Una frase corta (un beneficio, un motivo): se ve como un campo de un renglón y crece si el texto no entra, para leerla
// entera en el celular (pulido 4.5). Sin saltos de línea: Enter envía el formulario, como en un campo normal, y lo
// pegado con saltos queda en un renglón.
export function TextoCorto({ className, onChange, ...props }: React.ComponentProps<typeof Textarea>) {
  return (
    <Textarea
      rows={1}
      className={cn("min-h-9 resize-none py-1.5 pointer-coarse:min-h-11 pointer-coarse:py-[9px]", className)}
      onKeyDown={(e) => {
        if (e.key !== "Enter") return;
        e.preventDefault();
        e.currentTarget.form?.requestSubmit();
      }}
      onChange={(e) => {
        const limpio = e.currentTarget.value.replace(/\s*\n+\s*/g, " ");
        if (limpio !== e.currentTarget.value) e.currentTarget.value = limpio;
        onChange?.(e);
      }}
      {...props}
    />
  );
}
