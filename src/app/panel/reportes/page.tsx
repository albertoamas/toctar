import { redirect } from "next/navigation";

// Pedido 16: la pantalla de Reportes (cuánto entró, salió y quedó) llega en el segundo PR de P16-reportes-y-gastos.md.
// Mientras tanto, el menú lleva a los gastos, que la alimentan. La página de gastos verifica la sesión y el permiso.
export default function PaginaReportes() {
  redirect("/panel/reportes/gastos");
}
