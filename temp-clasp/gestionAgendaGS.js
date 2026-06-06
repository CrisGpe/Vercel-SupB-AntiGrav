/**
 * 📅 Gestión de Agenda, Eventos y Ausencias del Staff - Integración Supabase
 * Todas las consultas y operaciones se ejecutan 100% en Supabase sin depender de Google Sheets.
 */

// --- CUMPLEAÑOS DE CLIENTES (SUPABASE) ---
function obtenerCumpleanosDelMes() {
  try {
    console.log("📡 Cargando cumpleaños de clientes desde Supabase...");
    const clis = Supabase.select("clientes", "select=nombre,apellido,fecha_nacimiento,celular") || [];
    const mesActual = new Date().getMonth(); // 0 = Enero, 1 = Febrero...
    const cumpleanos = [];

    clis.forEach((c, index) => {
      if (!c.fecha_nacimiento) return;
      const partes = c.fecha_nacimiento.split('-');
      if (partes.length === 3) {
        const mes = parseInt(partes[1], 10) - 1; // Convertir a 0-indexed
        const dia = parseInt(partes[2], 10);
        if (mes === mesActual) {
          cumpleanos.push({
            id: "CUMPLE_" + index,
            fecha: Utilities.formatDate(new Date(new Date().getFullYear(), mes, dia), "America/Lima", "dd/MM/yyyy"),
            descripcion: "🎂 Cumpleaños: " + (c.nombre || '') + " " + (c.apellido || ''),
            tipo: "Cumpleaños",
            telefono: c.celular ? c.celular.toString().replace(/[^0-9]/g, "") : "",
            estado: "Activo"
          });
        }
      }
    });
    return cumpleanos;
  } catch (e) {
    console.error("Error al obtener cumpleaños de clientes desde Supabase: " + e.message);
    return [];
  }
}

// --- CUMPLEAÑOS DEL PERSONAL / STAFF (SUPABASE) ---
function obtenerCumpleanosAgentes() {
  console.log("--- PROCESANDO CUMPLEAÑOS STAFF ---");
  try {
    const hoy = new Date();
    const mesActual = hoy.getMonth(); // 0 = Enero, 1 = Febrero...
    const anioActual = hoy.getFullYear();
    
    console.log("📡 Cargando cumpleaños del staff desde Supabase...");
    const agentes = Supabase.select("agentes", "estado=eq.Activo&select=nombre_completo,apodo,fecha_nacimiento") || [];
    const resultados = [];

    agentes.forEach((a, index) => {
      if (!a.fecha_nacimiento) return;
      const partes = a.fecha_nacimiento.split('-');
      if (partes.length === 3) {
        const mes = parseInt(partes[1], 10) - 1; // Convertir a 0-indexed
        const dia = parseInt(partes[2], 10);
        if (mes === mesActual) {
          const apodoONombre = a.apodo || a.nombre_completo;
          resultados.push({
            id: "CUMPLE_AGENTE_" + index,
            fecha: Utilities.formatDate(new Date(anioActual, mes, dia), "America/Lima", "dd/MM/yyyy"),
            descripcion: "🎉 STAFF: " + apodoONombre,
            tipo: "Cumpleaños"
          });
        }
      }
    });
    
    console.log("Total Staff detectado para este mes: " + resultados.length);
    return resultados;
  } catch (e) {
    console.error("Error en obtenerCumpleanosAgentes: " + e.message);
    return [];
  }
}

// --- CITAS PROGRAMADAS (SUPABASE) ---
function obtenerCitasCalendario() {
  try {
    console.log("📡 Cargando citas de calendario desde Supabase...");
    const citas = Supabase.select("registro_citas", "select=*") || [];
    return citas.map(c => ({
      id: c.id,
      agente: c.agente || "No asignado",
      fecha: c.fecha || "",
      hora: c.hora || "",
      cliente: c.cliente || "",
      servicio: c.servicio || ""
    }));
  } catch (e) {
    console.error("Error en obtenerCitasCalendario Supabase: " + e.message);
    return [];
  }
}

// --- EVENTOS Y TAREAS DE AGENDA (SUPABASE) ---
function obtenerEventosAgenda() {
  try {
    console.log("📡 Cargando eventos de agenda desde Supabase...");
    const datos = Supabase.select("agenda_eventos", "select=*&order=fecha.asc") || [];
    return datos.map(fila => ({
      id: fila.id,
      fecha: fila.fecha ? fila.fecha.split('-').reverse().join('/') : "", // YYYY-MM-DD -> DD/MM/YYYY
      tipo: fila.tipo || "Tarea",
      descripcion: fila.descripcion || "",
      estado: fila.estado || "Pendiente",
      prioridad: fila.prioridad || "Media"
    }));
  } catch (e) {
    console.error("Error en obtenerEventosAgenda Supabase: " + e.message);
    return [];
  }
}

function guardarNotaAgenda(objeto) {
  try {
    const fechaHoy = new Date();
    const idBase = Utilities.formatDate(fechaHoy, "GMT-5", "yyyyMMdd");
    
    // Generar ID correlativo
    const eventos = Supabase.select("agenda_eventos", `id=like.${idBase}*&select=id`) || [];
    let maxCorr = 0;
    eventos.forEach(ev => {
      const num = parseInt(ev.id.substring(8)) || 0;
      if (num > maxCorr) maxCorr = num;
    });
    const nuevoId = idBase + (maxCorr + 1).toString().padStart(4, '0');
    
    const fechaIso = Utilities.formatDate(fechaHoy, "America/Lima", "yyyy-MM-dd");
    
    const payload = {
      id: nuevoId,
      fecha: fechaIso,
      tipo: objeto.tipo || "Tarea",
      descripcion: objeto.descripcion || "",
      estado: "Pendiente",
      prioridad: objeto.prioridad || "Media"
    };
    Supabase.insert("agenda_eventos", payload);
    return "Registro guardado: " + nuevoId;
  } catch (e) {
    console.error("Error en guardarNotaAgenda Supabase: " + e.message);
    return "Error: " + e.message;
  }
}

