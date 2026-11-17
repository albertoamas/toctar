// Seis meses de movimiento para probar Reportes (pedido 16): trabajos entregados con sus servicios y pagos, gastos por
// categoría, cotizaciones (aceptadas, perdidas con su motivo y reservadas) y mantenimientos avisados. Se suma a una base
// que ya tiene sus datos (la local o la de pruebas, por un túnel), sin tocar lo demás.
//
//   npm run datos:reportes            agrega (o rehace) los datos de reportes
//   npm run datos:reportes -- --quitar   los quita
//
// Todo lo que agrega se reconoce por la marca de sus clientes (MARCA) y por los gastos con la hora 10:00:00.777777: al
// volver a correrlo, primero borra lo de la vez anterior. Solo contra una base en localhost (la PC o un túnel), nunca
// directo a un servidor. Los números siguen la forma del taller: más trabajo cada mes, el alquiler fijo, los insumos
// según lo que se trabajó y unos dos tercios de cotizaciones aceptadas.

import pg from "pg";

const MARCA = "Datos de reportes (npm run datos:reportes)";
const HORA_GASTO = "10:00:00.777777";
const ZONA = "America/La_Paz";

const url = process.env.DATABASE_URL ?? "";
if (!/@(localhost|127\.0\.0\.1)[:/]/.test(url)) {
  console.error("DATABASE_URL tiene que apuntar a localhost (la base de la PC o un túnel). No se cargó nada.");
  process.exit(1);
}
const base = new pg.Client({ connectionString: url });
const q = async (sql, valores = []) => (await base.query(sql, valores)).rows;
const uno = async (sql, valores = []) => (await q(sql, valores))[0];

// Un azar que siempre da lo mismo: dos corridas cargan los mismos datos
let semilla = 20261117;
const azar = () => ((semilla = (semilla * 1103515245 + 12345) % 2147483648) / 2147483648);
const entre = (min, max) => Math.round(min + azar() * (max - min));
const elegir = (opciones) => {
  const total = opciones.reduce((s, [, peso]) => s + peso, 0);
  let r = azar() * total;
  for (const [valor, peso] of opciones) if ((r -= peso) <= 0) return valor;
  return opciones.at(-1)[0];
};

