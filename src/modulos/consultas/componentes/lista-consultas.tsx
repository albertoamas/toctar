import Link from "next/link";
import { cn } from "cn";
import { ClockAlertIcon } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/componentes/ui/table";
import type { FilaConsulta } from "../consultas";
import { diasDesde, INSIGNIA_ESTADO, NOMBRE_ESTADO, seEnfria, textoDias } from "../reglas";

// Consultas en lista: en la página de Consultas y en la ficha del cliente (HU-24). Celular: tarjetas que se tocan
// enteras; computadora: tabla con la fila entera tocable. `sinCliente`: en la ficha ya se sabe de quién son.
// HU-28: los días desde el último movimiento; desde `umbral` días (Configuración), las abiertas se resaltan.

type Props = { consultas: FilaConsulta[]; umbral: number; sinCliente?: boolean };

function Dias({ dias, fria }: { dias: number; fria: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap", fria && "font-semibold text-aviso")}>
      {fria && <ClockAlertIcon className="size-4 shrink-0" aria-hidden />}
      {fria && <span className="sr-only">Se está enfriando: </span>}
      {textoDias(dias)}
    </span>
  );
}

export function ListaConsultas({ consultas, umbral, sinCliente = false }: Props) {
  const hoy = new Date();
  const filas = consultas.map((c) => {
    const dias = diasDesde(c.ultimoMovimientoAt, hoy);
    return { ...c, dias, fria: seEnfria(c.estado, dias, umbral) };
  });

  return (
    <>
      <ul aria-label="Consultas" className="flex flex-col gap-2 md:hidden">
        {filas.map((c) => (
          <li key={c.id}>
            <Link
              href={`/panel/consultas/${c.id}`}
              className={cn("flex flex-col gap-0.5 rounded-sm border p-4 hover:bg-superficie", c.fria ? "border-aviso bg-aviso/5" : "border-border")}
            >
              <span className="flex items-center gap-3">
                <span className="min-w-0 flex-1 truncate font-semibold">{sinCliente ? c.placa : c.cliente}</span>
                <span className={cn(INSIGNIA_ESTADO[c.estado], "shrink-0")}>{NOMBRE_ESTADO[c.estado]}</span>
              </span>
              <span className="flex flex-wrap gap-x-3 text-sm text-tinta-suave">
                {!sinCliente && <span className="whitespace-nowrap">{c.placa}</span>}
                <span>{c.servicio ?? "Todavía no sabe"}</span>
                <Dias dias={c.dias} fria={c.fria} />
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
            {filas.map((c) => (
              <TableRow key={c.id} className={cn("relative", c.fria && "bg-aviso/5")}>
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
                <TableCell>
                  <Dias dias={c.dias} fria={c.fria} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
