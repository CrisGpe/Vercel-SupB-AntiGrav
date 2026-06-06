/**
 * 👥 Gestión de Agentes, Control de Fichas de Asistencia y Cola de Turnos - Integración Supabase & Sheets
 * Consolida la lógica de gestionAgentesGS.js, gestionFichasGS.js y gestionTablaTurnos.js.
 */

// ==========================================
// DESDE: gestionAgentesGS.js
// ==========================================

/**
 * Obtiene todos los datos de la hoja "Agentes" para mostrarlos en el modal.
 * Transforma las fechas/horas a cadenas para evitar problemas de serialización.
 */
function obtenerDatosAgentes() {
    const sheet = RegistrosAdmin.getSheetByName("Agentes"); 

    if (!sheet) {
        Logger.log("Error: La hoja 'Agentes' no fue encontrada.");
        return []; 
    }
    
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
        return [];
    }
    
    // Obtener los datos sin encabezado
    const lastCol = sheet.getLastColumn();
    const values = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues(); 

    // Definición de índices
    const FICHA_COL = 1;         
    const NOMBRE_COMPLETO_COL = 2; 
    const INGRESO_COL = 5;       
    const SALIDA_COL = 6;        
    const DIADESC_COL = 7;       
    const APODO_COL = 8;         
    const DNI_COL = 9;           
    const ESTADO_COL = 10;       
    const ESPECIALIDAD_COL = 11; 

    // Mapear y sanear los datos
    const agentes = values.map(row => {
        
        // --- CONVERSIÓN CRÍTICA AJUSTADA (hh:mm a) ---
        // 'hh' para hora en 12h, 'a' para AM/PM
        let ingresoStr = row[INGRESO_COL] instanceof Date ? 
                         Utilities.formatDate(row[INGRESO_COL], Session.getScriptTimeZone(), "hh:mm a") : 
                         String(row[INGRESO_COL] || '');
                         
        let salidaStr = row[SALIDA_COL] instanceof Date ? 
                        Utilities.formatDate(row[SALIDA_COL], Session.getScriptTimeZone(), "hh:mm a") : 
                        String(row[SALIDA_COL] || '');
        // ----------------------------------------------------------------
        
        return {
            id: row[FICHA_COL],
            nombreCompleto: row[NOMBRE_COMPLETO_COL],
            dni: row[DNI_COL] || 'N/A',
            apodo: row[APODO_COL],
            // Los campos ahora contendrán formato 12 horas (Ej: "10:00 AM")
            ingreso: ingresoStr,
            salida: salidaStr,
            diadesc: row[DIADESC_COL] || 'N/A', 
            especialidad: row[ESPECIALIDAD_COL] || 'General',
            estado: row[ESTADO_COL] || 'Inactivo'
        };
    });
    
  return agentes;
}

/**
 * Busca un agente por su ID de Ficha (Columna B).
 * @param {string} agenteId - El ID de la Ficha.
 * @returns {Object|null} Objeto con los datos del agente o null si no se encuentra.
 */
function obtenerDatosAgentePorId(agenteId) {
  const sheet = RegistrosAdmin.getSheetByName("Agentes");
  const data = sheet.getDataRange().getValues();
  
  // Asumiendo que la columna Ficha (ID) es la columna B (Índice 1)
  const FICHA_COL = 1;

  for (let i = 1; i < data.length; i++) {
    // Compara el valor de la columna Ficha (data[i][1]) con el ID buscado
    if (data[i][FICHA_COL] == agenteId) {
      const row = data[i];
      // Mapea y devuelve el objeto completo con todos los campos necesarios para edición
      return {
        fila: i + 1, // La fila en la hoja
        id: row[1],
        nombreCompleto: row[2],
        relacionLaboral: row[3],
        salon: row[4],
        ingreso: row[5], // HR entrada
        salida: row[6],  // HR salida
        diadesc: row[7], // Día Descanso
        apodo: row[8],
        dni: row[9],
        estado: row[10],
        especialidad: row[11],
        valorEspecialidad: row[12],
        nickname: row[13],
        celular: row[14],
        genero: row[15]
      };
    }
  }
  return null;
}

