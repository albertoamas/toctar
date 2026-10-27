import path from "node:path";
import { Document, Font, Image, Page, Polygon, StyleSheet, Svg, Text, View } from "@react-pdf/renderer";

// Plantilla del PDF de la cotización (HU-26, RF-32). A4, márgenes de 15 mm. Lo recibe el cliente por WhatsApp y a
// veces se imprime en blanco y negro: negro sobre blanco, el rojo de marca solo en piezas grandes (la barra a 60° del
// título y el corte del total), nunca como texto chico. Barlow Condensed itálica para títulos y el total; Montserrat
// para el resto. El PDF no lee las fuentes WOFF2 del sitio: usa las TTF de public/fuentes/pdf (licencia OFL).
// Pulido 9.5: el cuerpo en 10,5 pt (el cliente lo abre en el celular; la hoja tenía espacio de sobra), el logo según
// su forma y el tamaño del vehículo con su etiqueta, como en el panel.

const FUENTES = path.join(process.cwd(), "public", "fuentes", "pdf");
Font.register({ family: "Barlow Condensed", src: path.join(FUENTES, "BarlowCondensed-ExtraBoldItalic.ttf"), fontStyle: "italic", fontWeight: 800 });
Font.register({
  family: "Montserrat",
  fonts: [
    { src: path.join(FUENTES, "Montserrat-Regular.ttf"), fontWeight: 400 },
    { src: path.join(FUENTES, "Montserrat-SemiBold.ttf"), fontWeight: 600 },
    { src: path.join(FUENTES, "Montserrat-Bold.ttf"), fontWeight: 700 },
  ],
});
// Sin cortar palabras con guiones: en español los corta mal
Font.registerHyphenationCallback((palabra) => [palabra]);

const MM = 72 / 25.4;
/** Alto de la hoja A4 en puntos. */
const ALTO_A4 = 841.89;
// Los colores de la marca (Design System; en el código web, los tokens de src/app/globals.css). El PDF no lee CSS:
// van como valores, en este único lugar
const NEGRO = "#000000";
const ROJO = "#E30613";
const SUAVE = "#5C5C5C";
const LINEA = "#D9D9D9";
/** Lo que avanza en horizontal una diagonal a 60° por cada punto de alto: el único ángulo de la marca. */
const INCLINACION = 1 / Math.tan((60 * Math.PI) / 180);

export type Imagen = { data: Buffer; format: "png" | "jpg"; ancho: number; alto: number };

export type DatosPdf = {
  negocio: { nombre: string; razonSocial: string | null; nit: string | null; whatsapp: string | null; direccion: string | null; logo: Imagen | null };
  numero: string;
  version: number;
  fecha: string;
  validaHasta: string;
  cliente: { nombre: string; whatsapp: string };
  vehiculo: { placa: string; descripcion: string | null; tamano: string };
  lineas: { descripcion: string; precio: string }[];
  subtotal: string;
  descuento: string;
  total: string;
  adelanto: string;
  esEstimado: boolean;
  formasPago: string;
  condiciones: string;
  garantia: string;
  fotos: Imagen[];
};

/**
 * "1.850,00 Bs": en el documento todos los montos con dos decimales y separador de miles, para que se lean en
 * columna. Armado a mano y no con toLocaleString: no depende del idioma instalado en el servidor.
 */
export function montoDocumento(monto: string): string {
  const [entero, decimales = "00"] = Number(monto).toFixed(2).split(".");
  return `${entero.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${decimales} Bs`;
}
const bs = montoDocumento;

