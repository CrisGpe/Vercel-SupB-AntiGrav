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
      ultima_act: new Date().toISOString() // Almacena el timestamp completo de Lima para ordenar la cola
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
      ultima_act: new Date().toISOString() // SÍ modifica la prioridad
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
        // NOTA: 'En refrigerio' NO actualiza ultima_act para no alterar prioridad
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
      // 'En terapia' NO actualiza ultima_act
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
  // Esta función es redundante con registrarRefrigerio en el nuevo modelo REST,
  // pero la mantenemos devolviendo un mensaje coherente por retrocompatibilidad.
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
      // 'Pasar la voz' NO actualiza ultima_act
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
      // 'En otro salón' NO actualiza
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
      // 'Salió del salón' NO actualiza
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