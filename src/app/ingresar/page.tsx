import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/componentes/ui/card";
import { FormularioIngreso } from "@/modulos/acceso/componentes/formulario-ingreso";

export const metadata: Metadata = {
  title: "Ingresar",
  robots: { index: false, follow: false },
};

export default function PaginaIngreso() {
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">TocTar · Panel</CardTitle>
        </CardHeader>
        <CardContent>
          <FormularioIngreso />
        </CardContent>
      </Card>
    </main>
  );
}
