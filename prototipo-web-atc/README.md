# Gloss Salon - Prototipo Web ATC

Este documento sirve como contexto arquitectónico y de lógica de negocio para el módulo de Recepción (y eventualmente otros módulos) del sistema Gloss Salon. Su propósito es servir como mapa y "backup de conocimiento" para futuras modificaciones, asegurando que las reglas críticas de negocio no se rompan por accidente.

## Arquitectura del Proyecto

El proyecto está construido usando **Next.js** (React) y **Tailwind CSS**, y se conecta a **Supabase** como base de datos en tiempo real. 

Recientemente se refactorizó el "monolito" inicial en la siguiente estructura limpia para separar responsabilidades:

1. **Capa de Servicios (`src/services/recepcionService.js`)**:
   - Centraliza todas las llamadas a Supabase.
   - Contiene la lógica transaccional de base de datos (ej: `crearOatc`, `resolverOatc`, `eliminarOatc`, `iniciarAtencionOATC`).
   - **Manejo de Errores Crítico:** Las funciones aquí siempre deben hacer un `throw error` si la base de datos falla (por ejemplo, por restricciones de Enums o FKs), para asegurar que la interfaz de usuario se entere del fallo y no se produzcan "errores silenciosos".

2. **Capa de Lógica / Estado (`src/hooks/useRecepcion.js`)**:
   - Custom hook de React que maneja el estado local (`useState`) de la página.
   - Realiza la sincronización de datos con Supabase en tiempo real (usando `supabase.channel`).
   - Contiene la **lógica de negocio** al momento de interaccionar (las funciones manejadoras como `handleAction`, `handleComenzarAtencion`, `handleResolverOATC`). Aquí es donde saltan las alertas visuales (`SweetAlert2`) antes de invocar a la capa de servicios.

3. **Capa de Presentación (`src/components/recepcion/`)**:
   - Componentes "tontos" o puramente visuales que solo reciben *props* y emiten eventos.
   - `PanelIngreso.js`: Botonera superior de acciones del agente.
   - `PanelOrdenes.js`: Formulario de creación de OATC.
   - `TablaDisponibilidad.js`: Tabla de prioridad de agentes en la cola.
   - `TablaAtencion.js`: Tabla inferior de las órdenes activas del día.

4. **Contenedor Principal (`src/app/page.js`)**:
   - Simplemente inyecta el estado desde `useRecepcion` hacia los componentes de presentación. No debe contener lógica de base de datos ni validaciones complejas.

---

## Lógica de Negocio: Recepción y OATC

El corazón de la recepción gira en torno a los **Agentes** (estilistas) y las **OATC** (Órdenes de Atención al Cliente). 

### 1. El Ciclo de Vida del Agente (Asistencia)
La tabla de `control_asistencia` en Supabase utiliza una columna de tipo *Enum* estricto llamada `estado_texto` (basada en el tipo `estado_asistencia`).
Los estados permitidos (que deben coincidir exactamente, respetando mayúsculas/minúsculas y tildes) son:
- `Disponible`
- `En refrigerio`
- `Ausente`
- `Trabajando`
- `Asesorando`
- `Vendiendo`
- `Psicólogo`
- `Pasar la voz`
- `Salió del salón`
- `Pasar a otro salón`

**Regla de la Cola (Columna ACT):**
La posición de un agente en la tabla de disponibilidad (la cola) está determinada por su `ultima_act` (timestamp de última actividad), ordenada ascendentemente. 
- *Penalización:* Cuando un agente *termina* de hacer algo importante (regresar de refrigerio, o terminar de atender a un cliente), su `ultima_act` se actualiza al tiempo actual, mandándolo al final de la fila.
- *Preservación:* Si el agente está en estado `"Asesorando"`, NO pierde su lugar en la fila. Su `ultima_act` se mantiene intacta hasta que comience oficialmente el trabajo. Del mismo modo, si se *elimina* (cancela) una OATC asignada por error, el agente vuelve a `"Disponible"` SIN actualizar su `ultima_act` para no penalizarlo injustamente.

### 2. El Ciclo de Vida de una OATC (Orden de Atención)

Cuando se registra una nueva orden en el `PanelOrdenes`, el flujo es estrictamente el siguiente:

1. **Creación (Asesoramiento):** 
   - Al dar clic en "Registrar Orden" (a menos que sea pura Venta de Producto directo), se inserta el registro en la tabla `oatc`.
   - Automáticamente, el agente asignado cambia su estado en `control_asistencia` a **`Asesorando`** (color naranja). **No se actualiza `ultima_act`**.
   - En la tabla de Listado de Atención (inferior), aparecerá un botón amarillo llamado **"Atender"**.

2. **Inicio del Servicio (Trabajando):**
   - El agente recibe físicamente al cliente. Desde recepción (y en el futuro desde su propia app), se da clic en **"Atender"**.
   - Esto invoca `iniciarAtencionOATC`. El estado del agente cambia a **`Trabajando`** (color azul) y **AQUÍ SÍ se actualiza su `ultima_act`**, enviándolo al final de la cola de disponibilidad.
   - En la tabla inferior, el botón amarillo cambia al botón verde **"Resolver"**.

3. **Finalización del Servicio (Resolver):**
   - Una vez concluido el trabajo en piso, el agente avisa a recepción.
   - Se da clic en **"Resolver"**. Se llena la columna `resuelto_at` en la tabla `oatc` (con el timestamp actual).
   - El ticket queda marcado para "viajar" hacia el módulo de Caja.
   - El agente es regresado al estado **`Disponible`**, y se actualiza su `ultima_act` nuevamente (quedando al fondo de la cola, listo para el siguiente ciclo).

### 3. Contabilización de Trabajos (Q CLI y Q TUR)
Las columnas **Q CLI** (Cantidad de Clientes) y **Q TUR** (Cantidad de Turnos) son indicadores de la productividad del agente en el día.
- **Regla de Conteo:** Un cliente o turno **NUNCA** se cuenta mientras la OATC esté activa. **SOLO** se suman al contador cuando la OATC tiene el campo `resuelto_at` lleno (es decir, ya se hizo clic en "Resolver").
- Las ventas de productos no suman ni a Q CLI ni a Q TUR (salvo que en el futuro se decida habilitar una columna Q PROD).
- El custom hook filtra toda la data del día, separa las "no resueltas" para pintarlas en la tabla inferior, y usa "las resueltas" exclusivas del agente para calcular estos totales y mandarlos a la tabla de Disponibilidad.

---

## Recomendaciones Futuras

- **Cambios en la Base de Datos:** Si en el futuro el negocio requiere un nuevo estado para los agentes (ej: `Almorzando`), **es obligatorio primero correr un `ALTER TYPE` en Supabase** para añadir el valor al Enum `estado_asistencia`. De lo contrario, los registros fallarán silenciosamente.
- **Modificación de la UI:** Gracias a la separación de responsabilidades, si se quiere modificar cómo se ve un botón, solo se toca el archivo en `/components/recepcion/`. Si se quiere cambiar qué hace ese botón, se toca en `useRecepcion.js`. No se deben mezclar ambas cosas en un solo archivo.
