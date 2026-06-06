function obtenerListaAgentes() {
  try {
    // 1. Obtener todos los agentes activos de Supabase con apodo, nombre y especialidad
    const agentes = Supabase.select("agentes", "estado=eq.Activo&select=apodo,nombre_completo,especialidad");
    if (!agentes || agentes.length === 0) return [];
    
    // Mapear a un array de objetos con apodo y especialidad
    const lista = agentes.map(a => ({
      apodo: a.apodo || a.nombre_completo,
      especialidad: a.especialidad || "General"
    }));
    console.log("Agentes obtenidos de Supabase (con especialidad):", lista);
    return lista;
  } catch (e) {
    console.error("Error al obtener agentes de Supabase: " + e.message);
    return [];
  }
}

/**
 * Obtiene una lista única de agentes activos que NO tienen una hora de salida registrada hoy.
 * @returns {Array<object>} Lista de objetos {apodo, especialidad} de agentes actualmente dentro.
 */
function obtenerListaAgentesA() {
  try {
    const fechaHoy = Utilities.formatDate(new Date(), "America/Lima", "yyyy-MM-dd");

    // 1. Obtener asistencias de hoy donde salida esté vacío (o nulo) cruzando apodo, nombre y especialidad
    const asistencias = Supabase.select("control_asistencia", `fecha=eq.${fechaHoy}&salida=is.null&select=*,agentes(apodo,nombre_completo,especialidad)`);
    if (!asistencias || asistencias.length === 0) {
      console.log("No hay agentes activos dentro hoy en Supabase.");
      return [];
    }

    const agentesActuales = asistencias
      .map(asist => asist.agentes ? {
        apodo: asist.agentes.apodo || asist.agentes.nombre_completo,
        especialidad: asist.agentes.especialidad || "General"
      } : null)
      .filter(Boolean);

    // Eliminar duplicados por seguridad
    const mapaUnicos = {};
    const listaAgentesA = [];
    agentesActuales.forEach(a => {
      if (!mapaUnicos[a.apodo]) {
        mapaUnicos[a.apodo] = true;
        listaAgentesA.push(a);
      }
    });
    
    console.log("Agentes actualmente dentro hoy (con especialidad):", listaAgentesA);
    return listaAgentesA;
  } catch (e) {
    console.error("Error en obtenerListaAgentesA Supabase: " + e.message);
    return [];
  }
}

/**
 * Obtiene una lista bidimensional de los datos del cliente necesarios para la búsqueda múltiple.
 * @returns {Array<Array<string>>} Array de arrays con 5 valores por fila: [Nombre, Apellido, DNI, Email, Celular].
 */
function obtenerListaClientes() {
  try {
    // 1. Obtener clientes de Supabase
    const clientes = Supabase.select("clientes", "select=nombre,apellido,dni,email,celular");
    if (!clientes || clientes.length === 0) return [];

    // Formatear al array bidimensional esperado por el frontend
    const listaClientesFiltrada = clientes.map(c => [
      c.nombre,
      c.apellido,
      c.dni,
      c.email,
      c.celular
    ]);
    
    return listaClientesFiltrada;
  } catch (e) {
    console.error("Error al obtener clientes de Supabase: " + e.message);
    return [];
  }
}

/**
 * Función unificada para el sondeo silencioso.
 * Retorna todo lo necesario en una sola llamada.
 */
function obtenerEstadoGlobalServidor() {
  try {
    var proximoID = "";
    if (typeof obtenerNumeroLastOATC === 'function') {
      proximoID = obtenerNumeroLastOATC();
    } else {
      proximoID = "1"; 
    }
    
    return {
      nuevoID: proximoID,
      timestamp: new Date().getTime()
    };
  } catch (e) {
    console.error("Error en sondeo: " + e.message);
    return { nuevoID: "Error", error: e.message };
  }
}