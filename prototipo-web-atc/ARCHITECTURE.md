# Arquitectura del Sistema - GLOSS SALON

Este proyecto sigue una arquitectura de capas claras (Separation of Concerns) para garantizar su escalabilidad y evitar que cambios visuales rompan la lógica de negocio.

## Estructura de Directorios

```text
src/
├── app/                  # Páginas y enrutamiento (Next.js App Router)
├── components/           # Componentes visuales (UI) divididos por módulos
│   ├── recepcion/        # Componentes específicos de la Recepción
│   └── caja/             # Componentes específicos de Caja
├── hooks/                # Custom Hooks de React (Estado y lógica)
├── services/             # Funciones puras que interactúan con Supabase
└── lib/                  # Clientes e inicializaciones generales
```

## Reglas de Negocio Estrictas (¡NO MODIFICAR SIN AVISO!)

Para mantener la integridad de los datos entre Recepción, Caja y el control de Asistencia, existen reglas duras en el código que deben respetarse:

### 1. Estados de Asistencia (Agentes)
Los únicos estados válidos para `control_asistencia.estado_texto` son:
- `Disponible`
- `Trabajando` (Al asignarle una OATC tipo cliente/turno)
- `Asesorando` (Al asignarle una OATC tipo corrección)
- `Vendiendo` (Al registrar una venta en retail - temporalmente no afecta OATC)
- `En refrigerio`
- `Ausente`
- Estados personalizados temporales (`Psicólogo`, `Pasar la voz`, `Salió del salón`).

**Regla de Transición:** Ningún componente visual debe forzar un update a Supabase directamente. Deben llamar a `recepcionService.js`.

### 2. Estados de las Órdenes (OATC)
- Una orden "activa" en Recepción tiene `resuelto_at: null`.
- Cuando una orden se "Resuelve", se estampa el `resuelto_at` con la hora actual, e inmediatamente el agente asignado debe volver al estado `Disponible`. Esto envía la orden a la Caja.
- La Caja solo puede cobrar OATCs que tengan un `resuelto_at` válido y cuyo `estado_caja` sea `Pendiente`.

### 3. La Regla de "Ultima Actividad" (`ultima_act`)
La tabla de "Disponibilidad y Turnos" ordena a los agentes no solo por estado, sino por `ultima_act`. 
Cada vez que un agente cambia de estado (ej. de Trabajando a Disponible), **siempre** debe actualizarse el campo `ultima_act = now()`. Si esto se omite, el agente perderá su posición en la cola de prioridad de turnos.

## ¿Cómo crear un nuevo módulo?
1. **NO** crees un `page.js` gigante.
2. Crea un archivo en `/services` para tus consultas a Supabase.
3. Crea un Hook en `/hooks` para el estado local.
4. Desglosa la interfaz en componentes en `/components/tu-modulo`.
5. En `app/tu-modulo/page.js`, importa el hook e inyecta los datos a los componentes como *Props*.
