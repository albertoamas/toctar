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
  matcher: ["/panel", "/panel/:path*"],
};
