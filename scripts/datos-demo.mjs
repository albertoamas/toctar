// Datos de demostración para mostrarle el sistema al dueño: el sitio público completo (textos de cada servicio, fotos,
// galería, portada, logo y redes) y el panel con movimiento de esta semana (clientes, consultas, reservas, órdenes en
// el taller, un saldo pendiente, mantenimientos y un reclamo). Las fechas son relativas a hoy, en hora de Bolivia.
//
// Uso:  npm run datos:demo                      (fotos en material/fotos-demo, fuera de Git)
//       npm run datos:demo -- --fotos=<carpeta>
// Requisitos: una base recién migrada, con el dueño ya creado (al arrancar la app, src/lib/arranque.ts), y los
// buckets del almacenamiento. Solo corre sobre una base sin clientes ni trabajos: nunca pisa datos de verdad.
// Después, reinicia la app: el sitio guarda en caché los datos del negocio, los servicios y la galería, y como este
// script escribe directo en la base (no por el panel), la caché no se entera.
//
// Los precios, los clientes y los trabajos son inventados (de demostración): los reales los carga el dueño.
// Fotos que espera la carpeta, en WebP, JPG o PNG (las que no estén, se saltan con un aviso):
//   logo · portada · servicio-<slug> (una por servicio) · las de GALERIA (abajo).
import { randomBytes, randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { hashPassword } from "better-auth/crypto";
import pg from "pg";
import sharp from "sharp";

const carpetaFotos = process.argv.find((a) => a.startsWith("--fotos="))?.slice("--fotos=".length) ?? "material/fotos-demo";
const ZONA = "America/La_Paz";

const base = new pg.Client({ connectionString: process.env.DATABASE_URL });
const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION ?? "auto",
  credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY },
  forcePathStyle: true,
});
const q = async (sql, valores = []) => (await base.query(sql, valores)).rows;
const uno = async (sql, valores = []) => (await q(sql, valores))[0];

// ---------------------------------------------------------------------------------------------
// Fechas: hoy en Bolivia y días alrededor (como src/lib/fechas.ts)

const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: ZONA }).format(new Date());
const dia = (desplazamiento) => {
  const d = new Date(`${hoy}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + desplazamiento);
  return d.toISOString().slice(0, 10);
};
/** Un momento de un día, a una hora de Bolivia (UTC-4, sin horario de verano). */
const momento = (desplazamiento, hora) => `${dia(desplazamiento)}T${hora}:00-04:00`;
/** Igual que sumarMeses (src/lib/fechas.ts): el 31/01 + 1 da el último día de febrero. */
function sumarMeses(fecha, meses) {
  const [anio, mes, d] = fecha.split("-").map(Number);
  const total = anio * 12 + (mes - 1) + meses;
  const [nuevoAnio, nuevoMes] = [Math.floor(total / 12), (total % 12) + 1];
  const ultimo = new Date(Date.UTC(nuevoAnio, nuevoMes, 0)).getUTCDate();
  return `${nuevoAnio}-${String(nuevoMes).padStart(2, "0")}-${String(Math.min(d, ultimo)).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------------------------
// Fotos: como guardarFoto (src/lib/fotos.ts): WebP de 1600 px y miniatura de 640, registradas en `archivo`

const EXTENSIONES = [".webp", ".jpg", ".jpeg", ".png"];

/** Sube la foto `nombre` (sin extensión) de la carpeta, en el formato que esté; null si no está. */
async function subirFoto(nombre, carpeta, autorId) {
  const ruta = EXTENSIONES.map((e) => join(carpetaFotos, nombre + e)).find((r) => existsSync(r));
  if (!ruta) {
    console.warn(`  · Falta ${join(carpetaFotos, nombre)} (${EXTENSIONES.join(", ")}): se sigue sin esa foto.`);
    return null;
  }
  const original = readFileSync(ruta);
  const convertir = (lado) =>
    sharp(original).rotate().resize({ width: lado, height: lado, fit: "inside", withoutEnlargement: true }).webp({ quality: 85 }).toBuffer({ resolveWithObject: true });
  const [grande, chica] = await Promise.all([convertir(1600), convertir(640)]);
  const clave = `${carpeta}/${randomUUID()}`;
  const subir = (k, cuerpo) => s3.send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: k, Body: cuerpo, ContentType: "image/webp" }));
  await subir(`${clave}.webp`, grande.data);
  await subir(`${clave}-640.webp`, chica.data);
  const fila = await uno(
    `insert into archivo (clave, tipo_mime, bytes, ancho, alto, miniatura_clave, privado, created_by)
     values ($1, 'image/webp', $2, $3, $4, $5, false, $6) returning id`,
    [`${clave}.webp`, grande.info.size, grande.info.width, grande.info.height, `${clave}-640.webp`, autorId],
  );
  return fila.id;
}

