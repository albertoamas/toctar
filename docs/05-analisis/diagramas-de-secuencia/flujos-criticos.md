# Diagramas de secuencia — flujos críticos

- **Versión:** borrador 1 · 9 de octubre de 2026
- **Base:** `05-analisis/casos-de-uso/casos-de-uso.md`

Cubren el recorrido completo de un trabajo: consulta → cotización → reserva → ingreso → trabajo → aviso → entrega → mantenimiento. Están a nivel de análisis: "Servidor" es el sistema sin entrar en tecnologías, que se definen en el diseño (etapa 6).

**Participantes:** el actor, la App (PWA en el celular o la PC), el Servidor, el Almacenamiento de fotos y WhatsApp (el teléfono del usuario).

## 1. Consulta y cotización en PDF (CU-10, CU-11)

```mermaid
sequenceDiagram
    actor D as Dueño
    participant A as App
    participant S as Servidor
    participant F as Almacenamiento de fotos
    participant W as WhatsApp

    D->>A: Nueva consulta (teléfono o placa)
    A->>S: Buscar cliente
    alt Cliente nuevo
        S-->>A: Sin resultados
        D->>A: Datos del cliente y del vehículo
        A->>S: Crear cliente y vehículo
    else Cliente existente
        S-->>A: Cliente y vehículos
    end
    D->>A: Servicio de interés, canal y fotos
    A->>F: Subir fotos (comprimidas)
    A->>S: Guardar consulta
    S-->>A: Consulta en estado "consultó"

    D->>A: Cotizar
    A->>S: Pedir precios del catálogo para el tamaño del vehículo
    S-->>A: Precios sugeridos y adelanto sugerido
    D->>A: Ajusta precios, descuento y fotos del PDF
    A->>S: Guardar cotización
    Note over S: Verifica rol dueño (RN-01)<br/>Congela precios (RN-02)
    S->>S: Generar PDF
    S-->>A: PDF listo · consulta en "cotizado"
    D->>A: Compartir
    A->>W: Menú de compartir del teléfono con el PDF
    Note over D,W: El dueño elige el chat y envía
```

## 2. Reserva con adelanto (CU-13, CU-17)

```mermaid
sequenceDiagram
    actor P as Personal
    participant A as App
    participant S as Servidor

    P->>A: Marcar cotización como confirmada y agendar
    A->>S: Pedir duración del servicio
    S-->>A: Duración sugerida (días)
    P->>A: Fecha de ingreso
    A->>S: Consultar espacios libres en esos días
    S-->>A: Espacios disponibles
    alt Sin espacio libre
        A-->>P: Aviso: elegir otra fecha
    else Hay espacio
        P->>A: Espacio, técnico (opcional) y adelanto
        A->>S: Guardar reserva y pago de adelanto
        Note over S: Revalida que el espacio siga libre (RN-06)
        S-->>A: Reserva creada · consulta en "confirmado"
    end
```

La segunda validación en el servidor evita que dos personas reserven el mismo espacio al mismo tiempo.

## 3. Ingreso del vehículo y trabajo del técnico (CU-15, CU-16)

```mermaid
sequenceDiagram
    actor P as Personal
    actor T as Técnico
    participant A as App
    participant S as Servidor
    participant F as Almacenamiento de fotos

    P->>A: Recibir vehículo (desde la reserva)
    P->>A: Fotos de ingreso y observaciones
    A->>F: Subir fotos
    A->>S: Crear orden
    S-->>A: Orden en "recibido"

    T->>A: Mis órdenes
    A->>S: Pedir órdenes del técnico
    Note over S: Solo las asignadas, sin precios (RN-12)
    S-->>A: Lista de órdenes
    T->>A: Pasar a "en proceso" y subir fotos de antes
    A->>F: Subir fotos
    A->>S: Actualizar orden
    loop Durante el trabajo
        T->>A: Avances, notas y fotos
        A->>S: Actualizar orden
    end
    T->>A: Fotos de después y marcar "listo"
    A->>S: Orden en "listo"
```

## 4. Aviso, cobro del saldo y entrega (CU-18, CU-17, CU-19)

```mermaid
sequenceDiagram
    actor P as Personal
    actor D as Dueño
    participant A as App
    participant S as Servidor
    participant W as WhatsApp

    P->>A: Orden lista → Avisar
    A->>S: Pedir mensaje con nombre, vehículo y saldo
    S-->>A: Mensaje armado
    A->>W: Abrir chat con el mensaje escrito
    A->>S: Registrar que se avisó

    Note over P: El cliente llega a retirar
    P->>A: Entregar vehículo
    A->>S: Pedir precio final, pagos y saldo
    S-->>A: Saldo pendiente
    P->>A: Registrar pago del saldo
    A->>S: Guardar pago
    alt Saldo en cero
        A->>S: Marcar entregado
    else Queda saldo
        D->>A: Autorizar entrega con saldo
        A->>S: Marcar entregado
        Note over S: Verifica dueño o permiso de encargado (RN-13)
    end
    opt El servicio genera mantenimiento
        S->>S: Próximo mantenimiento = entrega + intervalo (RN-08)
    end
    S-->>A: Orden cerrada
```

## 5. Recordatorio de mantenimiento (CU-20)

```mermaid
sequenceDiagram
    actor P as Personal
    participant A as App
    participant S as Servidor
    participant W as WhatsApp

    P->>A: Abrir Mantenimientos
    A->>S: Pedir vencidos y por vencer
    S-->>A: Lista ordenada por fecha
    P->>A: Avisar a un cliente
    A->>W: Abrir chat con el mensaje escrito
    P->>A: Marcar resultado
    alt Agendado
        A->>S: Crear reserva directa del mantenimiento (ver flujo 2)
    else Avisado o no interesado
        A->>S: Guardar resultado
    end
```

No hay envío automático: el sistema prepara el mensaje y la persona lo envía. Los avisos automáticos (API de WhatsApp) quedan fuera del alcance.
