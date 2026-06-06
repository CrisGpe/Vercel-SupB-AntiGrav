/**
 * 🚀 Gestión de Órdenes de Atención (OATC) y Sincronización de Estados - Integración Supabase
 * Contiene funciones de gestión de OATC y actualización de estado de agentes 100% en Supabase.
 */

// --- HELPERS DE RESOLUCIÓN ---

function obtenerAgenteIdPorNombre(nombreAgente) {
  if (!nombreAgente) return null;
  const nombreLimpio = String(nombreAgente).trim();
  const found = Supabase.select("agentes", `or=(nombre_completo.eq.${encodeURIComponent(nombreLimpio)},apodo.eq.${encodeURIComponent(nombreLimpio)})`);
  if (found && found.length > 0) return found[0].id;
  return null;
}

function obtenerOCrearClienteId(nombreClienteOATC) {
  if (!nombreClienteOATC || nombreClienteOATC === "POR ASIGNAR") {
    const p = Supabase.select("clientes", "nombre=eq.POR&apellido=eq.ASIGNAR");
    if (p && p.length > 0) return p[0].id;
    const r = Supabase.insert("clientes", { nombre: "POR", apellido: "ASIGNAR", dni: "00000000" });
    return r[0].id;
  }

  let dni = "";
  let nombreCompleto = nombreClienteOATC;
  if (nombreClienteOATC.includes(" | DNI:")) {
    const parts = nombreClienteOATC.split(" | DNI:");
    nombreCompleto = parts[0].trim();
    const dniPart = parts[1].split(" | CEL:")[0].trim();
    dni = dniPart;
  }

  if (dni) {
    const found = Supabase.select("clientes", `dni=eq.${encodeURIComponent(dni)}`);
    if (found && found.length > 0) return found[0].id;
  }

  const nombres = nombreCompleto.split(" ");
  const nombre = nombres[0] || "";
  const apellido = nombres.slice(1).join(" ") || "";
  const found = Supabase.select("clientes", `nombre=eq.${encodeURIComponent(nombre)}&apellido=eq.${encodeURIComponent(apellido)}`);
  if (found && found.length > 0) return found[0].id;

  const nuevo = {
    nombre: nombre || "Cliente",
    apellido: apellido || "Nuevo",
    dni: dni || "TEMP_" + Math.floor(Math.random() * 1000000)
  };
  const insertado = Supabase.insert("clientes", nuevo);
  return insertado[0].id;
}

function obtenerSiguienteCorrelativoHoy() {
  const fechaHoy = Utilities.formatDate(new Date(), "America/Lima", "yyyy-MM-dd");
  const oatcs = Supabase.select("oatc", `fecha=eq.${fechaHoy}&select=correlativo&order=correlativo.desc&limit=1`);
  if (oatcs && oatcs.length > 0) {
    const maxCorr = parseInt(oatcs[0].correlativo) || 0;
    return maxCorr + 1;
  }
  return 1;
}

function obtenerNumeroLastOATC() {
  try {
    return obtenerSiguienteCorrelativoHoy();
  } catch (e) {
    console.error("Error en obtenerNumeroLastOATC: " + e.message);
    return 1;
  }
}

// --- TRANSICIONES DE ESTADOS ---

// --- HELPERS DE ACTUALIZACIÓN DE ESTADOS ---

function actualizarEstadoAgenteConTimestamp(nombreAgente, nuevoEstado) {
  const fechaHoy = Utilities.formatDate(new Date(), "America/Lima", "yyyy-MM-dd");
  const agenteId = obtenerAgenteIdPorNombre(nombreAgente);
  if (agenteId) {
    const asist = Supabase.select("control_asistencia", `agente_id=eq.${agenteId}&fecha=eq.${fechaHoy}`);
    if (asist && asist.length > 0) {
      if (asist[0].estado_texto !== nuevoEstado) {
        Supabase.update("control_asistencia", { 
          estado_texto: nuevoEstado, 
          ultima_act: new Date().toISOString() 
        }, `id=eq.${asist[0].id}`);
        console.log(`[Estado] Agente ${nombreAgente} actualizado a ${nuevoEstado} (CON timestamp)`);
      }
    }
  }
}