/**
 * Agrega un nuevo agente o edita uno existente.
 * @param {Object} datos - Objeto con los datos del agente.
 * @returns {Object} Resultado de la operación.
 */
function guardarOEditarAgente(datos) {
  const sheet = RegistrosAdmin.getSheetByName("Agentes");
  
  // Definición de índices de columna (ajusta estos si tu hoja cambia)
  const INDICES = {
    FICHA: 1, // B
    NOMBRE_COMPLETO: 2, // C
    RELACION_LABORAL: 3, // D (Asumo 'Agente dependiente' por defecto)
    SALON: 4, // E (Asumo 'Gloss Salon' por defecto)
    HR_ENTRADA: 5, // F
    HR_SALIDA: 6, // G
    DIA_DESCANSO: 7, // H
    APODO: 8, // I
    DNI: 9, // J
    ESTADO: 10, // K
    ESPECIALIDAD: 11, // L
  };

  try {
    let filaAEditar = -1;
    let esEdicion = datos.id ? true : false;
    
    // Si es edición, buscamos la fila
    if (esEdicion) {
      const datosExistentes = obtenerDatosAgentePorId(datos.id);
      if (datosExistentes) {
        filaAEditar = datosExistentes.fila;
      } else {
        return { exito: false, mensaje: "Error: No se encontró el agente para editar." };
      }
    }
    
    // 1. Preparar la nueva fila de datos
    let nuevaFila = [];
    if (esEdicion) {
        // Para la edición, obtenemos la fila completa existente
        const data = sheet.getRange(filaAEditar, 1, 1, sheet.getLastColumn()).getValues()[0];
        nuevaFila = data;
    } else {
        // Para agregar, obtenemos una fila vacía y llenamos lo básico
        const ultimaFila = sheet.getLastRow();
        const siguienteFicha = ultimaFila > 0 ? sheet.getRange(ultimaFila, INDICES.FICHA + 1).getValue() + 1 : 1; 
        
        nuevaFila = new Array(sheet.getLastColumn()).fill('');
        nuevaFila[0] = new Date(); // Fecha Registro
        nuevaFila[INDICES.FICHA] = siguienteFicha; // Nuevo ID
        nuevaFila[INDICES.RELACION_LABORAL] = 'Agente dependiente'; // Default
        nuevaFila[INDICES.SALON] = 'Gloss Salon'; // Default
        datos.id = siguienteFicha; // Asignar el nuevo ID al objeto de respuesta
    }

    // 2. Insertar/Actualizar los datos del formulario
    nuevaFila[INDICES.NOMBRE_COMPLETO] = datos.nombreCompleto;
    nuevaFila[INDICES.DNI] = datos.dni;
    nuevaFila[INDICES.APODO] = datos.apodo;
    nuevaFila[INDICES.ESPECIALIDAD] = datos.especialidad;
    nuevaFila[INDICES.ESTADO] = datos.estado;
    nuevaFila[INDICES.DIA_DESCANSO] = datos.diadesc;
    
    nuevaFila[INDICES.HR_ENTRADA] = datos.ingreso; 
    nuevaFila[INDICES.HR_SALIDA] = datos.salida; 
    
    // 3. Escribir en la hoja
    if (esEdicion) {
      sheet.getRange(filaAEditar, 1, 1, nuevaFila.length).setValues([nuevaFila]);
      return { exito: true, mensaje: `Agente Ficha ${datos.id} actualizado con éxito.` };
    } else {
      sheet.appendRow(nuevaFila);
      return { exito: true, mensaje: `Agente ${datos.nombreCompleto} agregado con ID Ficha ${datos.id}.` };
    }

  } catch (e) {
    Logger.log('Error al guardar/editar agente: ' + e);
    return { exito: false, mensaje: `Fallo en la operación: ${e.message}` };
  }
}