const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: ZONA }).format(new Date());
const fecha = (anio, mes, dia) => `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
const diasDe = (anio, mes) => new Date(Date.UTC(anio, mes, 0)).getUTCDate();
const momento = (dia, hora) => `${dia}T${hora}-04:00`;

async function quitar() {
  const clientes = (await q("select id from cliente where notas = $1", [MARCA])).map((c) => c.id);
  if (clientes.length) {
    const trabajos = (await q("select id from trabajo where cliente_id = any($1)", [clientes])).map((t) => t.id);
    await q("delete from recordatorio_mantenimiento where cliente_id = any($1)", [clientes]);
    await q("delete from pago where trabajo_id = any($1)", [trabajos]);
    await q("delete from trabajo_linea where trabajo_id = any($1)", [trabajos]);
    await q("delete from trabajo where id = any($1)", [trabajos]);
    const consultas = (await q("select id from consulta where cliente_id = any($1)", [clientes])).map((c) => c.id);
    await q("delete from cotizacion_linea where cotizacion_id in (select id from cotizacion where consulta_id = any($1))", [consultas]);
    await q("delete from cotizacion where consulta_id = any($1)", [consultas]);
    await q("delete from consulta where id = any($1)", [consultas]);
    await q("delete from vehiculo where cliente_id = any($1)", [clientes]);
    await q("delete from cliente where id = any($1)", [clientes]);
  }
  const gastos = await q(`delete from gasto where (created_at at time zone '${ZONA}')::time = $1::time returning id`, [HORA_GASTO]);
  console.log(`Quitados: ${clientes.length} clientes con sus trabajos y cotizaciones, ${gastos.length} gastos.`);
}

async function cargar() {
  const autor = (await uno("select id from usuario where rol = 'dueno' order by id limit 1"))?.id;
  if (!autor) throw new Error("La base no tiene un dueño: corre la app una vez antes.");
  const sucursal = await uno("select id from sucursal order by id limit 1");
  const espacios = await q("select id from espacio_taller where activo order by orden");
  const tamanos = await q("select id, orden from tamano_vehiculo where activo order by orden");
  const categorias = Object.fromEntries((await q("select id, nombre from categoria_gasto where activo")).map((c) => [c.nombre, c.id]));
  const categoria = (nombre) => categorias[nombre] ?? Object.values(categorias)[0];
  if (!Object.keys(categorias).length) throw new Error("No hay categorías de gasto: aplica las migraciones (npm run db:migrate).");
  // Los servicios que se venden, con lo que se pide de cada uno (peso)
  const precios = await q(
    `select s.slug, s.nombre as servicio, v.id as variante_id, v.nombre as variante, t.orden as tamano, p.monto
     from precio p join variante v on v.id = p.variante_id and v.activo join servicio s on s.id = v.servicio_id
     join tamano_vehiculo t on t.id = p.tamano_id
     where p.monto is not null and p.id in (select max(id) from precio group by variante_id, tamano_id)`,
  );
  const PEDIDOS = [
    ["lavado-de-interior", 30],
    ["pulido-y-nano-ceramico", 26],
    ["limpieza-de-asientos-por-inyeccion-y-succion", 14],
    ["polarizado-de-vidrios", 10],
    ["pulido-de-vidrios", 8],
    ["restauracion-de-faroles-con-polimero", 7],
  ].filter(([slug]) => precios.some((p) => p.slug === slug));
  if (!PEDIDOS.length) throw new Error("El catálogo no tiene precios: carga los datos de demostración antes (npm run datos:demo).");
  const lineaDe = (slug, tamano) => {
    const opciones = precios.filter((p) => p.slug === slug && p.tamano === tamano);
    if (!opciones.length) return null;
    const p = opciones[entre(0, opciones.length - 1)];
    return { varianteId: p.variante_id, descripcion: p.variante.toLowerCase() === "única" ? p.servicio : `${p.servicio} (${p.variante})`, precio: Number(p.monto) };
  };

  // Los clientes: 70, con un vehículo cada uno; muchos vuelven en otros meses
  const NOMBRES = ["Ana", "Luis", "Carla", "Jorge", "Sofía", "Diego", "Paola", "Marco", "Lucía", "Andrés", "Gabriela", "Pablo", "Daniela", "Rodrigo"];
  const APELLIDOS = ["Rocha", "Mamani", "Flores", "Vargas", "Gutiérrez", "Quispe", "Torrez", "Soliz", "Paz", "Ríos", "Arce", "Medina"];
  const MARCAS = [["Toyota", "Corolla"], ["Toyota", "Hilux"], ["Suzuki", "Swift"], ["Hyundai", "Tucson"], ["Kia", "Rio"], ["Nissan", "Sentra"], ["Toyota", "RAV4"], ["Mazda", "3"]];
  const clientes = [];
  for (let n = 0; n < 70; n++) {
    const c = await uno("insert into cliente (nombre, telefono, notas, created_by, created_at) values ($1, $2, $3, $4, now() - interval '7 months') returning id", [
      `${NOMBRES[n % NOMBRES.length]} ${APELLIDOS[(n * 7) % APELLIDOS.length]}`,
      `5917${String(7000000 + n * 137).slice(0, 7)}`,
      MARCA,
      autor,
    ]);
    const tamano = tamanos[entre(0, Math.min(3, tamanos.length - 1))];
    const [marca, modelo] = MARCAS[n % MARCAS.length];
    const v = await uno(
      "insert into vehiculo (cliente_id, placa, tamano_id, marca, modelo, anio, color, created_by) values ($1, $2, $3, $4, $5, $6, 'Gris', $7) returning id",
      [c.id, `${4100 + n}RP${String.fromCharCode(65 + (n % 26))}`, tamano.id, marca, modelo, entre(2014, 2024), autor],
    );
    clientes.push({ id: c.id, vehiculo: v.id, tamano: tamano.orden, tamanoId: tamano.id });
  }

  const [anioHoy, mesHoy, diaHoy] = hoy.split("-").map(Number);
  const meses = Array.from({ length: 6 }, (_, k) => {
    const total = anioHoy * 12 + (mesHoy - 1) - (5 - k);
    return { anio: Math.floor(total / 12), mes: (total % 12) + 1, k };
  });
  const { ultimo: correlativo } = (await uno("select ultimo from correlativo where clave = $1", [`cotizacion-${anioHoy}`])) ?? { ultimo: 0 };
  let numero = correlativo;
  let trabajos = 0, pagos = 0, gastos = 0, cotizaciones = 0, avisos = 0;

  for (const { anio, mes, k } of meses) {
    const actual = anio === anioHoy && mes === mesHoy;
    const ultimoDia = actual ? diaHoy - 1 : diasDe(anio, mes);
    if (ultimoDia < 1) continue;
    // Más trabajo cada mes (de ~22 a ~32 entregados), en proporción a los días que van del mes
    const entregados = Math.round((22 + k * 2 + entre(-2, 2)) * (ultimoDia / diasDe(anio, mes)));
    const delMes = [];
    for (let n = 0; n < entregados; n++) {
      const c = clientes[entre(0, clientes.length - 1)];
      const dia = entre(1, ultimoDia);
      const servicios = [elegir(PEDIDOS)];
      if (azar() < 0.25) servicios.push(elegir(PEDIDOS.filter(([s]) => s !== servicios[0])));
      const lineas = servicios.map((s) => lineaDe(s, c.tamano)).filter(Boolean);
      if (!lineas.length) continue;
      const largo = servicios.includes("pulido-y-nano-ceramico") ? 1 : 0;
      const fin = Math.min(dia + largo, ultimoDia);
      const t = await uno(
        `insert into trabajo (sucursal_id, cliente_id, vehiculo_id, espacio_id, fecha_inicio, fecha_fin, estado, recibido_at, recibido_por, listo_at,
           entregado_at, entregado_por, created_at, created_by)
         values ($1, $2, $3, $4, $5, $6, 'entregado', $7, $8, $9, $10, $8, $11, $8) returning id`,
        [
          sucursal.id, c.id, c.vehiculo, espacios[n % espacios.length].id, fecha(anio, mes, dia), fecha(anio, mes, fin),
          momento(fecha(anio, mes, dia), "09:00:00"), autor, momento(fecha(anio, mes, fin), "15:00:00"), momento(fecha(anio, mes, fin), "17:30:00"),
          momento(fecha(anio, mes, Math.max(1, dia - 2)), "11:00:00"),
        ],
      );
      for (const [orden, l] of lineas.entries()) {
        await q("insert into trabajo_linea (trabajo_id, variante_id, descripcion, precio, orden) values ($1, $2, $3, $4, $5)", [t.id, l.varianteId, l.descripcion, l.precio, orden]);
      }
      // Cómo se paga: un adelanto al reservar (a veces) y el saldo al entregar
      const total = lineas.reduce((s, l) => s + l.precio, 0);
      const metodo = () => elegir([["efectivo", 40], ["qr", 38], ["transferencia", 22]]);
      const partes = azar() < 0.45 ? [["adelanto", Math.round(total * 0.3), Math.max(1, dia - 2)], ["saldo", total - Math.round(total * 0.3), fin]] : [["saldo", total, fin]];
      for (const [tipo, monto, d] of partes) {
        await q("insert into pago (trabajo_id, monto, metodo, tipo, fecha, created_at, created_by) values ($1, $2, $3, $4, $5, $6, $7)", [
          t.id, monto, metodo(), tipo, fecha(anio, mes, d), momento(fecha(anio, mes, d), "12:00:00"), autor,
        ]);
        pagos++;
      }
      delMes.push({ trabajo: t.id, cliente: c, dia, servicios, lineas, total });
      trabajos++;
    }

    // Los gastos: el alquiler fijo, los servicios básicos, los insumos según lo trabajado y algún imprevisto
    const gasto = async (nombre, monto, dia, metodo, detalle) => {
      if (dia > ultimoDia) return;
      await q(
        `insert into gasto (sucursal_id, categoria_id, monto, metodo, fecha, detalle, created_at, created_by) values ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [sucursal.id, categoria(nombre), monto, metodo, fecha(anio, mes, dia), detalle, `${fecha(anio, mes, dia)} ${HORA_GASTO}${"-04:00"}`, autor],
      );
      gastos++;
    };
    await gasto("Alquiler del local", 2000, 1, "transferencia", "Alquiler del mes");
    await gasto("Luz, agua e internet", entre(380, 520), 10, "efectivo", "Factura de luz");
    await gasto("Luz, agua e internet", entre(90, 140), 12, "efectivo", "Factura de agua");
    await gasto("Luz, agua e internet", 260, 5, "qr", "Internet del taller");
    const compras = 3 + Math.round(entregados / 9);
    for (let n = 0; n < compras; n++) await gasto("Insumos y productos", entre(280, 1300), entre(1, 28), elegir([["qr", 45], ["transferencia", 30], ["efectivo", 25]]), elegir([["Cera y compuestos de pulido", 3], ["Microfibras y paños", 2], ["Kit de nano cerámico", 2], ["Shampoo y desengrasante", 2], ["Lámina de polarizado", 1]]));
    for (let n = 0; n < entre(1, 3); n++) await gasto("Otros", entre(80, 480), entre(1, 28), "efectivo", elegir([["Repuesto de la pulidora", 1], ["Bolsas y etiquetas", 2], ["Mantenimiento de la hidrolavadora", 1], ["Refrigerios", 1]]));

    // Las cotizaciones del mes: unos dos tercios aceptadas (la mayoría ya reservadas: se atan a un trabajo del mes)
    const cuantas = Math.round(delMes.length * 1.25);
    for (let n = 0; n < cuantas; n++) {
      const resultado = elegir([["confirmado", 62], ["perdido", 26], ["cotizado", 12]]);
      const motivo = resultado === "perdido" ? elegir([["precio", 55], ["no_respondio", 35], ["otro", 10]]) : null;
      const atado = resultado === "confirmado" ? delMes[n % Math.max(1, delMes.length)] : null;
      const c = atado?.cliente ?? clientes[entre(0, clientes.length - 1)];
      const lineas = atado?.lineas ?? [lineaDe(elegir(PEDIDOS), c.tamano)].filter(Boolean);
      if (!lineas.length) continue;
      const dia = Math.max(1, (atado?.dia ?? entre(3, ultimoDia)) - entre(1, 3));
      const creada = momento(fecha(anio, mes, dia), "16:00:00");
      const total = lineas.reduce((s, l) => s + l.precio, 0);
      const consulta = await uno(
        `insert into consulta (cliente_id, vehiculo_id, estado, motivo_perdida, detalle_perdida, ultimo_movimiento_at, created_at, created_by)
         values ($1, $2, $3, $4, $5, $6, $6, $7) returning id`,
        [c.id, c.vehiculo, resultado, motivo, motivo === "otro" ? "Lo hará más adelante" : null, creada, autor],
      );
      numero++;
      const { doc } = await uno(
        `select json_build_object('cliente', json_build_object('nombre', c.nombre, 'telefono', c.telefono),
           'vehiculo', json_build_object('placa', v.placa, 'descripcion', concat_ws(' ', v.marca, v.modelo), 'tamano', t.nombre),
           'negocio', json_build_object('nombre', n.nombre, 'razonSocial', n.razon_social, 'nit', n.nit, 'whatsapp', s.telefono_whatsapp, 'direccion', s.direccion)) as doc
         from cliente c join vehiculo v on v.cliente_id = c.id join tamano_vehiculo t on t.id = v.tamano_id cross join negocio n
         cross join (select telefono_whatsapp, direccion from sucursal order by id limit 1) s where c.id = $1 and v.id = $2 limit 1`,
        [c.id, c.vehiculo],
      );
      const cot = await uno(
        `insert into cotizacion (consulta_id, numero, version, es_estimado, subtotal, descuento, total, adelanto_sugerido, valida_hasta, condiciones, garantia,
           formas_pago, datos_documento, estado, created_by, created_at)
         values ($1, $2, 1, false, $3, 0, $3, least(200, $3::numeric), ($4::timestamptz at time zone '${ZONA}')::date + 15, '', '', '', $5, $6, $7, $4) returning id`,
        [consulta.id, `${anio}-${String(numero).padStart(4, "0")}-R`, total, creada, doc, resultado === "confirmado" ? "aceptada" : "enviada", autor],
      );
      for (const [orden, l] of lineas.entries()) {
        await q("insert into cotizacion_linea (cotizacion_id, variante_id, tamano_id, descripcion, precio_sugerido, precio, orden) values ($1, $2, $3, $4, $5, $5, $6)", [cot.id, l.varianteId, c.tamanoId, l.descripcion, l.precio, orden]);
      }
      if (atado && azar() < 0.85) await q("update trabajo set consulta_id = $2 where id = $1", [atado.trabajo, consulta.id]);
      cotizaciones++;
    }

    // Mantenimientos: algunos nano cerámicos de hace un tiempo, avisados este mes; la mitad ya reservó (lo hecho, como hecho)
    const nano = delMes.filter((d) => d.servicios.includes("pulido-y-nano-ceramico"));
    const servicioNano = await uno("select id from servicio where slug = 'pulido-y-nano-ceramico'");
    const servicioMant = await uno("select id from servicio where slug = 'mantenimiento-del-nano-ceramico'");
    if (servicioNano && servicioMant) {
      for (const [n, d] of nano.slice(0, 8).entries()) {
        const hecho = n % 2 === 0;
        const diaAviso = Math.min(d.dia, ultimoDia);
        await q(
          `insert into recordatorio_mantenimiento (trabajo_origen_id, cliente_id, vehiculo_id, servicio_id, servicio_mantenimiento_id, intervalo_meses,
             fecha_programada, estado, avisado_at, avisado_por, trabajo_hecho_id, created_at)
           values ($1, $2, $3, $4, $5, 6, $6, $7, $8, $9, $10, $8)
           on conflict do nothing`,
          [null, d.cliente.id, d.cliente.vehiculo, servicioNano.id, servicioMant.id, fecha(anio, mes, diaAviso), hecho ? "hecho" : "avisado", momento(fecha(anio, mes, diaAviso), "10:30:00"), autor, hecho ? d.trabajo : null],
        );
        avisos++;
      }
    }
  }
  console.log(`Cargados, en 6 meses: ${trabajos} trabajos entregados con ${pagos} pagos, ${gastos} gastos, ${cotizaciones} cotizaciones y ${avisos} mantenimientos avisados.`);
}

await base.connect();
try {
  await base.query("begin");
  await quitar();
  if (!process.argv.includes("--quitar")) await cargar();
  await base.query("commit");
} catch (error) {
  await base.query("rollback");
  console.error("No se cargó nada:", error.message);
  process.exitCode = 1;
} finally {
  await base.end();
}
