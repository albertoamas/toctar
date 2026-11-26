# P58 La foto de cada vehículo — especificación

- **Fase y semana:** pulido final (recorrido visual) · 26/11/2026
- **Estado:** aprobada (26/11/2026, por el desarrollador)
- **Historias:** pedido 58 (`03-cierre-comercial/registro-de-cambios.md`)
- **Base:** HU-21 a HU-23 (clientes y vehículos), pedido 51 (ficha del vehículo), pedido 31b (la foto del interesado),
  pedido 27 (fotos de la orden), RNF-07 (fotos comprimidas), D-6; `modelo-de-datos.md`

## 1. Objetivo

Que cada vehículo tenga una foto para saber de un vistazo cuál es, sobre todo cuando un cliente tiene varios o la placa
no se lee. El dueño la pidió desde el inicio; no estaba escrita en el alcance.

## 2. Alcance

- **Incluye:**
  - Una foto por vehículo, opcional. Cambiarla reemplaza a la anterior.
  - Se toma donde hoy se registra o edita un vehículo, con el mismo campo de la foto del interesado (`ElegirFoto`):
    Nuevo cliente, agregar y editar un vehículo (ficha del cliente y ficha del vehículo) y «Otro vehículo» en Nueva
    cotización y Nueva reserva.
  - Se llena sola, sin trabajo de más:
    - la foto que mandó un interesado al cotizar pasa a su vehículo cuando se registra al reservar;
    - la primera foto de inicio de una orden (el auto como llegó, pedido 27) pasa a ser la del vehículo, si no tiene.
  - Dónde se ve: arriba en la ficha del vehículo (con «Cambiar foto»); una miniatura en cada vehículo de la ficha del
    cliente; una miniatura en cada tarjeta para elegir el vehículo en Nueva cotización y Nueva reserva. Tocarla la abre
    grande en el visor de fotos del panel.
  - Sin foto, el recuadro gris con su ícono (el de las miniaturas de `ListaFilas`), del mismo tamaño, para que todo quede
    alineado.
- **No incluye:**
  - Varias fotos por vehículo ni una galería: las fotos de cada trabajo siguen en su orden.
  - La foto en el PDF de la cotización (sigue con las de la cotización).
  - Poner fotos a los vehículos que ya existen: se llenan solas con su próxima orden, o se cargan en «Editar».

## 3. Reglas que se cumplen

- **Datos de clientes, privados** (CLAUDE.md): la foto va al bucket privado (`guardarFoto(..., { privado: true })`) y
  se muestra con `urlsFotoPrivada`.
- **RNF-07:** se achica en el navegador antes de subirla (`achicarFoto`) y se guarda en WebP con miniatura.
- **RN-12 no aplica:** la foto no lleva montos; la ve quien ve Clientes, Cotizaciones o Agenda.
- **Sin JavaScript o sin foto,** el formulario se envía como siempre.
- **Una foto que se borra** (por ejemplo, de una orden) deja al vehículo sin foto: la columna es `on delete set null`.

## 4. Datos

- **`vehiculo.foto_archivo_id`:** integer, nulo, referencia a `archivo(id)` con `on delete set null`. Sin índice (se
  lee por vehículo).
- **Migración:** `0060_foto_del_vehiculo`.
- Sin datos iniciales. La demostración (`datos:demo`) pone la foto del Corolla de `material/fotos-demo` al vehículo de
  Carlos Fernández; los demás quedan sin foto, para ver los dos casos.

## 5. Pantallas y rutas

- **Formulario del vehículo** (`CamposVehiculo`, en todas las pantallas de §2): al final, «Foto del vehículo
  (opcional)» con «Sacar foto» y «Elegir de la galería», vista previa y «Quitar». Al editar uno con foto, se ve la
  actual con «Cambiar foto».
- **Ficha del vehículo:** la foto a la izquierda de la placa en el encabezado (80 px de ancho en el celular, 112 en la
  computadora); sin foto, el recuadro gris. Tocarla la abre en el visor.
