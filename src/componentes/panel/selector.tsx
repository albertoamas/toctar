import { cn } from "cn";

// Lista desplegable nativa del navegador, con el mismo aspecto que Input. En el celular abre
// el selector propio del teléfono, que es más cómodo que uno dibujado.
// Las opciones llevan fondo y tinta del tema: con el fondo transparente, Chrome en Windows dibujaba la lista
// en blanco con el texto blanco del sitio oscuro, y no se leía nada (revisión de YankoSoft, pulido 2.8).
export function Selector({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2 py-1 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 [&_option]:bg-fondo [&_option]:text-tinta",
        className,
      )}
      {...props}
    />
  );
}