const e = StyleSheet.create({
  pagina: { paddingTop: 15 * MM, paddingHorizontal: 15 * MM, paddingBottom: 22 * MM, fontFamily: "Montserrat", fontSize: 10.5, lineHeight: 1.4, color: NEGRO },
  cabecera: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 16 },
  negocio: { alignItems: "flex-end", maxWidth: 240 },
  negocioNombre: { fontWeight: 700, fontSize: 11 },
  suave: { color: SUAVE },
  titulo: { flexDirection: "row", alignItems: "flex-end", gap: 10, marginTop: 9 * MM },
  tituloTexto: { fontFamily: "Barlow Condensed", fontStyle: "italic", fontWeight: 800, fontSize: 30, lineHeight: 1 },
  fechas: { flexDirection: "row", gap: 24, marginTop: 4 * MM },
  etiqueta: { fontWeight: 600, color: SUAVE, fontSize: 9.5 },
  estimado: { marginTop: 5 * MM, borderWidth: 1, borderColor: NEGRO, paddingVertical: 6, paddingHorizontal: 9 },
  estimadoTexto: { fontWeight: 600 },
  partes: { flexDirection: "row", gap: 8 * MM, marginTop: 6 * MM, paddingTop: 4 * MM, borderTopWidth: 1, borderTopColor: LINEA },
  parte: { flex: 1, gap: 1 },
  fuerte: { fontWeight: 700 },
  seccion: { fontFamily: "Barlow Condensed", fontStyle: "italic", fontWeight: 800, fontSize: 16, lineHeight: 1.1, marginTop: 7 * MM, marginBottom: 3 },
  filaTabla: { flexDirection: "row", paddingVertical: 5, borderBottomWidth: 0.75, borderBottomColor: LINEA },
  cabeceraTabla: { flexDirection: "row", paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: NEGRO },
  colDescripcion: { flex: 1, paddingRight: 12 },
  colPrecio: { width: 100, textAlign: "right" },
  totales: { alignSelf: "flex-end", width: 270, marginTop: 4 * MM, gap: 3 },
  filaTotal: { flexDirection: "row", justifyContent: "space-between" },
  banda: { position: "relative", height: 34, marginTop: 4 },
  bandaTexto: { position: "absolute", top: 0, bottom: 0, left: 34, right: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  bandaEtiqueta: { color: "#FFFFFF", fontWeight: 600, fontSize: 11 },
  bandaMonto: { color: "#FFFFFF", fontFamily: "Barlow Condensed", fontStyle: "italic", fontWeight: 800, fontSize: 22, lineHeight: 1 },
  textos: { marginTop: 7 * MM, gap: 4 * MM },
  texto: { gap: 2 },
  fotos: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 4 * MM },
  foto: { width: "48.5%", height: 62 * MM, objectFit: "cover" },
  // Ubicado desde arriba: con `bottom`, react-pdf dibujaba fuera de la hoja los textos con `render` (número de página)
  pie: { position: "absolute", top: ALTO_A4 - 14 * MM, left: 15 * MM, right: 15 * MM, fontSize: 8.5, color: SUAVE },
});

/** Barra roja a 60° junto al título: la pieza de marca del documento. */
function Barra({ alto }: { alto: number }) {
  const corrida = alto * INCLINACION;
  const ancho = 7;
  return (
    <Svg width={corrida + ancho} height={alto}>
      <Polygon points={`${corrida},0 ${corrida + ancho},0 ${ancho},${alto} 0,${alto}`} fill={ROJO} />
    </Svg>
  );
}

/** Total en una banda negra con el borde izquierdo cortado a 60° y una línea roja paralela al corte. */
function BandaTotal({ total }: { total: string }) {
  const alto = 34;
  const ancho = 270;
  const corrida = alto * INCLINACION;
  return (
    <View style={e.banda}>
      <Svg width={ancho} height={alto} style={{ position: "absolute", top: 0, left: 0 }}>
        <Polygon points={`${corrida},0 ${corrida + 5},0 5,${alto} 0,${alto}`} fill={ROJO} />
        <Polygon points={`${corrida + 9},0 ${ancho},0 ${ancho},${alto} 9,${alto}`} fill={NEGRO} />
      </Svg>
      <View style={e.bandaTexto}>
        <Text style={e.bandaEtiqueta}>Total</Text>
        <Text style={e.bandaMonto}>{bs(total)}</Text>
      </View>
    </View>
  );
}

function Logo({ negocio }: { negocio: DatosPdf["negocio"] }) {
  if (!negocio.logo) return <Text style={e.tituloTexto}>{negocio.nombre}</Text>;
  // Según su forma: uno horizontal, 14 mm de alto; uno casi cuadrado o vertical (el dueño puede subir el que tenga),
  // 24 mm, así no queda de 14 × 14 mm con su lema ilegible. El ancho, el que dé la proporción (hasta 70 mm)
  const proporcion = negocio.logo.ancho / negocio.logo.alto;
  const alto = (proporcion < 2 ? 24 : 14) * MM;
  const ancho = Math.min(70 * MM, alto * proporcion);
  // eslint-disable-next-line jsx-a11y/alt-text -- es el Image de react-pdf, que no tiene alt (no es un <img>)
  return <Image src={{ data: negocio.logo.data, format: negocio.logo.format }} style={{ width: ancho, height: alto, objectFit: "contain", objectPosition: "left" }} />;
}