// ---------------------------------------------------------------------------------------------
// Contenido del sitio: lo que falta en cada servicio (los nombres y resúmenes vienen de las migraciones)
// Beneficios: [texto, ícono] (las claves de src/modulos/sitio/beneficios.ts). `escalera`: opciones de menor a mayor.

const SERVICIOS = {
  "lavado-de-interior": {
    beneficios: [["Sin polvo ni manchas", "limpieza"], ["Plásticos y tapiz cuidados", "interior"], ["Olor a limpio", "aire"], ["Más agradable para manejar", "vehiculo"]],
    pasos: [
      ["Aspirado completo", "Asientos, alfombras, maletero y los rincones donde se junta la arena."],
      ["Plásticos y tablero", "Con cepillos de detailing en rejillas, botones y costuras."],
      ["Vidrios por dentro", "Sin marcas ni empañado."],
      ["Revisión final", "Revisamos cada rincón antes de entregarte el vehículo."],
    ],
  },
  "limpieza-de-asientos-por-inyeccion-y-succion": {
    beneficios: [["Sin manchas ni olores", "interior"], ["Limpieza profunda", "limpieza"], ["Sin marcas de agua", "agua"]],
    pasos: [
      ["Aspirado", "Sacamos el polvo y lo que está suelto."],
      ["Inyección del producto", "El limpiador entra en el tapiz y suelta la suciedad."],
      ["Succión", "La máquina saca el producto junto con la suciedad."],
      ["Secado", "Te entregamos los asientos listos para usar."],
    ],
  },
  "pulido-y-nano-ceramico": {
    escalera: true,
    beneficios: [["Protege del sol (UV)", "sol"], ["Repele agua y suciedad", "agua"], ["Resiste el excremento de aves", "aves"], ["Mantiene el brillo", "brillo"], ["Facilita el lavado", "limpieza"]],
    pasos: [
      ["Lavado técnico y descontaminación", "Quitamos el polvo, la grasa y los residuos pegados a la pintura."],
      ["Pulido", "Corregimos rayones finos y marcas para dejar la pintura pareja."],
      ["Nano cerámico", "Aplicamos la capa panel por panel, en un ambiente controlado."],
      ["Curado", "La capa se asienta antes de que te llevemos el vehículo."],
      ["Entrega con manual", "Te explicamos los cuidados para que la capa dure lo que promete."],
    ],
  },
  "pulido-de-vidrios": {
    beneficios: [["Ves mejor, de día y de noche", "visibilidad"], ["Sin manchas de agua dura", "agua"], ["Más fáciles de limpiar", "limpieza"]],
    pasos: [
      ["Limpieza", "Sacamos la suciedad y la grasa de la superficie."],
      ["Pulido", "Quitamos las manchas con compuestos para vidrio."],
      ["Revisión con luz", "Comprobamos que el vidrio quede parejo y transparente."],
    ],
  },
  "restauracion-de-faroles-con-polimero": {
    beneficios: [["Más luz de noche", "luz"], ["Se ve más nuevo", "vehiculo"], ["Sellado para que dure", "proteccion"]],
    pasos: [
      ["Protección", "Cubrimos la pintura alrededor del farol."],
      ["Lijado y pulido", "Quitamos la capa opaca y amarilla."],
      ["Sellado con polímero", "Protegemos el farol para que no se opaque pronto."],
    ],
  },
  "polarizado-de-vidrios": {
    beneficios: [["Menos calor adentro", "calor"], ["Más privacidad", "privacidad"], ["Protege el interior del sol", "sol"]],
    pasos: [
      ["Limpieza de los vidrios", "Sin polvo ni grasa, para que la lámina pegue bien."],
      ["Corte a medida", "Una lámina por vidrio, a su forma exacta."],
      ["Instalación", "Sin burbujas ni pliegues."],
      ["Secado", "Te decimos cuándo puedes bajar las ventanas."],
    ],
  },
  "instalacion-de-ppf": {
    beneficios: [["Contra piedras y rayones", "proteccion"], ["Casi invisible", "visibilidad"], ["Se quita sin dañar la pintura", "listo"]],
    pasos: [
      ["Lavado y descontaminación", "La pintura limpia, para que la película pegue bien."],
      ["Corte de la película", "A la medida de cada pieza."],
      ["Instalación", "Sin burbujas, con los bordes bien sellados."],
      ["Revisión", "Revisamos cada borde antes de entregarte el vehículo."],
    ],
  },
  "mantenimiento-del-nano-ceramico": {
    beneficios: [["La capa dura más", "duracion"], ["El brillo se mantiene", "brillo"], ["Revisamos el recubrimiento", "listo"]],
    // Sus pasos ya vienen de las migraciones
  },
};

