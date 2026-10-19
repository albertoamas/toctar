import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ImageIcon } from "lucide-react";
import { cn } from "cn";
import { EstadoVacio } from "@/componentes/panel/estado-vacio";
import { Cargando } from "@/componentes/panel/cargando";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/componentes/ui/table";
import { fechaEnBolivia, formatearFecha } from "@/lib/fechas";
import { exigirModulo } from "@/lib/sesion";
import { InsigniaEstado } from "@/modulos/reclamos/componentes/estado-reclamo";
import { listarReclamos } from "@/modulos/reclamos/consultas";

export const metadata: Metadata = { title: "Reclamos" };

// HU-17: reclamos que llegan desde el sitio. Dueño y encargado con el módulo "reclamos".
export default function PaginaReclamos({ searchParams }: PageProps<"/panel/reclamos">) {
  return (
    <section className="flex flex-col gap-6">
      <h1 className="font-heading text-4xl font-extrabold italic">Reclamos</h1>
      <Suspense fallback={<Cargando />}>
        <Lista searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

async function Lista({ searchParams }: Pick<PageProps<"/panel/reclamos">, "searchParams">) {
  await exigirModulo("reclamos");
  const { ver } = await searchParams;
  const soloPendientes = ver === "pendientes";
  const reclamos = await listarReclamos(soloPendientes);
  const fecha = (d: Date) => formatearFecha(fechaEnBolivia(d));
  // Cuántos hay por atender, a la vista sin entrar a la pestaña (pulido 5.1). Sale de la misma lista.
  const pendientes = reclamos.filter((r) => r.estado === "pendiente").length;
  const filtros = [
    { href: "/panel/reclamos", texto: "Todos", activo: !soloPendientes },
    { href: "/panel/reclamos?ver=pendientes", texto: pendientes > 0 ? `Pendientes (${pendientes})` : "Pendientes", activo: soloPendientes },
  ];

  return (
    <>
      <nav aria-label="Filtrar reclamos">
        <ul className="flex gap-6 border-b border-border">
          {filtros.map((f) => (
            <li key={f.href}>
              <Link
                href={f.href}
                aria-current={f.activo ? "page" : undefined}
                className={cn(
                  "-mb-px block border-b-2 border-transparent py-3 text-sm font-semibold text-tinta-suave hover:text-tinta",
                  f.activo && "border-rojo text-tinta",
                )}
              >
                {f.texto}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {reclamos.length === 0 && (
        <EstadoVacio>
          {soloPendientes
            ? "No hay reclamos pendientes."
            : "Todavía no llegó ningún reclamo. Llegan desde la página Garantía y reclamos del sitio."}
        </EstadoVacio>
      )}

      {/* Celular: tarjetas */}
      <ul aria-label="Reclamos" className="flex flex-col gap-2 md:hidden">
        {reclamos.map((r) => (
          <li key={r.id}>
            <Link href={`/panel/reclamos/${r.id}`} className="flex items-center justify-between gap-3 rounded-sm border border-border p-4 hover:bg-superficie">
              {/* Ningún dato se parte a la mitad, y el servicio, como en la tabla (pulido 5.1) */}
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate font-semibold">{r.nombre}</span>
                <span className="truncate text-sm">{r.servicio ?? <span className="text-tinta-suave">Servicio: no indicó</span>}</span>
                <span className="flex flex-wrap gap-x-3 text-sm text-tinta-suave">
                  <span className="whitespace-nowrap">{fecha(r.createdAt)}</span>
                  <span className="whitespace-nowrap">{r.placa}</span>
                  {r.fotos > 0 && <span className="whitespace-nowrap">{r.fotos === 1 ? "1 foto" : `${r.fotos} fotos`}</span>}
                </span>
              </span>
              <InsigniaEstado estado={r.estado} />
            </Link>
          </li>
        ))}
      </ul>

      {/* Computadora: tabla */}
      {reclamos.length > 0 && (
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Placa</TableHead>
                <TableHead>Servicio</TableHead>
                <TableHead>Fotos</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reclamos.map((r) => (
                <TableRow key={r.id} className="relative">
                  <TableCell>{fecha(r.createdAt)}</TableCell>
                  <TableCell>
                    {/* El enlace cubre toda la fila: en una tableta, tocar solo el nombre (18 px) era difícil (pulido 5.1) */}
                    <Link href={`/panel/reclamos/${r.id}`} className="font-semibold after:absolute after:inset-0 hover:underline">
                      {r.nombre}
                    </Link>
                  </TableCell>
                  <TableCell>{r.placa}</TableCell>
                  <TableCell>{r.servicio ?? <span className="text-tinta-suave">No indicó</span>}</TableCell>
                  <TableCell>
                    {r.fotos > 0 ? (
                      <span className="flex items-center gap-1">
                        <ImageIcon className="size-4 text-tinta-suave" aria-hidden />
                        {r.fotos}
                      </span>
                    ) : (
                      <span className="text-tinta-suave">Sin fotos</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <InsigniaEstado estado={r.estado} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
