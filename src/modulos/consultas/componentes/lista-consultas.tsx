import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/componentes/ui/table";
import { formatearFechaHora } from "@/lib/fechas";
import type { FilaConsulta } from "../consultas";
import { NOMBRE_ESTADO } from "../reglas";

// Consultas en lista: en la página de Consultas y en la ficha del cliente (HU-24). Celular: tarjetas que se tocan
// enteras; computadora: tabla con la fila entera tocable. `sinCliente`: en la ficha ya se sabe de quién son.

export function ListaConsultas({ consultas, sinCliente = false }: { consultas: FilaConsulta[]; sinCliente?: boolean }) {
  return (
    <>
      <ul aria-label="Consultas" className="flex flex-col gap-2 md:hidden">
        {consultas.map((c) => (
          <li key={c.id}>
            <Link href={`/panel/consultas/${c.id}`} className="flex flex-col gap-0.5 rounded-sm border border-border p-4 hover:bg-superficie">
              <span className="flex items-center gap-3">
                <span className="min-w-0 flex-1 truncate font-semibold">{sinCliente ? c.placa : c.cliente}</span>
                <span className="tt-insignia shrink-0">{NOMBRE_ESTADO[c.estado]}</span>
              </span>
              <span className="flex flex-wrap gap-x-3 text-sm text-tinta-suave">
                {!sinCliente && <span className="whitespace-nowrap">{c.placa}</span>}
                <span>{c.servicio ?? "Todavía no sabe"}</span>
                <span className="whitespace-nowrap">{formatearFechaHora(c.ultimoMovimientoAt)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              {!sinCliente && <TableHead>Cliente</TableHead>}
              <TableHead>Vehículo</TableHead>
              <TableHead>Servicio</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Último movimiento</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {consultas.map((c) => (
              <TableRow key={c.id} className="relative">
                {!sinCliente && (
                  <TableCell>
                    <Link href={`/panel/consultas/${c.id}`} className="font-semibold after:absolute after:inset-0 hover:underline">
                      {c.cliente}
                    </Link>
                  </TableCell>
                )}
                <TableCell>
                  {sinCliente ? (
                    <Link href={`/panel/consultas/${c.id}`} className="font-semibold after:absolute after:inset-0 hover:underline">
                      {c.placa}
                    </Link>
                  ) : (
                    c.placa
                  )}
                </TableCell>
                <TableCell>{c.servicio ?? <span className="text-tinta-suave">Todavía no sabe</span>}</TableCell>
                <TableCell>{NOMBRE_ESTADO[c.estado]}</TableCell>
                <TableCell className="whitespace-nowrap">{formatearFechaHora(c.ultimoMovimientoAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
