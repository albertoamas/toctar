import type { Metadata } from "next";
import { cache, Suspense } from "react";
import { Cargando } from "@/componentes/panel/cargando";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { PaginaPanel } from "@/componentes/panel/pagina-panel";
import { exigirModulo } from "@/lib/sesion";
import { AgregarPregunta, ListaPreguntas, OrdenarPreguntas } from "@/modulos/sitio/componentes/lista-preguntas";
import { listarPreguntas } from "@/modulos/sitio/consultas";

export const metadata: Metadata = { title: "Preguntas frecuentes" };

// HU-08: preguntas frecuentes del sitio. Dueño o encargado con el permiso "sitio".
// Pulido 13.24: el título y "Agregar pregunta" se ven enseguida; "Cambiar orden" y la lista llegan con las preguntas.
export default function PaginaPreguntas() {
  return (
    <PaginaPanel tipo="ficha">
      <EncabezadoPagina
        titulo="Preguntas frecuentes"
        volver={{ href: "/panel/sitio", texto: "Sitio web" }}
        accion={
          <div className="flex flex-wrap gap-2">
            {/* "Cambiar orden" llega con las preguntas; "Agregar", la acción principal, se ve enseguida */}
            <Suspense fallback={null}>
              <Ordenar />
            </Suspense>
            <AgregarPregunta />
          </div>
        }
      />
      <Suspense fallback={<Cargando />}>
        <Lista />
      </Suspense>
    </PaginaPanel>
  );
}

/** Las preguntas, una vez por pedido aunque las lean las acciones y la lista. */
const preguntas = cache(async () => {
  await exigirModulo("sitio");
  return (await listarPreguntas()).map(({ id, pregunta, respuesta, visible }) => ({ id, pregunta, respuesta, visible }));
});

async function Ordenar() {
  return <OrdenarPreguntas preguntas={await preguntas()} />;
}

async function Lista() {
  return <ListaPreguntas preguntas={await preguntas()} />;
}