export function PdfCotizacion({ d }: { d: DatosPdf }) {
  const titulo = `Cotización ${d.numero}`;
  return (
    <Document title={d.version > 1 ? `${titulo} (versión ${d.version})` : titulo} author={d.negocio.nombre} creator={d.negocio.nombre} producer={d.negocio.nombre} language="es-BO">
      <Page size="A4" style={e.pagina}>
        <View style={e.cabecera}>
          <Logo negocio={d.negocio} />
          <View style={e.negocio}>
            <Text style={e.negocioNombre}>{d.negocio.razonSocial ?? d.negocio.nombre}</Text>
            {d.negocio.nit && <Text style={e.suave}>NIT {d.negocio.nit}</Text>}
            {d.negocio.whatsapp && <Text style={e.suave}>WhatsApp {d.negocio.whatsapp}</Text>}
            {d.negocio.direccion && <Text style={[e.suave, { textAlign: "right" }]}>{d.negocio.direccion}</Text>}
          </View>
        </View>

        <View style={e.titulo}>
          <Barra alto={26} />
          <Text style={e.tituloTexto}>{titulo}</Text>
        </View>
        <View style={e.fechas}>
          <View>
            <Text style={e.etiqueta}>Fecha</Text>
            <Text>{d.fecha}</Text>
          </View>
          <View>
            <Text style={e.etiqueta}>Válida hasta</Text>
            <Text style={e.fuerte}>{d.validaHasta}</Text>
          </View>
          {d.version > 1 && (
            <View>
              <Text style={e.etiqueta}>Versión</Text>
              <Text>{d.version}: reemplaza a la anterior</Text>
            </View>
          )}
        </View>

        {d.esEstimado && (
          <View style={e.estimado}>
            <Text style={e.estimadoTexto}>Estimado según fotos o video: el precio se confirma al ver el vehículo en el taller.</Text>
          </View>
        )}

        <View style={e.partes}>
          <View style={e.parte}>
            <Text style={e.etiqueta}>Cliente</Text>
            <Text style={e.fuerte}>{d.cliente.nombre}</Text>
            <Text>WhatsApp {d.cliente.whatsapp}</Text>
          </View>
          <View style={e.parte}>
            <Text style={e.etiqueta}>Vehículo</Text>
            <Text style={e.fuerte}>{d.vehiculo.placa}</Text>
            {d.vehiculo.descripcion && <Text>{d.vehiculo.descripcion}</Text>}
            {/* Con su etiqueta: junto al modelo, sin ella, se leía como otro modelo */}
            <Text style={e.suave}>Tamaño: {d.vehiculo.tamano}</Text>
          </View>
        </View>

        <Text style={e.seccion}>Servicios</Text>
        <View style={e.cabeceraTabla}>
          <Text style={[e.colDescripcion, e.etiqueta]}>Descripción</Text>
          <Text style={[e.colPrecio, e.etiqueta]}>Precio</Text>
        </View>
        {d.lineas.map((l, i) => (
          <View key={i} style={e.filaTabla} wrap={false}>
            <Text style={e.colDescripcion}>{l.descripcion}</Text>
            <Text style={[e.colPrecio, e.fuerte]}>{bs(l.precio)}</Text>
          </View>
        ))}

        <View style={e.totales} wrap={false}>
          <View style={e.filaTotal}>
            <Text style={e.suave}>Subtotal</Text>
            <Text>{bs(d.subtotal)}</Text>
          </View>
          {d.descuento !== "0.00" && (
            <View style={e.filaTotal}>
              <Text style={e.suave}>Descuento</Text>
              <Text>− {bs(d.descuento)}</Text>
            </View>
          )}
          <BandaTotal total={d.total} />
          {d.adelanto !== "0.00" && (
            <View style={[e.filaTotal, { marginTop: 4 }]}>
              <Text style={e.suave}>Adelanto para reservar</Text>
              <Text style={e.fuerte}>{bs(d.adelanto)}</Text>
            </View>
          )}
        </View>

        <View style={e.textos}>
          {[
            ["Formas de pago", d.formasPago],
            ["Condiciones", d.condiciones],
            ["Garantía", d.garantia],
          ].map(([t, texto]) => (
            <View key={t} style={e.texto} wrap={false}>
              <Text style={e.fuerte}>{t}</Text>
              <Text>{texto}</Text>
            </View>
          ))}
        </View>

        {d.fotos.length > 0 && (
          <View wrap={false}>
            <Text style={e.seccion}>Fotos del vehículo</Text>
            <View style={e.fotos}>
              {d.fotos.map((f, i) => (
                // eslint-disable-next-line jsx-a11y/alt-text -- es el Image de react-pdf, que no tiene alt
                <Image key={i} src={{ data: f.data, format: f.format }} style={e.foto} />
              ))}
            </View>
          </View>
        )}

        {/* Un solo texto: un segundo texto fijo con `render` en otra posición no se dibujaba */}
        <Text
          style={e.pie}
          fixed
          render={({ pageNumber, totalPages }) => `${titulo}${d.version > 1 ? `, versión ${d.version}` : ""}. Página ${pageNumber} de ${totalPages}`}
        />
      </Page>
    </Document>
  );
}