- **Ficha del cliente:** en la tarjeta Vehículos, una miniatura de 64 px a la izquierda de cada placa.
- **Elegir el vehículo** (Nueva cotización, Nueva reserva): la misma miniatura en cada tarjeta.

## 6. Acciones del servidor

- `crearCliente`, `guardarVehiculo`, y el registro del vehículo en `crearCotizacion` y `agendarReserva`: aceptan el
  campo `foto` (un archivo, opcional). Si llega, se guarda privada en la carpeta `vehiculos` y se pone en el vehículo,
  en la misma transacción que el vehículo. Una foto inválida: «La foto debe ser JPG, PNG o WebP de hasta 5 MB. Prueba
  con otra o sigue sin ella.» (la misma de la foto del interesado) y no se guarda nada. Al reemplazar, la anterior se
  borra solo si se subió para el vehículo (carpeta `vehiculos/`): una que vino de una orden o de una cotización sigue
  siendo de ellas.
- `agendarReserva` de un interesado: la foto de su consulta pasa a `foto_archivo_id` del vehículo nuevo.
- Subir una foto de inicio a una orden (`subirFotoOrden`, etapa «antes»): si el vehículo no tiene foto, pasa a ser la
  suya (el mismo archivo, sin copiarlo). Si después se quita de la orden, el vehículo queda sin foto.

## 7. Componentes y diseño

- `ElegirFoto` y `useFotoInteresado` (se generaliza como `useFotoDelFormulario`) para elegir y achicar.
- Las miniaturas de las listas (Vehículos de la ficha del cliente, elegir el vehículo) son las de `ListaFilas`: 4:3, 64
  px de ancho, y sin foto el recuadro con `ImageOffIcon`. `ListaConNuevo` y `TarjetasParaElegir` reciben `miniatura`.
- Nuevo `FotoVehiculo` (`src/modulos/clientes/componentes/foto-vehiculo.tsx`): la del encabezado de la ficha del
  vehículo, igual pero más grande (80 px en el celular, 112 en la computadora), con el visor al tocarla.
  `EncabezadoPagina` recibe `imagen`, a la izquierda del título.
- El campo de la foto (`CampoFotoVehiculo`, dentro de `CamposVehiculo`): `ElegirFoto`, achicada al elegirla y puesta en
  un campo de archivo oculto (`{prefijo}foto`), así sirve en los cuatro formularios sin tocar cómo envían.
- Sin colores nuevos.

## 8. Textos de la interfaz

- Campo: «Foto del vehículo (opcional)», «Sacar foto», «Elegir de la galería», «Quitar», «Cambiar foto».
- Sin foto: el recuadro sin texto; para el lector, «Sin foto».
- Con foto: «Foto de {placa}» (texto alternativo) y «Ver la foto de {placa}» (el botón que la abre).
- Error: «La foto debe ser JPG, PNG o WebP de hasta 5 MB. Prueba con otra o sigue sin ella.»

## 9. Pruebas

- **Unitarias:** ninguna regla pura nueva.
- **De punta a punta:**
  - Nuevo cliente con foto: la ficha del vehículo y la del cliente la muestran.
  - Editar un vehículo y cambiar su foto: se ve la nueva.
  - Un interesado con foto que reserva: su vehículo queda con esa foto.
  - Recibir un vehículo sin foto y subir una foto a la orden: el vehículo queda con ella; uno que ya tenía, la conserva.
  - Elegir el vehículo en Nueva cotización: la tarjeta muestra su miniatura.

## 10. Orden de trabajo

Una rama, `p58-foto-del-vehiculo`, y un PR: la migración y el campo en los formularios; dónde se ve; el llenado
automático; las pruebas y la demostración.

## 11. Criterio de salida

Registrar un cliente con la foto de su auto, verla en las dos fichas y al elegirlo para cotizar; reservar a un
interesado con foto y ver que su vehículo la tiene. CI en verde.

## 12. Decisiones abiertas

Ninguna.
