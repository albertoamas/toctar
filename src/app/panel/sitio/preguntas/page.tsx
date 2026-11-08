import type { Metadata } from "next";
import { cache, Suspense } from "react";
import { Cargando } from "@/componentes/panel/cargando";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { exigirModulo } from "@/lib/sesion";
import { AccionesPreguntas, ListaPreguntas } from "@/modulos/sitio/componentes/lista-preguntas";
import { listarPreguntas } from "@/modulos/sitio/consultas";

export const metadata: Metadata = { title: "Preguntas frecuentes" };

// HU-08: preguntas frecuentes del sitio. Dueño o encargado con el permiso "sitio".
// Pulido 13.24: el título se ve enseguida; "Cambiar orden", "Agregar pregunta" y la lista llegan con las preguntas.
export default function PaginaPreguntas() {
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <EncabezadoPagina
        titulo="Preguntas frecuentes"
        volver={{ href: "/panel/sitio", texto: "Sitio web" }}
        accion={
          <Suspense fallback={null}>
            <Acciones />
          </Suspense>
        }
      />
      <Suspense fallback={<Cargando />}>
        <Lista />
      </Suspense>
    </div>
  );
}

/** Las preguntas, una vez por pedido aunque las lean las acciones y la lista. */
const preguntas = cache(async () => {
  await exigirModulo("sitio");
  return (await listarPreguntas()).map(({ id, pregunta, respuesta, visible }) => ({ id, pregunta, respuesta, visible }));
});

async function Acciones() {
  return <AccionesPreguntas preguntas={await preguntas()} />;
}

async function Lista() {
  return <ListaPreguntas preguntas={await preguntas()} />;
}