/**
 * Elimina un agente marcando la fila como eliminada
 * @param {string} agenteId - El ID de la Ficha.
 * @returns {Object} Resultado de la operación.
 */
function eliminarAgente(agenteId) {
  const sheet = RegistrosAdmin.getSheetByName("Agentes");
  
  try {
    const datosAgente = obtenerDatosAgentePorId(agenteId);
    if (!datosAgente) {
      return { exito: false, mensaje: "Error: Agente no encontrado para eliminar." };
    }

    // Eliminación directa de la fila
    sheet.deleteRow(datosAgente.fila);
    
    return { exito: true, mensaje: `Agente Ficha ${agenteId} eliminado con éxito.` };
    
  } catch (e) {
    Logger.log('Error al eliminar agente: ' + e);
    return { exito: false, mensaje: `Fallo al eliminar: ${e.message}` };
  }
}


// ==========================================
// DESDE: gestionFichasGS.js
// ==========================================

function registrarEntrada(nombreFicha) {
  try {
    const horaAhora = Utilities.formatDate(new Date(), "America/Lima", "h:mm a");
    const fechaHoy = Utilities.formatDate(new Date(), "America/Lima", "yyyy-MM-dd");

    // 1. Buscar al agente en la base de datos de Supabase
    const agentes = Supabase.select("agentes", `estado=eq.Activo&or=(nombre_completo.eq.${encodeURIComponent(nombreFicha)},apodo.eq.${encodeURIComponent(nombreFicha)})`);
    
    if (!agentes || agentes.length === 0) {
      return 'Error: Agente no encontrado. Regístralo con el administrador.';
    }
    
    const agente = agentes[0];

    // 2. Verificar si el agente ya tiene un fichaje de asistencia para hoy
    const asistenciasHoy = Supabase.select("control_asistencia", `agente_id=eq.${agente.id}&fecha=eq.${fechaHoy}`);

    if (asistenciasHoy && asistenciasHoy.length > 0) {
      return "Ya está registrado";
    }

    // 3. Registrar entrada en control_asistencia
    const nuevoFichaje = {
      agente_id: agente.id,
      fecha: fechaHoy,
      entrada: horaAhora,
      estado_texto: "Disponible",
      ultima_act: new Date().toISOString()
    };

    Supabase.insert("control_asistencia", nuevoFichaje);

    return "Registro exitoso";
  } catch (e) {
    console.error("Error en registrarEntrada Supabase: " + e.message);
    return "Fallo en la operación: " + e.message;
  }
}

function registrarSalida(nombreFicha) {
  try {
    const horaAhora = Utilities.formatDate(new Date(), "America/Lima", "h:mm a");
    const fechaHoy = Utilities.formatDate(new Date(), "America/Lima", "yyyy-MM-dd");

    // 1. Buscar al agente
    const agentes = Supabase.select("agentes", `estado=eq.Activo&or=(nombre_completo.eq.${encodeURIComponent(nombreFicha)},apodo.eq.${encodeURIComponent(nombreFicha)})`);
    if (!agentes || agentes.length === 0) {
      return "Error: Agente no encontrado.";
    }
    const agente = agentes[0];

    // 2. Buscar entrada activa de hoy (donde salida esté vacío o sea nulo)
    const asistencias = Supabase.select("control_asistencia", `agente_id=eq.${agente.id}&fecha=eq.${fechaHoy}`);
    if (!asistencias || asistencias.length === 0) {
      return "No se encontró una entrada abierta para cerrar hoy para este agente.";
    }

    const asistencia = asistencias[0];

    // 3. Actualizar la asistencia con la salida, estado 'Ausente' y última_act
    const datosActualizados = {
      salida: horaAhora,
      estado_texto: "Ausente",
      ultima_act: new Date().toISOString()
    };

    Supabase.update("control_asistencia", datosActualizados, `id=eq.${asistencia.id}`);

    return "Salida registrada con éxito, respetando G y H.";
  } catch (e) {
    console.error("Error en registrarSalida Supabase: " + e.message);
    return "Fallo al registrar salida: " + e.message;
  }
}

