/**
 * 📅 Gestión de Agenda, Eventos, Ausencias del Staff y Citas - Integración Supabase
 * Consolida la lógica de gestionAgendaGS.js, gestionCitasGS.js y registrarCita.js.
 */

// ==========================================
// DESDE: gestionAgendaGS.js
// ==========================================

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


// ==========================================
// DESDE: gestionCitasGS.js
// ==========================================

function obtenerCitasRegistradasEnAdelante() {
  const libro = SpreadsheetApp.openById("1SXuedQigLxVUF2oxn65wEZ5-HnDDiVdy7lY7HaweVC4");
  const hojaCitas = libro.getSheetByName("Registro Citas"); 
  
  // --- DEBUG: IDENTIFICACIÓN DE COLUMNAS ---
  const encabezados = hojaCitas.getRange(1, 1, 1, 7).getValues()[0];
  console.log("DEBUG(Servidor): Encabezados detectados:", encabezados);
  // Se espera: [A:Timestamp, B:Fecha, C:Hora, D:Cliente, E:TipoCliente, F:Agente, G:Servicio]
  
  const hoySinHora = new Date();
  hoySinHora.setHours(0, 0, 0, 0); 

  const ultimaFilaGlobal = hojaCitas.getLastRow();
  if (ultimaFilaGlobal < 2) {
    console.log("DEBUG(Servidor): La hoja está vacía o solo tiene encabezados.");
    return [];
  }

  const datosCitas = hojaCitas.getRange(2, 1, ultimaFilaGlobal - 1, 7).getValues();
  const datosCitasDisplay = hojaCitas.getRange(2, 1, ultimaFilaGlobal - 1, 7).getDisplayValues();

  console.log("DEBUG(Servidor): Total filas leídas:", datosCitas.length);
  if (datosCitas.length > 0) {
    console.log("DEBUG(Servidor): Ejemplo Fila 2 (Valores Reales):", datosCitas[0]);
    console.log("DEBUG(Servidor): Ejemplo Fila 2 (Display Values):", datosCitasDisplay[0]);
  }

  // 1. Filtramos las citas que son de hoy en adelante
  const citasFiltradas = [];
  datosCitas.forEach((row, index) => {
    const fechaCitaValor = row[1]; // Se asume Columna B
    if (fechaCitaValor instanceof Date && !isNaN(fechaCitaValor)) {
      const fechaCopia = new Date(fechaCitaValor.getTime());
      fechaCopia.setHours(0, 0, 0, 0);
      
      if (fechaCopia >= hoySinHora) {
        citasFiltradas.push({
          numFila: index + 2,
          display: datosCitasDisplay[index]
        });
      }
    } else {
      // Log en caso de que la columna B no sea una fecha válida
      if(index === 0) console.warn(`DEBUG(Servidor): Fila ${index+2} no tiene fecha válida en Col B:`, fechaCitaValor);
    }
  });

  console.log("DEBUG(Servidor): Citas filtradas (Hoy+):", citasFiltradas.length);

  // 2. Formateamos para el modal [Fila, Hora, Cliente, Servicio, Agente, Fecha]
  const resultadoFinal = citasFiltradas.map(item => {
    return [
      item.numFila,        // [0] ID para acciones
      item.display[2],     // [1] Hora (Col C)
      item.display[3],     // [2] Cliente (Col D)
      item.display[6],     // [3] Servicio (Col G)
      item.display[5],     // [4] Agente (Col F)
      item.display[1]      // [5] Fecha (Col B)
    ];
  });

  if (resultadoFinal.length > 0) {
    console.log("DEBUG(Servidor): Ejemplo de datos enviados al Cliente:", resultadoFinal[0]);
  }

  return resultadoFinal;
}

function eliminarFilaCitaServidor(numFila) {
  const libro = SpreadsheetApp.openById("1SXuedQigLxVUF2oxn65wEZ5-HnDDiVdy7lY7HaweVC4");
  const hojaCitas = libro.getSheetByName("Registro Citas");
  
  // Seguridad: Verificar que la fila no sea la cabecera
  if (numFila >= 2) {
    hojaCitas.deleteRow(numFila);
    return true;
  }
  throw new Error("Fila inválida");
}

