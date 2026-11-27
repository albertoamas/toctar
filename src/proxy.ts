import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

// Redirección rápida al ingreso si no hay cookie de sesión. NO es la barrera de
// seguridad: cada página y acción del panel valida la sesión con src/lib/sesion.ts.
export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) {
    return NextResponse.redirect(new URL("/ingresar", request.url));
  }
  return NextResponse.next();
}

export const config = {
  // Menos la subida del video de la portada (pedido 48): con proxy, Next guarda en memoria el cuerpo de cada pedido y lo
  // corta a los 10 MB (proxyClientMaxBodySize), y el video llega hasta 20. La ruta verifica sola la sesión y el permiso.
  matcher: ["/panel", "/panel/((?!sitio/video$).*)"],
};