function registrarRefrigerio(nombreFicha) {
  try {
    const horaAhora = Utilities.formatDate(new Date(), "America/Lima", "h:mm a");
    const fechaHoy = Utilities.formatDate(new Date(), "America/Lima", "yyyy-MM-dd");
    const nombreLimpio = nombreFicha.trim();

    // 1. Buscar al agente
    const agentes = Supabase.select("agentes", `estado=eq.Activo&or=(nombre_completo.eq.${encodeURIComponent(nombreLimpio)},apodo.eq.${encodeURIComponent(nombreLimpio)})`);
    if (!agentes || agentes.length === 0) {
      return "Error: Agente no encontrado.";
    }
    const agente = agentes[0];

    // 2. Buscar asistencia de hoy
    const asistencias = Supabase.select("control_asistencia", `agente_id=eq.${agente.id}&fecha=eq.${fechaHoy}`);
    if (!asistencias || asistencias.length === 0) {
      return "No se pudo registrar el refrigerio. Verifique su estado o si ha fichado la entrada.";
    }

    const asistencia = asistencias[0];

    // Caso 1: Marcar Inicio de Refrigerio (ref_inicio vacío)
    if (!asistencia.ref_inicio && !asistencia.ref_termino) {
      const datosActualizados = {
        ref_inicio: horaAhora,
        estado_texto: "En refrigerio"
      };
      Supabase.update("control_asistencia", datosActualizados, `id=eq.${asistencia.id}`);
      return "Inicio de refrigerio registrado.";
    }
    
    // Caso 2: Marcar Término de Refrigerio (ref_inicio lleno, ref_termino vacío)
    else if (asistencia.ref_inicio && !asistencia.ref_termino) {
      // Obtener y evaluar OATC pendientes del agente
      const oatcPendientes = buscarOATCsPendientesPorAgente(nombreLimpio);
      const estadoDevuelto = evaluarEstadoAgentePorPendientes(nombreLimpio, oatcPendientes);

      const datosActualizados = {
        ref_termino: horaAhora,
        estado_texto: estadoDevuelto
      };

      Supabase.update("control_asistencia", datosActualizados, `id=eq.${asistencia.id}`);
      return `Término de refrigerio registrado. Nuevo estado: ${estadoDevuelto}.`;
    }

    return "El refrigerio ya fue completado hoy.";
  } catch (e) {
    console.error("Error en registrarRefrigerio Supabase: " + e.message);
    return "Fallo en la operación: " + e.message;
  }
}

function citaPsicologo(nombreFicha) {
  try {
    const fechaHoy = Utilities.formatDate(new Date(), "America/Lima", "yyyy-MM-dd");
    const nombreLimpio = nombreFicha.trim();

    // 1. Buscar al agente
    const agentes = Supabase.select("agentes", `estado=eq.Activo&or=(nombre_completo.eq.${encodeURIComponent(nombreLimpio)},apodo.eq.${encodeURIComponent(nombreLimpio)})`);
    if (!agentes || agentes.length === 0) return "Error: Agente no encontrado.";
    const agente = agentes[0];

    // 2. Buscar asistencia de hoy
    const asistencias = Supabase.select("control_asistencia", `agente_id=eq.${agente.id}&fecha=eq.${fechaHoy}`);
    if (!asistencias || asistencias.length === 0) return "No hay registros de hoy.";
    const asistencia = asistencias[0];

    // 3. Alternar el estado
    let nuevoEstado = "";
    const datosActualizados = {};

    if (asistencia.estado_texto !== "En terapia") {
      nuevoEstado = "En terapia";
      datosActualizados.estado_texto = nuevoEstado;
    } else {
      nuevoEstado = "Disponible";
      datosActualizados.estado_texto = nuevoEstado;
    }

    Supabase.update("control_asistencia", datosActualizados, `id=eq.${asistencia.id}`);
    return nuevoEstado === "En terapia" 
      ? "Inicio de terapia registrado (Estado: En terapia)." 
      : "Fin de terapia registrado (Estado: Disponible).";
  } catch (e) {
    console.error("Error en citaPsicologo Supabase: " + e.message);
    return "Fallo en la operación: " + e.message;
  }
}