function actualizarEstadoAgenteSinTimestamp(nombreAgente, nuevoEstado) {
  const fechaHoy = Utilities.formatDate(new Date(), "America/Lima", "yyyy-MM-dd");
  const agenteId = obtenerAgenteIdPorNombre(nombreAgente);
  if (agenteId) {
    const asist = Supabase.select("control_asistencia", `agente_id=eq.${agenteId}&fecha=eq.${fechaHoy}`);
    if (asist && asist.length > 0) {
      if (asist[0].estado_texto !== nuevoEstado) {
        Supabase.update("control_asistencia", { 
          estado_texto: nuevoEstado 
        }, `id=eq.${asist[0].id}`);
        console.log(`[Estado] Agente ${nombreAgente} actualizado a ${nuevoEstado} (SIN timestamp)`);
      }
    }
  }
}

function actualizarEstadoAsesorando(nombreAgente) {
  actualizarEstadoAgenteSinTimestamp(nombreAgente, "Asesorando");
}

function actualizarEstadoTrabajandoCliente(nombreAgente) {
  // Trabajos prioritarios de 'cliente' actualizan la última actividad
  actualizarEstadoAgenteConTimestamp(nombreAgente, "Trabajando");
}

function actualizarEstadoTrabajando(nombreAgente) {
  // Trabajos prioritarios de 'turno' actualizan la última actividad
  actualizarEstadoAgenteConTimestamp(nombreAgente, "Trabajando");
}

function actualizarEstadoCorrigiendo(nombreAgente) {
  // No prioritario (correccion)
  actualizarEstadoAgenteSinTimestamp(nombreAgente, "Corrigiendo");
}

function actualizarEstadoTurnoNino(nombreAgente) {
  // No prioritario
  actualizarEstadoAgenteSinTimestamp(nombreAgente, "Atención niño");
}

function actualizarEstadoTurnoCaballero(nombreAgente) {
  // No prioritario
  actualizarEstadoAgenteSinTimestamp(nombreAgente, "Corte Caballero");
}

function actualizarEstadoTrabajandoTipoEspecial(nombreAgente, estadoTexto) {
  // Tipo especial (ej. 'producto' -> 'Vendiendo')
  actualizarEstadoAgenteSinTimestamp(nombreAgente, estadoTexto);
}

function actualizarEstadoDisponible(nombreAgente) {
  // Por defecto, disponible normal actualiza timestamp
  actualizarEstadoAgenteConTimestamp(nombreAgente, "Disponible");
}

/**
 * Evaluador inteligente post-operación que determina el estado correcto del agente
 * tras eliminar o resolver una OATC.
 * 
 * @param {string} agenteNombre - Nombre del agente
 * @param {boolean} esEliminacion - true si la operación fue una eliminación/cancelación
 * @param {string} categoriaOATCOperada - Categoría de la OATC resuelta/eliminada (ej: 'cliente', 'turno', 'producto')
 */