function migrarCitasDeHoy() {
  try {
    console.log("🚀 Iniciando migración de Citas desde Google Sheets...");
    const libro = SpreadsheetApp.openById("1SXuedQigLxVUF2oxn65wEZ5-HnDDiVdy7lY7HaweVC4");
    const hojaCitas = libro.getSheetByName("Registro Citas");
    if (!hojaCitas) throw new Error("Hoja 'Registro Citas' no encontrada.");

    const ultimaFila = hojaCitas.getLastRow();
    if (ultimaFila < 2) {
      console.log("No hay citas para migrar.");
      return "No hay citas para migrar.";
    }

    // Leemos todas las citas en el rango A:H
    const rawData = hojaCitas.getRange(1, 1, ultimaFila, 8).getValues();
    const headers = rawData[0];
    
    // Índices de columna basados en A-H
    const colFecha = 1; // B
    const colHora = 2;  // C
    const colCliente = 3; // D
    const colTipo = 4; // E
    const colAgente = 5; // F
    const colServicio = 6; // G
    const colEstado = 7; // H (8va columna)

    console.log("Cabeceras detectadas para migración de citas:", headers);

    let count = 0;

    for (let i = 1; i < rawData.length; i++) {
      const row = rawData[i];
      const numFila = i + 1;
      const estado = String(row[colEstado] || '').trim();

      // Filtrar solo las 'Pendiente'
      if (estado.toLowerCase() === 'pendiente') {
        const fechaVal = row[colFecha];
        let fechaISO = "";
        if (fechaVal instanceof Date) {
          fechaISO = Utilities.formatDate(fechaVal, "America/Lima", "yyyy-MM-dd");
        } else {
          fechaISO = String(fechaVal).trim();
        }

        const payload = {
          fecha: fechaISO,
          hora: String(row[colHora] || '').trim(),
          cliente: String(row[colCliente] || '').trim(),
          tipo_cliente: String(row[colTipo] || 'Cita').trim(),
          agente: String(row[colAgente] || '').trim() || null,
          servicio: String(row[colServicio] || '').trim(),
          estado: 'Pendiente'
        };

        console.log(`Migrando cita fila ${numFila}:`, payload);
        
        // Insertar en Supabase
        Supabase.insert("registro_citas", payload);

        // Marcar como 'Migrado' en la hoja de Google Sheets para evitar duplicados
        hojaCitas.getRange(numFila, colEstado + 1).setValue("Migrado");
        count++;
      }
    }

    console.log(`✅ ¡Migración de Citas completada! Se migraron ${count} citas.`);
    return `Se migraron ${count} citas correctamente a Supabase.`;
  } catch (e) {
    console.error("❌ Error en migrarCitasDeHoy: " + e.message);
    return "Error: " + e.message;
  }
}

/**
 * Obtiene los datos de una sola fila de cita para cargar en el formulario de edición
 */
function obtenerDatosCitaPorFila(numFila) {
  const libro = SpreadsheetApp.openById("1SXuedQigLxVUF2oxn65wEZ5-HnDDiVdy7lY7HaweVC4");
  const hojaCitas = libro.getSheetByName("Registro Citas");
  
  // Obtenemos los valores de la fila específica (A:G)
  // Nota: Usamos getValues() para la lógica y getDisplayValues() para los strings
  const filaData = hojaCitas.getRange(numFila, 1, 1, 7).getValues()[0];
  const filaDisplay = hojaCitas.getRange(numFila, 1, 1, 7).getDisplayValues()[0];

  // Convertimos la fecha (B) al formato 'yyyy-MM-dd' que requiere el input type="date"
  let fechaISO = "";
  if (filaData[1] instanceof Date) {
    fechaISO = filaData[1].toISOString().split('T')[0];
  }

  // Convertimos la hora (C) al formato 'HH:mm' que requiere tu select/input
  // Como tu select usa valores tipo "07:15", intentamos extraerlo del display value
  let hora24h = "";
  const horaStr = filaDisplay[2]; // Ej: "10:30 AM"
  if (horaStr) {
    const [time, modifier] = horaStr.split(' ');
    let [hours, minutes] = time.split(':');
    if (hours === '12') hours = '00';
    if (modifier === 'PM' || modifier === 'pm') hours = parseInt(hours, 10) + 12;
    hora24h = `${String(hours).padStart(2, '0')}:${minutes}`;
  }

  return {
    fecha: fechaISO,
    hora: hora24h,
    cliente: filaDisplay[3],
    agente: filaDisplay[5],
    servicio: filaDisplay[6]
  };
}


// ==========================================
// DESDE: registrarCita.js
// ==========================================

// La función principal que se llama desde tu interfaz de usuario/modal refactorizada para Supabase
function registrarCita(CitaForm) {
  try {
    const ahora = new Date();
    // Las citas en Supabase se registran en zona horaria America/Lima de forma relacional
    const timestampISO = ahora.toISOString();

    // Estructura relacional esperada por Supabase en registro_citas
    // UUID se genera automáticamente en Supabase, enviamos el payload limpio
    const payload = {
      fecha: CitaForm.fechaCita, // Formato 'yyyy-MM-dd' del input date
      hora: CitaForm.horaCita,   // Formato 'HH:mm' del input select
      cliente: CitaForm.nombreClienteOATC,
      tipo_cliente: 'Cita',
      agente: CitaForm.nombreAgenteOATC || null,
      servicio: CitaForm.tipoOATC
    };

    console.log("SERVER DEBUG: Registrando cita en Supabase:", JSON.stringify(payload));

    if (CitaForm.numFila && CitaForm.numFila !== "") {
      // ES UNA EDICIÓN (numFila contiene el id UUID de Supabase)
      const res = Supabase.update("registro_citas", payload, `id=eq.${CitaForm.numFila}`);
      console.log("SERVER DEBUG: Cita editada en Supabase:", JSON.stringify(res));
      return "Cita actualizada correctamente en la nube.";
    } else {
      // ES UNA CITA NUEVA
      const res = Supabase.insert("registro_citas", payload);
      console.log("SERVER DEBUG: Cita insertada en Supabase:", JSON.stringify(res));
      return "Cita agendada exitosamente en la nube.";
    }
  } catch(e) {
    console.error("SERVER DEBUG ERROR: Fallo al registrar cita en Supabase: " + e.message, e.stack);
    throw new Error("No se pudo registrar la cita en Supabase: " + e.message);
  }
}