function registrarTimestampRefrigerio(nombreFicha) {
  return registrarRefrigerio(nombreFicha);
}

function pasarVoz(nombreFicha) {
  try {
    const fechaHoy = Utilities.formatDate(new Date(), "America/Lima", "yyyy-MM-dd");
    const nombreLimpio = nombreFicha.trim();

    const agentes = Supabase.select("agentes", `estado=eq.Activo&or=(nombre_completo.eq.${encodeURIComponent(nombreLimpio)},apodo.eq.${encodeURIComponent(nombreLimpio)})`);
    if (!agentes || agentes.length === 0) return "Error: Agente no encontrado.";
    const agente = agentes[0];

    const asistencias = Supabase.select("control_asistencia", `agente_id=eq.${agente.id}&fecha=eq.${fechaHoy}`);
    if (!asistencias || asistencias.length === 0) return "No hay registros de hoy.";
    const asistencia = asistencias[0];

    let nuevoEstado = "";
    const datosActualizados = {};

    if (asistencia.estado_texto !== "Pasar la voz") {
      nuevoEstado = "Pasar la voz";
      datosActualizados.estado_texto = nuevoEstado;
    } else {
      nuevoEstado = "Disponible";
      datosActualizados.estado_texto = nuevoEstado;
    }

    Supabase.update("control_asistencia", datosActualizados, `id=eq.${asistencia.id}`);
    return `Estado cambiado a '${nuevoEstado}' para ${nombreFicha}.`;
  } catch (e) {
    console.error("Error en pasarVoz Supabase: " + e.message);
    return "Fallo en la operación: " + e.message;
  }
}

function pasarSalon(nombreFicha) {
  try {
    const fechaHoy = Utilities.formatDate(new Date(), "America/Lima", "yyyy-MM-dd");
    const nombreLimpio = nombreFicha.trim();

    const agentes = Supabase.select("agentes", `estado=eq.Activo&or=(nombre_completo.eq.${encodeURIComponent(nombreLimpio)},apodo.eq.${encodeURIComponent(nombreLimpio)})`);
    if (!agentes || agentes.length === 0) return "Error: Agente no encontrado.";
    const agente = agentes[0];

    const asistencias = Supabase.select("control_asistencia", `agente_id=eq.${agente.id}&fecha=eq.${fechaHoy}`);
    if (!asistencias || asistencias.length === 0) return "No hay registros de hoy.";
    const asistencia = asistencias[0];

    let nuevoEstado = "";
    const datosActualizados = {};

    if (asistencia.estado_texto !== "En otro salón") {
      nuevoEstado = "En otro salón";
      datosActualizados.estado_texto = nuevoEstado;
    } else {
      nuevoEstado = "Disponible";
      datosActualizados.estado_texto = nuevoEstado;
    }

    Supabase.update("control_asistencia", datosActualizados, `id=eq.${asistencia.id}`);
    return `Estado cambiado a '${nuevoEstado}' para ${nombreFicha}.`;
  } catch (e) {
    console.error("Error en pasarSalon Supabase: " + e.message);
    return "Fallo en la operación: " + e.message;
  }
}