function evaluarEstadoAgentePostOperacion(agenteNombre, esEliminacion, categoriaOATCOperada) {
  if (!agenteNombre) return;
  
  const fechaHoy = Utilities.formatDate(new Date(), "America/Lima", "yyyy-MM-dd");
  const agenteId = obtenerAgenteIdPorNombre(agenteNombre);
  if (!agenteId) return;
  
  // 1. Obtener todas las OATCs asignadas a este agente hoy que sigan activas (no resueltas y no canceladas)
  const pendingOatcs = Supabase.select("oatc", `agente_id=eq.${agenteId}&fecha=eq.${fechaHoy}&or=(hora_resuelto.is.null,hora_resuelto.eq."")`);
  const realPendings = (pendingOatcs || []).filter(o => !o.comentario_cancelacion || !o.comentario_cancelacion.startsWith("Cancelado"));
  
  const catLimpia = String(categoriaOATCOperada || "").toLowerCase().trim();
  const esPrioritariaOperada = (catLimpia === 'cliente' || catLimpia === 'turno');
  
  // 2. Si no quedan OATCs pendientes hoy:
  if (realPendings.length === 0) {
    if (esEliminacion) {
      // Caso Eliminación: Cualquier anulación de servicio NUNCA actualiza el timestamp, respeta su cola
      actualizarEstadoAgenteSinTimestamp(agenteNombre, "Disponible");
    } else {
      // Caso Resolución: SOLO si la OATC completada era de demanda prioritaria ('cliente' o 'turno') actualiza el timestamp
      if (esPrioritariaOperada) {
        actualizarEstadoAgenteConTimestamp(agenteNombre, "Disponible");
      } else {
        actualizarEstadoAgenteSinTimestamp(agenteNombre, "Disponible");
      }
    }
    return;
  }
  
  // 3. Si quedan OATCs pendientes hoy:
  // Filtramos cuántas OATCs prioritarias quedan asignadas
  const prioritariasRestantes = realPendings.filter(o => {
    const c = String(o.categoria_demanda || "").toLowerCase().trim();
    return (c === 'cliente' || c === 'turno');
  });
  
  if (prioritariasRestantes.length > 0) {
    // Si aún tiene OATCs de tipo prioritario pendientes, el estilista debe pasar a "Asesorando"
    // esperando a que se comience dicha atención. Su prioridad en la cola se mantiene (SIN timestamp).
    actualizarEstadoAgenteSinTimestamp(agenteNombre, "Asesorando");
  } else {
    // Si no quedan prioritarias asignadas (por ejemplo, solo quedan OATCs de tipo 'producto' o indirectas),
    // el estilista está disponible para recibir nuevos servicios prioritarios.
    // Mantiene su prioridad original de la cola (SIN timestamp).
    actualizarEstadoAgenteSinTimestamp(agenteNombre, "Disponible");
  }
}

// --- OPERACIONES OATC CORE ---

function registrarFormOATC(OATCform) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(5000);
    
    console.log("DEBUG(Servidor/RegOATC): Datos del formulario recibidos:", OATCform);
    
    const timeStamp = Utilities.formatDate(new Date(), "America/Lima", "h:mm a");
    const fechaHoy = Utilities.formatDate(new Date(), "America/Lima", "yyyy-MM-dd");
    
    const nombreAgenteInput = String(OATCform.nombreAgenteOATC).trim();
    const agenteId = obtenerAgenteIdPorNombre(nombreAgenteInput);
    if (!agenteId && nombreAgenteInput) {
      return "Error: No se encontró el agente para registrar la OATC.";
    }
    
    const nombreClienteInput = String(OATCform.nombreClienteOATC || "POR ASIGNAR").trim();
    const clienteId = obtenerOCrearClienteId(nombreClienteInput);
    
    const correlativo = obtenerSiguienteCorrelativoHoy();
    
    // Normalizar la categoría de demanda para cumplir con la lista de valores de Supabase
    let rawDemanda = String(OATCform.tipoClienteOATC || 'cliente').trim().toLowerCase();
    if (rawDemanda === 'corrección') rawDemanda = 'correccion';
    if (rawDemanda === 'promoción') rawDemanda = 'promocion';
    
    const allowedDemands = ['cliente', 'turno', 'promocion', 'correccion', 'turno niño', 'turno caballero', 'producto'];
    const demandaMapeada = allowedDemands.includes(rawDemanda) ? rawDemanda : 'cliente';
    
    const payload = {
      correlativo: correlativo,
      hora_registro: timeStamp,
      tipo_oatc: OATCform.tipoOATC,
      fecha: fechaHoy,
      cliente_id: clienteId,
      categoria_demanda: demandaMapeada,
      agente_id: agenteId,
      hora_resuelto: ""
    };
    
    Supabase.insert("oatc", payload);
    
    if (nombreAgenteInput) {
      actualizarEstadoAsesorando(nombreAgenteInput);
    }
    
    return "OATC registrada con éxito.";
    
  } catch (e) {
    console.error("Error al registrar OATC: " + e.message);
    return "Error: " + e.message;
  } finally {
    if (lock.hasLock()) {
      lock.releaseLock();
    }
  }
}

