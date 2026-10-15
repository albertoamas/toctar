"use client";

import { ListaEditable, type ElementoLista } from "@/componentes/panel/lista-editable";
import { SubidaFoto } from "@/componentes/panel/subida-foto";
import { cambiarEstadoVariante, guardarVariante, moverVariante, quitarFotoServicio, subirFotoServicio } from "../acciones";

// HU-07: foto principal y variantes de un servicio (columna derecha de la edición).

type Props = {
  servicioId: number;
  nombre: string;
  foto: { miniatura: string; ancho: number | null; alto: number | null } | null;
  variantes: ElementoLista[];
};

export function FotoYVariantes({ servicioId, nombre, foto, variantes }: Props) {
  return (
    <div className="flex flex-col gap-12">
      <section aria-labelledby="foto-titulo" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="foto-titulo" className="font-heading text-2xl font-bold italic">Foto principal</h2>
          <p className="text-sm text-tinta-suave">Se ve en la tarjeta y arriba de la página del servicio. Mejor horizontal.</p>
        </div>
        <SubidaFoto
          id="foto-servicio"
          accion={subirFotoServicio}
          camposOcultos={{ servicioId }}
          actual={foto ? { ...foto, alt: nombre } : null}
          textoVacio="Sin foto: el sitio muestra la imagen de reemplazo de TocTar."
          quitar={() => quitarFotoServicio(servicioId)}
        />
      </section>

      <ListaEditable
        id="variantes"
        titulo="Variantes"
        descripcion="Las opciones que eligen los clientes, como los años del cerámico. Los precios se cargan en el catálogo."
        singular="variante"
        campoDescripcion={{ etiqueta: "Descripción", ayuda: "Opcional. Se ve en la página del servicio.", ejemplo: "Capa más densa, más años de protección" }}
        camposOcultos={{ servicioId }}
        elementos={variantes}
        acciones={{
          guardar: guardarVariante,
          mover: (id, direccion) => moverVariante({ servicioId, id, direccion }),
          cambiarEstado: (id, activo) => cambiarEstadoVariante({ servicioId, id, activo }),
        }}
      />
    </div>
  );
}
