import {
  ArmchairIcon,
  BirdIcon,
  CarIcon,
  CircleCheckIcon,
  ClockIcon,
  DropletIcon,
  EyeIcon,
  GemIcon,
  LightbulbIcon,
  LockIcon,
  ShieldCheckIcon,
  SprayCanIcon,
  SunIcon,
  ThermometerIcon,
  WindIcon,
  type LucideIcon,
} from "lucide-react";
import { iconoDe, type IconoBeneficio } from "@/modulos/sitio/beneficios";

// El dibujo de cada ícono de beneficio (la lista y sus nombres: src/modulos/sitio/beneficios.ts). Decorativo: el
// texto del beneficio dice lo mismo.

const DIBUJO: Record<IconoBeneficio, LucideIcon> = {
  listo: CircleCheckIcon,
  proteccion: ShieldCheckIcon,
  sol: SunIcon,
  agua: DropletIcon,
  brillo: GemIcon,
  aves: BirdIcon,
  limpieza: SprayCanIcon,
  duracion: ClockIcon,
  visibilidad: EyeIcon,
  calor: ThermometerIcon,
  privacidad: LockIcon,
  luz: LightbulbIcon,
  interior: ArmchairIcon,
  aire: WindIcon,
  vehiculo: CarIcon,
};

export function IconoBeneficio({ icono, className }: { icono: string; className?: string }) {
  const Dibujo = DIBUJO[iconoDe(icono)];
  return <Dibujo aria-hidden strokeWidth={1.5} className={className} />;
}
