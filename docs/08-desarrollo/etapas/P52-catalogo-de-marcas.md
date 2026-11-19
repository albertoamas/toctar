# P52 Marcas de vehículo y menos escritura al registrar un vehículo — especificación

- **Fase y semana:** estandarización del panel (C7, fase 2) · 19/11/2026
- **Estado:** aprobada (18/11/2026, por el desarrollador). El 19/11: el modelo queda como texto simple, sin sugerencias
- **Historias:** pedido 52 (`03-cierre-comercial/registro-de-cambios.md`)
- **Base:** RF de clientes y vehículos (HU-23), RN-07 (tamaños), D-6 (se desactiva, no se borra); `modelo-de-datos.md`

## 1. Objetivo

Registrar un vehículo escribiendo menos y sin variantes de la misma marca ("Toyota", "toyota", "Toyta"): la marca se
elige de una lista que el dueño administra; el año y el color se eligen. El modelo se escribe, como siempre.

## 2. Alcance

- **Incluye:**
  - Una lista de marcas en Configuración → Taller, como los espacios, los tamaños y las partes: agregar, renombrar, ordenar y desactivar.
  - En todo formulario de vehículo (Nuevo cliente, Agregar y editar vehículo, el vehículo nuevo de Nueva cotización):
    - **Marca:** se elige de la lista, con búsqueda. Si no está, "Agregar «X»": se guarda en el vehículo y se suma sola a la lista.
    - **Modelo:** un texto simple, como estaba ("Hilux"), sin sugerencias.
    - **Año:** un selector, del año que viene hasta 1950 (la misma regla que hoy: `ANIO_MINIMO` y `anioMaximo`).
    - **Color:** los frecuentes en botones (Blanco, Negro, Gris, Plata, Rojo, Azul) y "Otro" para escribirlo.
- **No incluye:**
  - Modelos: ni base ni sugerencias (decidido el 19/11). El modelo sigue siendo texto libre.
  - Cambiar los vehículos que ya existen: guardan la marca y el modelo como texto, igual que hoy. Una marca vieja que no está en la lista se sigue mostrando en su vehículo.
  - El servicio con búsqueda al cotizar: es otra parte de la fase 2.

## 3. Reglas

- La marca, el modelo, el año y el color siguen siendo opcionales (hoy lo son).
- Una marca no se repite sin importar mayúsculas (índice único en `lower(nombre)`, como los tamaños). El vehículo guarda la marca escrita como está en la lista.
- Una marca desactivada no se ofrece en los formularios; los vehículos que la tienen la conservan.
- El año, entre 1950 y el año que viene (`anioMaximo`), en la interfaz y en el servidor, como hoy.

## 4. Datos

- **Tabla nueva `marca_vehiculo`:** `id` (identity), `nombre` (texto, no nulo), `orden` (entero, no nulo), `activo` (bool, por defecto true). Índice único `marca_vehiculo_nombre_unico` en `lower(nombre)`.
- **Migraciones:** `0050_marcas_vehiculo` (la tabla) y `0051_datos_marcas` (datos iniciales).
- **Datos iniciales:** las marcas que ya tienen los vehículos (sin repetir por mayúsculas) y las comunes en Bolivia: Toyota, Nissan, Suzuki, Hyundai, Kia, Mitsubishi, Mazda, Chevrolet, Volkswagen, Ford, Honda, Subaru, Jeep, Renault, BYD, Chery, JAC, Great Wall, Changan, Isuzu. En orden alfabético. El dueño las cambia en el panel.

## 5. Pantallas

- **Configuración → Taller:** "Marcas de vehículo", la misma lista editable que las demás.
- **Formularios de vehículo:** los campos de §2, en el mismo lugar que hoy (plegados en "Agregar marca, modelo, año y color" en el alta).

## 6. Acciones del servidor

- Las de las listas de Configuración (`guardarElemento`, `moverElemento`, `cambiarEstadoElemento`) suman `marcas`.
- Al guardar un vehículo (crear cliente con vehículo, agregar o editar vehículo, vehículo nuevo al cotizar): si la marca no está en la lista, se agrega; si está con otras mayúsculas, se guarda como en la lista. En la misma transacción.

## 7. Componentes

- `CampoConBusqueda` (nuevo, sobre el `Combobox` de Base UI, ya instalado) para la marca; `Selector` para el año; `OpcionesEnTarjetas` para el color.

## 8. Textos

- Marca: "Elige la marca" · sin resultados: "No está en la lista." · "Agregar «X»".
- Año: "Elige el año".
- Color: "Otro" y su campo "Color".

## 9. Pruebas

- **Unitarias:** la marca escrita como en la lista (mayúsculas); los años del selector.
- **E2E:** registrar un vehículo eligiendo la marca; "Agregar «X»" suma la marca a la lista; la lista en Configuración.

## 10. Orden de trabajo

Rama `p52-marcas-vehiculo` (sale de la fase 1), un commit por parte.