function actualizarNotaAgenda(objeto) {
  try {
    Supabase.update("agenda_eventos", {
      tipo: objeto.tipo,
      descripcion: objeto.descripcion,
      prioridad: objeto.prioridad
    }, `id=eq.${objeto.id}`);
    return "Actualizado con éxito";
  } catch (e) {
    console.error("Error en actualizarNotaAgenda Supabase: " + e.message);
    return "Error: " + e.message;
  }
}

function actualizarEstadoEvento(id, nuevoEstado) {
  try {
    Supabase.update("agenda_eventos", { estado: nuevoEstado }, `id=eq.${id}`);
    return "Evento " + id + " actualizado a " + nuevoEstado;
  } catch (e) {
    console.error("Error en actualizarEstadoEvento Supabase: " + e.message);
    return "Error: " + e.message;
  }
}

// --- AUSENCIAS DE PERSONAL / STAFF (SUPABASE) ---
function guardarAusenciaAgente(objeto) {
  try {
    console.log("📡 Registrando ausencia en Supabase:", objeto);
    
    const payload = {
      agente_id: objeto.agenteId,
      fecha_inicio: objeto.fechaInicio,
      fecha_fin: objeto.fechaFin,
      motivo: objeto.motivo,
      comentario: objeto.comentario || ""
    };
    
    Supabase.insert("ausencias_agentes", payload);
    return "Ausencia registrada con éxito.";
  } catch (e) {
    console.error("Error en guardarAusenciaAgente: " + e.message);
    return "Error: " + e.message;
  }
}

function obtenerAusenciasAgentes() {
  try {
    console.log("📡 Cargando ausencias desde Supabase...");
    const data = Supabase.select("ausencias_agentes", "select=*,agentes(nombre_completo,apodo)") || [];
    return data.map(aus => {
      const ag = aus.agentes || { nombre_completo: "Agente", apodo: "" };
      const apodoONombre = ag.apodo || ag.nombre_completo;
      
      const fInicio = aus.fecha_inicio ? aus.fecha_inicio.split('-').reverse().join('/') : "";
      const fFin = aus.fecha_fin ? aus.fecha_fin.split('-').reverse().join('/') : "";
      
      return {
        id: aus.id,
        fecha: fInicio,
        fechaFin: fFin,
        descripcion: `✈️ AUSENCIA: ${apodoONombre} - Motivo: ${aus.motivo} (Desde ${fInicio} hasta ${fFin}) ${aus.comentario ? '| ' + aus.comentario : ''}`,
        estado: "Ausente",
        prioridad: "Alta",
        tipo: "Ausencia"
      };
    });
  } catch (e) {
    console.error("Error en obtenerAusenciasAgentes Supabase: " + e.message);
    return [];
  }
}

// --- ACCIÓN GENERAL DE ELIMINACIÓN ---
function eliminarRegistroAgenda(id, tipo) {
  try {
    const tipoLimpio = String(tipo || '').trim().toLowerCase();
    if (tipoLimpio === 'cita') {
      Supabase.delete("registro_citas", `id=eq.${id}`);
      return "Cita eliminada";
    } else if (tipoLimpio === 'ausencia') {
      Supabase.delete("ausencias_agentes", `id=eq.${id}`);
      return "Ausencia eliminada";
    } else {
      Supabase.delete("agenda_eventos", `id=eq.${id}`);
      return "Registro eliminado";
    }
  } catch (e) {
    console.error("Error en eliminarRegistroAgenda: " + e.message);
    return "Error: " + e.message;
  }
}

// --- MÉTODO UNIFICADO CORE ---
function obtenerDatosAgendaCompletos() {
  const res = {
    eventosAgenda: [],
    cumples: [],
    cumplesStaff: [],
    citas: []
  };

  try {
    res.eventosAgenda = obtenerEventosAgenda();
    // Integrar las ausencias en el listado para renderizar de manera transparente
    const ausencias = obtenerAusenciasAgentes();
    res.eventosAgenda = res.eventosAgenda.concat(ausencias);
  } catch(e) {
    console.error("Error al cargar eventos de agenda y ausencias: " + e.message);
  }

  try {
    res.cumples = obtenerCumpleanosDelMes();
  } catch(e) {
    console.error("Error al cargar cumpleaños del mes: " + e.message);
  }

  try {
    res.cumplesStaff = obtenerCumpleanosAgentes();
  } catch(e) {
    console.error("Error al cargar cumpleaños de agentes: " + e.message);
  }

  try {
    res.citas = obtenerCitasCalendario();
  } catch(e) {
    console.error("Error al cargar citas del calendario: " + e.message);
  }

  return JSON.stringify(res);
}

function obtenerAgentesActivosBasico() {
  try {
    const data = Supabase.select("agentes", "estado=eq.Activo&select=id,nombre_completo,apodo") || [];
    return JSON.stringify(data);
  } catch (e) {
    console.error("Error en obtenerAgentesActivosBasico: " + e.message);
    return JSON.stringify([]);
  }
}