function resolverOATC(oatcId, agenteNombre) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(5000);
    const timeStamp = Utilities.formatDate(new Date(), "America/Lima", "h:mm a");
    const fechaHoy = Utilities.formatDate(new Date(), "America/Lima", "yyyy-MM-dd");
    
    // Verificar si es Cita o normal OATC
    const cita = Supabase.select("registro_citas", `id=eq.${oatcId}`);
    if (cita && cita.length > 0) {
      Supabase.update("registro_citas", { estado: "Resuelta" }, `id=eq.${oatcId}`);
      
      const clienteId = obtenerOCrearClienteId(cita[0].cliente);
      const agenteId = obtenerAgenteIdPorNombre(agenteNombre || cita[0].agente);
      const correlativo = obtenerSiguienteCorrelativoHoy();
      
      const payload = {
        correlativo: correlativo,
        hora_registro: timeStamp,
        tipo_oatc: cita[0].servicio,
        fecha: fechaHoy,
        cliente_id: clienteId,
        categoria_demanda: "cliente",
        agente_id: agenteId,
        hora_resuelto: ""
      };
      Supabase.insert("oatc", payload);
      
      if (agenteNombre) {
        actualizarEstadoTrabajandoCliente(agenteNombre);
      }
      return `Cita convertida a Cliente N° ${correlativo}. ${agenteNombre || ""} ha iniciado la atención (Trabajando).`;
    }
    
    const oatc = Supabase.select("oatc", `id=eq.${oatcId}`);
    if (oatc && oatc.length > 0) {
      const tipoDemanda = String(oatc[0].categoria_demanda).toLowerCase().trim();
      
      Supabase.update("oatc", { hora_resuelto: timeStamp }, `id=eq.${oatcId}`);
      
      if (agenteNombre) {
        evaluarEstadoAgentePostOperacion(agenteNombre, false, tipoDemanda);
      }
      return `OATC de ${tipoDemanda} resuelta.`;
    }
    
    return "Error: OATC o Cita no encontrada.";
  } catch (e) {
    console.error("Error en resolverOATC: " + e.message);
    return "Error: " + e.message;
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

function iniciarAtencionOATC(oatcId, agenteNombre) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(5000);
    const oatc = Supabase.select("oatc", `id=eq.${oatcId}`);
    if (!oatc || oatc.length === 0) return "Error: OATC no encontrada.";
    
    const tipoDemanda = String(oatc[0].categoria_demanda).toLowerCase().trim();
    
    if (tipoDemanda === 'cliente') {
      actualizarEstadoTrabajandoCliente(agenteNombre);
    } else if (tipoDemanda === 'turno') {
      actualizarEstadoTrabajando(agenteNombre);
    } else if (tipoDemanda === 'correccion' || tipoDemanda === 'corrección') {
      actualizarEstadoCorrigiendo(agenteNombre);
    } else if (tipoDemanda === 'turno niño') {
      actualizarEstadoTurnoNino(agenteNombre);
    } else if (tipoDemanda === 'turno caballero') {
      actualizarEstadoTurnoCaballero(agenteNombre);
    } else if (tipoDemanda === 'producto') {
      actualizarEstadoTrabajandoTipoEspecial(agenteNombre, "Vendiendo");
    } else {
      actualizarEstadoTrabajando(agenteNombre);
    }
    
    return "Atención iniciada con éxito.";
  } catch (e) {
    console.error("Error en iniciarAtencionOATC: " + e.message);
    return "Error: " + e.message;
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

function ponerEnEsperaOATC(idOATC) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(5000);
    const oatc = Supabase.select("oatc", `id=eq.${idOATC}`);
    if (!oatc || oatc.length === 0) return "Error: OATC no encontrada.";
    
    const horaActual = new Date().toISOString();
    Supabase.update("oatc", { inicio_espera: horaActual }, `id=eq.${idOATC}`);
    
    if (oatc[0].agente_id) {
      const agente = Supabase.select("agentes", `id=eq.${oatc[0].agente_id}`);
      if (agente && agente.length > 0) {
        const agenteNombre = agente[0].apodo || agente[0].nombre_completo;
        actualizarEstadoAgenteSinTimestamp(agenteNombre, "Disponible");
      }
    }
    return `✅ OATC en espera. Agente liberado (Disponible).`;
  } catch (e) {
    console.error("Error en ponerEnEsperaOATC: " + e.message);
    return "Error: " + e.message;
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

function terminarEsperaOATC(idOATC) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(5000);
    const oatc = Supabase.select("oatc", `id=eq.${idOATC}`);
    if (!oatc || oatc.length === 0) return "Error: OATC no encontrada.";
    
    const inicioEsperaStr = oatc[0].inicio_espera;
    if (!inicioEsperaStr) return "Error: No se encontró hora de inicio de espera.";
    
    const fechaInicio = new Date(inicioEsperaStr);
    const fechaFin = new Date();
    const difMilisegundos = Math.max(0, fechaFin.getTime() - fechaInicio.getTime());
    const totalSegundos = Math.floor(difMilisegundos / 1000);
    const mm = Math.floor(totalSegundos / 60);
    const ss = totalSegundos % 60;
    const textoTiempo = `${mm} minutos con ${ss} segundos.`;
    
    Supabase.update("oatc", { 
      inicio_espera: "", 
      tiempo_espera: textoTiempo 
    }, `id=eq.${idOATC}`);
    
    if (oatc[0].agente_id) {
      const agente = Supabase.select("agentes", `id=eq.${oatc[0].agente_id}`);
      if (agente && agente.length > 0) {
        const agenteNombre = agente[0].apodo || agente[0].nombre_completo;
        iniciarAtencionOATC(idOATC, agenteNombre);
      }
    }
    return `✅ Espera terminada. Tiempo registrado: ${textoTiempo}. Agente en atención.`;
  } catch (e) {
    console.error("Error en terminarEsperaOATC: " + e.message);
    return "Error: " + e.message;
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

function eliminarOATC(oatcId, justificacion) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(5000);
    
    // 1. Obtener la OATC antes de cancelarla para saber su categoría y agente asignado
    const oatc = Supabase.select("oatc", `id=eq.${oatcId}`);
    if (oatc && oatc.length > 0) {
      const tipoDemanda = String(oatc[0].categoria_demanda).toLowerCase().trim();
      
      const timeStampEliminacion = Utilities.formatDate(new Date(), "America/Lima", "d/M/yyyy h:mm a");
      const comment = `Cancelado: ${timeStampEliminacion} | Motivo: ${justificacion}`;
      Supabase.update("oatc", { comentario_cancelacion: comment }, `id=eq.${oatcId}`);
      
      if (oatc[0].agente_id) {
        const agente = Supabase.select("agentes", `id=eq.${oatc[0].agente_id}`);
        if (agente && agente.length > 0) {
          const agenteNombre = agente[0].apodo || agente[0].nombre_completo;
          evaluarEstadoAgentePostOperacion(agenteNombre, true, tipoDemanda);
        }
      }
    }
    
    return `OATC cancelada con éxito.`;
  } catch (e) {
    console.error("Error en eliminarOATC: " + e.message);
    return "Error: " + e.message;
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

function reiniciarOATC(oatcId, agenteNombre) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(5000);
    
    const cita = Supabase.select("registro_citas", `id=eq.${oatcId}`);
    if (cita && cita.length > 0) {
      Supabase.update("registro_citas", { estado: "Pendiente" }, `id=eq.${oatcId}`);
      return "Cita reiniciada con éxito.";
    }
    
    const oatc = Supabase.select("oatc", `id=eq.${oatcId}`);
    if (oatc && oatc.length > 0) {
      Supabase.update("oatc", { hora_resuelto: "" }, `id=eq.${oatcId}`);
      
      if (agenteNombre) {
        const tipoDemanda = String(oatc[0].categoria_demanda).toLowerCase().trim();
        if (tipoDemanda === 'cliente' || tipoDemanda === 'turno') {
          actualizarEstadoTrabajando(agenteNombre);
        } else {
          actualizarEstadoAsesorando(agenteNombre);
        }
      }
      return "OATC reiniciada con éxito.";
    }
    return "Error: Registro no encontrado.";
  } catch (e) {
    console.error("Error en reiniciarOATC: " + e.message);
    return "Error: " + e.message;
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

function asignarAgenteYActivar(oatcId, nuevoAgente) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(5000);
    const agenteId = obtenerAgenteIdPorNombre(nuevoAgente);
    if (!agenteId) return "Error: Agente no encontrado.";
    
    const cita = Supabase.select("registro_citas", `id=eq.${oatcId}`);
    if (cita && cita.length > 0) {
      const timeStamp = Utilities.formatDate(new Date(), "America/Lima", "h:mm a");
      const fechaHoy = Utilities.formatDate(new Date(), "America/Lima", "yyyy-MM-dd");
      const clienteId = obtenerOCrearClienteId(cita[0].cliente);
      const correlativo = obtenerSiguienteCorrelativoHoy();
      
      const payload = {
        correlativo: correlativo,
        hora_registro: timeStamp,
        tipo_oatc: cita[0].servicio,
        fecha: fechaHoy,
        cliente_id: clienteId,
        categoria_demanda: "turno",
        agente_id: agenteId,
        hora_resuelto: ""
      };
      Supabase.insert("oatc", payload);
      Supabase.update("registro_citas", { estado: "Resuelta" }, `id=eq.${oatcId}`);
      
      actualizarEstadoTrabajando(nuevoAgente);
      return `Cita asignada y activada como OATC N° ${correlativo} para ${nuevoAgente}.`;
    }
    
    Supabase.update("oatc", { agente_id: agenteId }, `id=eq.${oatcId}`);
    actualizarEstadoAsesorando(nuevoAgente);
    return `Agente ${nuevoAgente} asignado y OATC activada.`;
  } catch (e) {
    console.error("Error en asignarAgenteYActivar: " + e.message);
    return "Error: " + e.message;
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

function actualizarAtencionOATC(idOATC, nuevoTipoAtencion) {
  try {
    Supabase.update("oatc", { tipo_oatc: nuevoTipoAtencion }, `id=eq.${idOATC}`);
    return `✅ Tipo de Atención de OATC actualizado a: ${nuevoTipoAtencion}`;
  } catch (e) {
    console.error("Error al actualizar atención:", e);
    return `Error: ${e.message}`;
  }
}

function dispararSondeoSilencioso() {
  try {
    const agentes = obtenerFichasRegistradas();
    const oatc = obtenerOATCPendientes();
    return {
      success: true,
      agentes: agentes,
      oatc: oatc,
      timestamp: new Date().getTime()
    };
  } catch (e) {
    console.error("Error en sondeo silencioso: " + e.message);
    return { success: false, error: e.message };
  }
}