function salioSalon(nombreFicha) {
  try {
    const fechaHoy = Utilities.formatDate(new Date(), "America/Lima", "yyyy-MM-dd");
    const nombreLimpio = nombreFicha.trim();

    const agentes = Supabase.select("agentes", `estado=eq.Activo&or=(nombre_completo.eq.${encodeURIComponent(nombreLimpio)},apodo.eq.${encodeURIComponent(nombreLimpio)})`);
    if (!agentes || agentes.length === 0) return "Error: Agente no encontrado.";
    const agente = agentes[0];

    const asistencias = Supabase.select("control_asistencia", `agente_id=eq.${agente.id}&fecha=eq.${fechaHoy}`);
    if (!asistencias || asistencias.length === 0) return "No hay registros de hoy.";
    const asistencia = asistencias[0];

    let nuevoEstado = "";
    const datosActualizados = {};

    if (asistencia.estado_texto !== "Salió del salón") {
      nuevoEstado = "Salió del salón";
      datosActualizados.estado_texto = nuevoEstado;
    } else {
      nuevoEstado = "Disponible";
      datosActualizados.estado_texto = nuevoEstado;
    }

    Supabase.update("control_asistencia", datosActualizados, `id=eq.${asistencia.id}`);
    return `Estado cambiado a '${nuevoEstado}' para ${nombreFicha}.`;
  } catch (e) {
    console.error("Error en salioSalon Supabase: " + e.message);
    return "Fallo en la operación: " + e.message;
  }
}


// ==========================================
// DESDE: gestionTablaTurnos.js
// ==========================================

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
    asistencias.sort((a, b) => {
      const obtenerPrioridadEstado = (estado) => {
        const est = String(estado || '').trim().toLowerCase();
        if (est === 'disponible' || est === 'pasar la voz' || est === 'pasar-la-voz') return 1;
        if (est === 'trabajando') return 2;
        if (est === 'salida' || est === 'salió del salón' || est === 'salió-del-salón') return 4;
        return 3;
      };

      const prioA = obtenerPrioridadEstado(a.estado_texto);
      const prioB = obtenerPrioridadEstado(b.estado_texto);

      if (prioA !== prioB) {
        return prioA - prioB;
      }

      const timeA = a.ultima_act ? new Date(a.ultima_act).getTime() : 0;
      const timeB = b.ultima_act ? new Date(b.ultima_act).getTime() : 0;
      
      return timeA - timeB;
    });

    // 4. Mapear y formatear la data al array de 13 columnas esperado por la UI
    let resultado = asistencias.map(asist => {
      const agente = asist.agentes;
      if (!agente) return null;

      if (especialidadFiltro) {
        const esp = String(agente.especialidad || 'Otros').trim();
        if (especialidadFiltro === 'Estilismo' && esp !== 'Estilismo') return null;
        if (especialidadFiltro === 'Cosmiatría' && esp !== 'Cosmiatría') return null;
        if (especialidadFiltro === 'Otros' && (esp === 'Estilismo' || esp === 'Cosmiatría')) return null;
      }

      const idAgente = agente.id;
      const turnosHoy = contadores[idAgente] ? contadores[idAgente].turnos : 0;
      const clientesHoy = contadores[idAgente] ? contadores[idAgente].clientes : 0;

      let ultimaActDisplay = "";
      if (asist.ultima_act) {
        const dateObj = new Date(asist.ultima_act);
        ultimaActDisplay = Utilities.formatDate(dateObj, "America/Lima", "hh:mm:ss a");
      }

      return [
        asist.fecha,                       
        agente.apodo || agente.nombre_completo || "", 
        asist.entrada || "",               
        asist.ref_inicio || "",            
        asist.ref_termino || "",           
        asist.salida || "",                
        String(turnosHoy),                 
        String(clientesHoy),               
        asist.estado_texto || "Ausente",   
        "0",                               
        agente.especialidad || "General",  
        "",                                
        ultimaActDisplay                   
      ];
    }).filter(Boolean);

    console.log(`[Dashboard] Procesados ${resultado.length} registros de asistencia para la UI.`);
    return resultado;
  } catch (e) {
    console.error("Error en obtenerFichasFiltradasPorEspecialidad Supabase: " + e.message);
    return [];
  }
}