/** Precios de demostración (Bs) por tamaño, en el orden de los tamaños; null es "según evaluación". */
const PRECIOS = {
  "pulido-y-nano-ceramico": {
    "1 año": [700, 800, 950, 1100, 1400],
    "2 años": [900, 1000, 1150, 1300, 1650],
    "3 años": [1100, 1200, 1350, 1550, 1900],
    "5 años": [1400, 1550, 1750, 2000, 2400],
    "10 años": [2000, 2200, 2500, 2800, 3300],
  },
  "lavado-de-interior": { Básico: [120, 150, 180, 220, 280], Premium: [220, 260, 300, 350, 420] },
  "limpieza-de-asientos-por-inyeccion-y-succion": { Única: [200, 220, 260, 300, 380] },
  "pulido-de-vidrios": { Única: [150, 170, 200, 230, 280] },
  "restauracion-de-faroles-con-polimero": { Única: [180, 180, 200, 220, 250] },
  "polarizado-de-vidrios": { Única: [450, 500, 600, 700, 850] },
  "instalacion-de-ppf": { Única: [null, null, null, null, null] },
  "mantenimiento-del-nano-ceramico": { Única: [null, null, null, null, null] },
};

/** Trabajos terminados para la galería: la foto y de qué servicio es. */
const GALERIA = [
  { foto: "galeria-corolla", servicio: "pulido-y-nano-ceramico", descripcion: "Toyota Corolla con pulido y nano cerámico de 5 años" },
  { foto: "galeria-bmw", servicio: "pulido-y-nano-ceramico", descripcion: "BMW con pulido y nano cerámico, lista para entregar" },
];

// ---------------------------------------------------------------------------------------------

