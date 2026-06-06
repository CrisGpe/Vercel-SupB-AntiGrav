/**
 * 📊 Gestión de Tabla de Turnos (Disponibilidad y Turnos) - Integración Supabase
 * Consulta las asistencias y calcula dinámicamente los contadores de OATC (Turnos y Clientes) de hoy.
 */

function obtenerFichasRegistradas() {
  return obtenerFichasFiltradasPorEspecialidad(null);
}

function obtenerFichasRegistradasHoyEstilismo() {
  return obtenerFichasFiltradasPorEspecialidad('Estilismo');
}

function obtenerFichasRegistradasHoyCosmiatria() {
  return obtenerFichasFiltradasPorEspecialidad('Cosmiatría');
}

function obtenerFichasRegistradasHoyOtros() {
  return obtenerFichasFiltradasPorEspecialidad('Otros');
}

/**
 * Función centralizada para obtener y formatear el estado de turnos de hoy
 * @param {string|null} especialidadFiltro - Especialidad para filtrar ('Estilismo', 'Cosmiatría', 'Otros', o null para todos)
 */
function obtenerFichasFiltradasPorEspecialidad(especialidadFiltro) {
  try {
    const fechaHoy = Utilities.formatDate(new Date(), "America/Lima", "yyyy-MM-dd");

    // 1. Obtener control_asistencia de hoy cruzado con datos de agentes
    const asistencias = Supabase.select("control_asistencia", `fecha=eq.${fechaHoy}&select=*,agentes(*)`);
    if (!asistencias || asistencias.length === 0) return [];

    // 2. Obtener OATCs de hoy para calcular contadores (Turnos y Clientes) por agente
    const oatcs = Supabase.select("oatc", `fecha=eq.${fechaHoy}&select=agente_id,categoria_demanda,hora_resuelto`);
    
    // Crear mapa de contadores en memoria
    const contadores = {};
    if (oatcs && oatcs.length > 0) {
      oatcs.forEach(o => {
        if (!o.agente_id) return;
        // Solo contar OATCs terminadas (con hora_resuelto no vacío/nulo)
        if (!o.hora_resuelto || String(o.hora_resuelto).trim() === "") return;

        if (!contadores[o.agente_id]) {
          contadores[o.agente_id] = { turnos: 0, clientes: 0 };
        }
        
        const cat = String(o.categoria_demanda).toLowerCase().trim();
        if (cat === 'turno') {
          contadores[o.agente_id].turnos++;
        } else if (cat === 'cliente') {
          contadores[o.agente_id].clientes++;
        }
      });
    }

    // 3. Ordenación proactiva y cronológica exacta de la cola de turnos
    // Ordenamos las asistencias antes de mapear para usar el objeto Date/ISO real
    asistencias.sort((a, b) => {
      // 1. Primer criterio: Estado
      const obtenerPrioridadEstado = (estado) => {
        const est = String(estado || '').trim().toLowerCase();
        if (est === 'disponible' || est === 'pasar la voz' || est === 'pasar-la-voz') return 1;
        if (est === 'trabajando') return 2;
        if (est === 'salida' || est === 'salió del salón' || est === 'salió-del-salón') return 4;
        return 3; // Cualquier otro estado
      };

      const prioA = obtenerPrioridadEstado(a.estado_texto);
      const prioB = obtenerPrioridadEstado(b.estado_texto);

      if (prioA !== prioB) {
        return prioA - prioB; // Menor número de prioridad va primero
      }

      // 2. Segundo criterio: Hora de última actividad (objeto Date/ISO real de Supabase)
      const timeA = a.ultima_act ? new Date(a.ultima_act).getTime() : 0;
      const timeB = b.ultima_act ? new Date(b.ultima_act).getTime() : 0;
      
      return timeA - timeB; // Orden ascendente cronológico
    });

    // 4. Mapear y formatear la data al array de 13 columnas esperado por la UI
    let resultado = asistencias.map(asist => {
      const agente = asist.agentes;
      if (!agente) return null;

      // Filtrar por especialidad en backend si es necesario
      if (especialidadFiltro) {
        const esp = String(agente.especialidad || 'Otros').trim();
        if (especialidadFiltro === 'Estilismo' && esp !== 'Estilismo') return null;
        if (especialidadFiltro === 'Cosmiatría' && esp !== 'Cosmiatría') return null;
        if (especialidadFiltro === 'Otros' && (esp === 'Estilismo' || esp === 'Cosmiatría')) return null;
      }

      const idAgente = agente.id;
      const turnosHoy = contadores[idAgente] ? contadores[idAgente].turnos : 0;
      const clientesHoy = contadores[idAgente] ? contadores[idAgente].clientes : 0;

      // Formatear timestamps para la visualización (ej: "10:05:00 PM")
      let ultimaActDisplay = "";
      if (asist.ultima_act) {
        const dateObj = new Date(asist.ultima_act);
        ultimaActDisplay = Utilities.formatDate(dateObj, "America/Lima", "hh:mm:ss a");
      }

      // Estructura exacta de 13 columnas del Borrador tradicional:
      return [
        asist.fecha,                       // [0] A: Fecha
        agente.apodo || agente.nombre_completo || "", // [1] B: Dependiente (Apodo)
        asist.entrada || "",               // [2] C: Entrada
        asist.ref_inicio || "",            // [3] D: Ref I
        asist.ref_termino || "",           // [4] E: Ref T
        asist.salida || "",                // [5] F: Salida
        String(turnosHoy),                 // [6] G: Cantidad Turnos (OATC)
        String(clientesHoy),               // [7] H: Cantidad Clientes (OATC)
        asist.estado_texto || "Ausente",   // [8] I: Estado Texto
        "0",                               // [9] J: Estado Valor (Obsoleto)
        agente.especialidad || "General",  // [10] K: Tipo Agente
        "",                                // [11] L: Especialidad Valor (Obsoleto)
        ultimaActDisplay                   // [12] M: Ult Act (Formatted time for display)
      ];
    }).filter(Boolean);

    console.log(`[Dashboard] Procesados ${resultado.length} registros de asistencia para la UI.`);
    return resultado;
  } catch (e) {
    console.error("Error en obtenerFichasFiltradasPorEspecialidad Supabase: " + e.message);
    return [];
  }
}