await base.connect();
try {
  const dueno = await uno("select id from usuario where rol = 'dueno' order by id limit 1");
  if (!dueno) throw new Error("No hay dueño: arranca la app una vez (crea el dueño de .env) y vuelve a correr este script.");
  const [{ clientes }] = await q("select (select count(*) from cliente)::int + (select count(*) from trabajo)::int as clientes");
  if (clientes > 0) throw new Error("La base ya tiene clientes o trabajos: los datos de demostración solo se cargan en una base nueva.");
  const autor = dueno.id;
  const servicio = Object.fromEntries((await q("select id, slug, nombre from servicio")).map((s) => [s.slug, s]));
  const tamanos = await q("select id from tamano_vehiculo where activo order by orden");
  const espacios = await q("select id from espacio_taller where activo order by orden");
  const sucursal = await uno("select id, horarios from sucursal order by id limit 1");
  // Los días sin turnos el taller está cerrado (1 = lunes … 7 = domingo): ningún trabajo empieza, termina ni se cobra ese día
  const cerrados = new Set(sucursal.horarios.filter((h) => h.turnos.length === 0).map((h) => h.dia));
  /** El desplazamiento más cercano en un día abierto: hacia adelante si es futuro; hacia atrás si es hoy o pasado. */
  const habil = (desplazamiento) => {
    let d = desplazamiento;
    const diaSemana = (x) => new Date(`${dia(x)}T12:00:00Z`).getUTCDay() || 7;
    while (cerrados.has(diaSemana(d))) d += desplazamiento > 0 ? 1 : -1;
    return d;
  };
  const momentoHabil = (desplazamiento, hora) => momento(habil(desplazamiento), hora);
  const variante = async (slug, nombre) => uno("select id, nombre from variante where servicio_id = $1 and nombre = $2", [servicio[slug].id, nombre]);

  await base.query("begin");

  // 1. El personal: un encargado y un técnico, con contraseñas al azar (se muestran al final)
  console.log("Personal…");
  const contrasenas = {};
  async function usuario(nombreUsuario, nombre, rol, permisos = []) {
    const contrasena = randomBytes(9).toString("base64url");
    const fila = await uno(
      `insert into usuario (nombre, correo, nombre_usuario, rol, desactivado, updated_at) values ($1, $2, $3, $4, false, now()) returning id`,
      [nombre, `${nombreUsuario}@usuarios.toctar.local`, nombreUsuario, rol],
    );
    await q(`insert into cuenta (id_en_proveedor, proveedor, usuario_id, contrasena, updated_at) values ($1, 'credential', $2, $3, now())`, [
      String(fila.id),
      fila.id,
      await hashPassword(contrasena),
    ]);
    for (const p of permisos) await q("insert into usuario_permiso (usuario_id, permiso) values ($1, $2)", [fila.id, p]);
    contrasenas[nombreUsuario] = contrasena;
    return fila.id;
  }
  await usuario("ana.taller", "Ana Rojas", "encargado", ["agenda", "ordenes", "pagos", "clientes", "consultas", "mantenimientos", "reclamos"]);
  const tecnico = await usuario("luis.tecnico", "Luis Mamani", "tecnico");

  // 2. El negocio: logo, redes y ubicación. El WhatsApp es de ejemplo: el real lo carga el dueño
  console.log("Negocio…");
  const logo = await subirFoto("logo", "negocio", autor);
  await q(
    `update negocio set logo_archivo_id = coalesce($1, logo_archivo_id), redes = $2, updated_at = now(), updated_by = $3 where id = 1`,
    [
      logo,
      JSON.stringify({
        facebook: "https://www.facebook.com/p/Toc-Tar-Detailing-car-Tarija-61561191430244/",
        instagram: "https://www.instagram.com/toctar_detailing_tarija/",
        tiktok: "https://www.tiktok.com/@toctar.detailing",
      }),
      autor,
    ],
  );
  await q(
    `update sucursal set telefono_whatsapp = coalesce(telefono_whatsapp, '59171234567'), lat = coalesce(lat, -21.545978), lng = coalesce(lng, -64.708352),
       updated_at = now(), updated_by = $2 where id = $1`,
    [sucursal.id, autor],
  );

  // 3. El sitio: la foto de la portada, la página de cada servicio y la galería
  console.log("Sitio…");
  const portada = await subirFoto("portada", "portada", autor);
  if (portada) await q("update contenido_pagina set foto_archivo_id = $1, updated_at = now(), updated_by = $2 where clave = 'inicio'", [portada, autor]);
  for (const [slug, s] of Object.entries(SERVICIOS)) {
    const foto = await subirFoto(`servicio-${slug}`, "servicios", autor);
    await q(
      `update servicio set beneficios = $2, pasos = coalesce($3, pasos), foto_archivo_id = coalesce($4, foto_archivo_id),
         opciones_en_escalera = $6, updated_at = now(), updated_by = $5 where slug = $1`,
      [slug, JSON.stringify(s.beneficios.map(([texto, icono]) => ({ texto, icono }))), s.pasos ? JSON.stringify(s.pasos.map(([titulo, detalle]) => ({ titulo, detalle }))) : null, foto, autor, s.escalera ?? false],
    );
  }
  for (const [i, g] of GALERIA.entries()) {
    const foto = await subirFoto(g.foto, "galeria", autor);
    if (!foto) continue;
    await q(`insert into galeria_item (servicio_id, foto_despues_id, descripcion, orden, visible, created_by) values ($1, $2, $3, $4, true, $5)`, [
      servicio[g.servicio].id,
      foto,
      g.descripcion,
      i + 1,
      autor,
    ]);
  }

  // 4. Precios de demostración por variante y tamaño
  console.log("Precios…");
  for (const [slug, porVariante] of Object.entries(PRECIOS)) {
    for (const [nombre, montos] of Object.entries(porVariante)) {
      const v = await variante(slug, nombre);
      for (const [i, monto] of montos.entries()) {
        await q("insert into precio (variante_id, tamano_id, monto, created_by) values ($1, $2, $3, $4)", [v.id, tamanos[i].id, monto, autor]);
      }
    }
  }
  const precio = async (slug, nombreVariante, tamano) =>
    (await uno("select monto from precio where variante_id = $1 and tamano_id = $2 order by id desc limit 1", [(await variante(slug, nombreVariante)).id, tamanos[tamano - 1].id])).monto;

  // 5. Clientes y sus vehículos (tamaño: 1 compactos … 5 extra grandes)
  console.log("Clientes…");
  async function cliente(nombre, telefono, vehiculo, notas = null) {
    const c = await uno("insert into cliente (nombre, telefono, notas, created_by, created_at) values ($1, $2, $3, $4, $5) returning id", [
      nombre,
      telefono,
      notas,
      autor,
      momento(-30, "10:00"),
    ]);
    const v = await uno(
      `insert into vehiculo (cliente_id, placa, tamano_id, marca, modelo, anio, color, created_by) values ($1, $2, $3, $4, $5, $6, $7, $8) returning id`,
      [c.id, vehiculo.placa, tamanos[vehiculo.tamano - 1].id, vehiculo.marca, vehiculo.modelo, vehiculo.anio, vehiculo.color, autor],
    );
    return { cliente: c.id, vehiculo: v.id };
  }
  const carlos = await cliente("Carlos Fernández", "59170010001", { placa: "2345KLM", tamano: 2, marca: "Toyota", modelo: "Corolla", anio: 2019, color: "Blanco" }, "Cliente desde el año pasado; prefiere que le escriban por la tarde.");
  const maria = await cliente("María José Vaca", "59170010002", { placa: "4567BDF", tamano: 3, marca: "Toyota", modelo: "RAV4", anio: 2021, color: "Gris" });
  const jorge = await cliente("Jorge Quiroga", "59170010003", { placa: "3456GHT", tamano: 4, marca: "Toyota", modelo: "Hilux", anio: 2020, color: "Negro" });
  const rodrigo = await cliente("Rodrigo Mendoza", "59170010004", { placa: "5678JKR", tamano: 3, marca: "Hyundai", modelo: "Tucson", anio: 2022, color: "Azul" });
  const valeria = await cliente("Valeria Gutiérrez", "59170010005", { placa: "2789HNB", tamano: 1, marca: "Kia", modelo: "Picanto", anio: 2017, color: "Rojo" });
  const daniela = await cliente("Daniela Ortiz", "59170010006", { placa: "1890PLM", tamano: 1, marca: "Suzuki", modelo: "Swift", anio: 2018, color: "Plata" });
  const fernando = await cliente("Fernando Rocha", "59170010007", { placa: "6789TRS", tamano: 4, marca: "Toyota", modelo: "Land Cruiser Prado", anio: 2023, color: "Blanco" });
  const gabriela = await cliente("Gabriela Soliz", "59170010008", { placa: "3901MZD", tamano: 2, marca: "Mazda", modelo: "3", anio: 2020, color: "Rojo" });

  // 6. Consultas: una nueva, una que se enfría (más de 7 días sin movimiento) y una perdida
  console.log("Consultas…");
  async function consultaDe(c, slug, canal, creada, nota, perdida = null) {
    await q(
      `insert into consulta (cliente_id, vehiculo_id, servicio_id, canal, estado, motivo_perdida, detalle_perdida, nota, ultimo_movimiento_at, created_at, created_by)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9, $10)`,
      [c.cliente, c.vehiculo, servicio[slug].id, canal, perdida ? "perdido" : "consulto", perdida?.motivo ?? null, perdida?.detalle ?? null, nota, creada, autor],
    );
  }
  await consultaDe(daniela, "pulido-de-vidrios", "whatsapp", momento(-1, "18:20"), "Manchas de agua dura en el parabrisas. Mandó fotos por WhatsApp.");
  await consultaDe(fernando, "instalacion-de-ppf", "taller", momento(-9, "11:00"), "Quiere PPF solo en el capó y los parachoques. Vino al taller a preguntar.");
  await consultaDe(gabriela, "polarizado-de-vidrios", "whatsapp", momento(-14, "16:45"), "Polarizado completo.", { motivo: "precio", detalle: "Le pareció caro; lo va a pensar." });

  // 7. Trabajos: reservas de esta semana, órdenes en el taller, una entregada con saldo y dos que ya volverán
  console.log("Agenda y órdenes…");
  /**
   * Un trabajo con sus líneas (al precio de la tabla para el tamaño del vehículo), pagos y avances. `pagos` recibe el
   * total, así lo pagado cierra con los precios; `conSaldo` deja el saldo pendiente registrado al entregar.
   */
  async function trabajoDe(c, datos) {
    const { orden: tamano } = await uno("select t.orden from vehiculo v join tamano_vehiculo t on t.id = v.tamano_id where v.id = $1", [c.vehiculo]);
    const lineas = [];
    for (const [slug, nombreVariante] of datos.lineas) {
      const v = await variante(slug, nombreVariante);
      const descripcion = nombreVariante.toLowerCase() === "única" ? servicio[slug].nombre : `${servicio[slug].nombre} (${nombreVariante})`;
      lineas.push({ varianteId: v.id, descripcion, precio: Number(await precio(slug, nombreVariante, tamano)) });
    }
    const total = lineas.reduce((suma, l) => suma + l.precio, 0);
    const pagos = datos.pagos ? datos.pagos(total) : [];
    const saldoAlEntregar = datos.conSaldo ? total - pagos.reduce((suma, p) => suma + p.monto, 0) : null;

    const t = await uno(
      `insert into trabajo (sucursal_id, cliente_id, vehiculo_id, espacio_id, fecha_inicio, fecha_fin, hora_ingreso, tecnico_id, estado, nota,
         observaciones_ingreso, recibido_at, recibido_por, listo_at, entregado_at, entregado_por, entrega_con_saldo_autorizada_por, saldo_al_entregar,
         created_at, created_by)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20) returning id`,
      [
        sucursal.id,
        c.cliente,
        c.vehiculo,
        espacios[datos.espacio - 1].id,
        dia(habil(datos.desde)),
        dia(habil(datos.hasta)),
        datos.hora ?? null,
        datos.tecnico ?? null,
        datos.estado,
        datos.nota ?? null,
        datos.observaciones ?? null,
        datos.recibido ?? null,
        datos.recibido ? autor : null,
        datos.listo ?? null,
        datos.entregado ?? null,
        datos.entregado ? autor : null,
        saldoAlEntregar ? autor : null,
        saldoAlEntregar,
        datos.creado,
        autor,
      ],
    );
    for (const [orden, l] of lineas.entries()) {
      await q("insert into trabajo_linea (trabajo_id, variante_id, descripcion, precio, orden) values ($1, $2, $3, $4, $5)", [t.id, l.varianteId, l.descripcion, l.precio, orden]);
    }
    for (const p of pagos) {
      await q("insert into pago (trabajo_id, monto, metodo, tipo, fecha, created_at, created_by) values ($1, $2, $3, $4, $5, $6, $7)", [
        t.id,
        p.monto,
        p.metodo,
        p.tipo,
        dia(habil(p.dia)),
        momentoHabil(p.dia, "10:00"),
        autor,
      ]);
    }
    for (const [cuando, quien, nota] of datos.avances ?? []) {
      await q("insert into trabajo_avance (trabajo_id, usuario_id, nota, created_at) values ($1, $2, $3, $4)", [t.id, quien, nota, cuando]);
    }
    return t.id;
  }
  // Reservas que vienen
  await trabajoDe(carlos, {
    espacio: 1, desde: 2, hasta: 3, hora: "a las 8:30", tecnico, estado: "agendado", creado: momentoHabil(-2, "17:10"),
    lineas: [["pulido-y-nano-ceramico", "3 años"]],
    pagos: () => [{ monto: 300, metodo: "qr", tipo: "adelanto", dia: -2 }],
  });
  await trabajoDe(maria, {
    espacio: 2, desde: 4, hasta: 4, hora: "en la mañana", estado: "agendado", creado: momentoHabil(-1, "12:30"),
    lineas: [["lavado-de-interior", "Premium"], ["limpieza-de-asientos-por-inyeccion-y-succion", "Única"]],
  });
  // En el taller: una en proceso y una lista sin avisar
  await trabajoDe(jorge, {
    espacio: 3, desde: -1, hasta: 1, hora: "a las 9", tecnico, estado: "en_proceso", creado: momentoHabil(-6, "15:00"),
    observaciones: "Rayón leve en la puerta trasera derecha. Deja una caja de herramientas en la tolva.",
    recibido: momentoHabil(-1, "09:05"),
    lineas: [["pulido-y-nano-ceramico", "5 años"]],
    pagos: () => [{ monto: 500, metodo: "efectivo", tipo: "adelanto", dia: -6 }],
    avances: [
      [momentoHabil(-1, "09:05"), autor, "Vehículo recibido."],
      [momentoHabil(-1, "10:00"), tecnico, "Pasó a en proceso."],
      [momentoHabil(0, "11:30"), tecnico, "Pulido terminado. Mañana aplicamos el nano cerámico."],
    ],
  });
  await trabajoDe(rodrigo, {
    espacio: 1, desde: -1, hasta: 0, tecnico, estado: "listo", creado: momentoHabil(-4, "09:40"),
    recibido: momentoHabil(-1, "15:00"), listo: momentoHabil(0, "11:00"),
    lineas: [["restauracion-de-faroles-con-polimero", "Única"]],
    avances: [
      [momentoHabil(-1, "15:00"), autor, "Vehículo recibido."],
      [momentoHabil(-1, "15:30"), tecnico, "Pasó a en proceso."],
      [momentoHabil(0, "11:00"), tecnico, "Pasó a lista."],
    ],
  });
  // Entregada hace 20 días con saldo: aparece en Saldos pendientes
  await trabajoDe(valeria, {
    espacio: 2, desde: -21, hasta: -20, estado: "entregado", creado: momentoHabil(-25, "10:00"),
    recibido: momentoHabil(-21, "09:00"), listo: momentoHabil(-20, "12:00"), entregado: momentoHabil(-20, "17:30"), conSaldo: true,
    lineas: [["lavado-de-interior", "Básico"], ["pulido-de-vidrios", "Única"]],
    pagos: () => [{ monto: 150, metodo: "efectivo", tipo: "adelanto", dia: -25 }],
  });
  // Entregadas hace unos meses, pagadas: sus mantenimientos (uno vencido y uno que viene)
  // Su plan (pedido 21): el mantenimiento y la frecuencia que dice el catálogo del pulido
  const plan = await uno("select mantenimiento_servicio_id as m, mantenimiento_meses as meses from servicio where slug = 'pulido-y-nano-ceramico'");
  for (const [c, hace, capa] of [
    [carlos, 95, "1 año"],
    [maria, 80, "2 años"],
  ]) {
    const entregado = dia(habil(-hace));
    const id = await trabajoDe(c, {
      espacio: 3, desde: -hace - 1, hasta: -hace, estado: "entregado", creado: momentoHabil(-hace - 7, "10:00"),
      recibido: momentoHabil(-hace - 1, "09:00"), listo: momentoHabil(-hace, "12:00"), entregado: momentoHabil(-hace, "17:00"),
      lineas: [["pulido-y-nano-ceramico", capa]],
      pagos: (total) => [
        { monto: 300, metodo: "qr", tipo: "adelanto", dia: -hace - 7 },
        { monto: total - 300, metodo: "efectivo", tipo: "saldo", dia: -hace },
      ],
    });
    await q(
      `insert into recordatorio_mantenimiento (trabajo_origen_id, cliente_id, vehiculo_id, servicio_id, servicio_mantenimiento_id, intervalo_meses, fecha_programada, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, c.cliente, c.vehiculo, servicio["pulido-y-nano-ceramico"].id, plan.m, plan.meses, sumarMeses(entregado, plan.meses), momentoHabil(-hace, "17:00")],
    );
  }

  // 8. Un reclamo que llegó desde el sitio
  console.log("Reclamo…");
  await q(
    `insert into reclamo (nombre, telefono, placa, servicio_id, descripcion, ip_hash, created_at) values ($1, $2, $3, $4, $5, 'demostracion', $6)`,
    [
      "Pablo Suárez",
      "59170010009",
      "4512PQS",
      servicio["restauracion-de-faroles-con-polimero"].id,
      "Hace dos meses restauraron los faroles y el derecho se volvió a poner un poco opaco. ¿Lo pueden revisar?",
      momento(-2, "20:15"),
    ],
  );

  await base.query("commit");
  console.log("\nListo. Datos de demostración cargados para", hoy, "(hoy en Bolivia).");
  console.log("Personal de prueba (guárdalo; no se vuelve a mostrar):");
  for (const [u, c] of Object.entries(contrasenas)) console.log(`  ${u}  ${c}`);
  console.log("El WhatsApp del negocio es de ejemplo (59171234567): cámbialo en Configuración si hace falta.");
} catch (error) {
  await base.query("rollback").catch(() => {});
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await base.end();
}
