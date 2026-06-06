/**
 * 💖 Gestión de Fidelización de Clientes e Integración con Campañas - Supabase
 * Reemplaza por completo el backend tradicional de Sheets, operando en tiempo real con Supabase.
 */

/**
 * Obtiene solo los clientes con visitas (OATC) que no estén ya registrados en campañas de tratamientos para esa fecha.
 */
function obtenerDatosFidelizacionCruza() {
  try {
    console.log("📡 Cargando datos de fidelización desde Supabase...");
    
    // 1. Obtener atenciones ya registradas en la tabla camp_tratamientos
    const campDb = Supabase.select("camp_tratamientos", "select=cliente_id,fecha_oatc_original") || [];
    const excluidos = new Set();
    campDb.forEach(c => {
      if (c.cliente_id && c.fecha_oatc_original) {
        excluidos.add(`${c.cliente_id}_${c.fecha_oatc_original}`);
      }
    });

    // 2. Obtener todas las OATCs con datos del cliente asociado
    // Nota: Traemos todas las OATCs sin importar si hora_resuelto es nulo (según aclaración de seguridad y salida de recepción)
    const oatcDb = Supabase.select("oatc", "select=cliente_id,fecha,clientes(nombre,apellido,dni,celular)") || [];
    
    // 3. Mapear y cruzar visitas en memoria
    const mapaUltimasVisitas = {};

    oatcDb.forEach(o => {
      const clienteId = o.cliente_id;
      const fecha = o.fecha;
      const cliente = o.clientes;

      if (!clienteId || !fecha || !cliente) return;

      // Omitir clientes genéricos o de control
      const dni = String(cliente.dni || '').trim();
      if (dni === "00000000" || dni === "00000001" || dni === "00000002" || dni === "00000003" || dni.startsWith("TEMP_")) {
        return; 
      }

      // SOLO procesamos si NO está en el conjunto de excluidos
      if (!excluidos.has(`${clienteId}_${fecha}`)) {
        const fechaObj = new Date(fecha + "T12:00:00"); // Forzar zona local
        
        if (!mapaUltimasVisitas[clienteId] || fechaObj > mapaUltimasVisitas[clienteId].fechaObj) {
          mapaUltimasVisitas[clienteId] = {
            fechaObj: fechaObj,
            fechaTexto: Utilities.formatDate(fechaObj, "America/Lima", "dd/MM/yyyy"),
            cliente: cliente
          };
        }
      }
    });

    // 4. Construir resultado final
    const resultado = Object.keys(mapaUltimasVisitas).map(clienteId => {
      const item = mapaUltimasVisitas[clienteId];
      return {
        nombre: item.cliente.nombre,
        apellido: item.cliente.apellido,
        dni: item.cliente.dni,
        celular: item.cliente.celular || '---',
        ultimaVisitaTime: item.fechaObj.getTime(),
        ultimaVisitaTexto: item.fechaTexto
      };
    });

    // Ordenar de más reciente a más antiguo
    resultado.sort((a, b) => b.ultimaVisitaTime - a.ultimaVisitaTime);

    return JSON.stringify(resultado);
  } catch (e) {
    console.error("Error en cruce de fidelización Supabase: " + e.message);
    return JSON.stringify([]);
  }
}

/**
 * Obtiene el detalle de visitas históricas de un cliente que no hayan sido vinculadas aún a campañas.
 */
function obtenerDetalleVisitasCliente(dni) {
  try {
    if (!dni) return JSON.stringify([]);
    const dniLimpio = String(dni).trim();

    // 1. Buscar al cliente en Supabase
    const clis = Supabase.select("clientes", `dni=eq.${dniLimpio}`);
    if (!clis || clis.length === 0) return JSON.stringify([]);
    const cliente = clis[0];

    // 2. Obtener atenciones de ese cliente en campañas para exclusión
    const campDb = Supabase.select("camp_tratamientos", `cliente_id=eq.${cliente.id}`) || [];
    const excluidos = new Set(campDb.map(c => c.fecha_oatc_original));

    // 3. Obtener todas las visitas históricas del cliente ordenadas desc
    const oatcs = Supabase.select("oatc", `cliente_id=eq.${cliente.id}&select=*,agentes(apodo,nombre_completo)&order=fecha.desc`) || [];

    // 4. Filtrar y mapear visitas
    const visitas = oatcs
      .filter(o => o.fecha && !excluidos.has(o.fecha))
      .map(o => {
        const fechaAtencion = new Date(o.fecha + "T12:00:00");
        const agenteName = o.agentes ? (o.agentes.apodo || o.agentes.nombre_completo) : "POR ASIGNAR";
        
        return {
          fecha: Utilities.formatDate(fechaAtencion, "America/Lima", "dd/MM/yyyy"),
          tipo: o.categoria_demanda || "cliente",
          atencion: o.tipo_oatc || "General",
          agente: agenteName
        };
      });

    return JSON.stringify(visitas);
  } catch (e) {
    console.error("Error en obtenerDetalleVisitasCliente Supabase: " + e.message);
    return JSON.stringify([]);
  }
}

/**
 * Registra las visitas seleccionadas en la tabla camp_tratamientos
 */
function registrarAccionCampana(datos) {
  try {
    if (!datos || datos.length === 0) return false;

    // Resuelve lote de DNI a cliente_id de forma masiva para evitar queries individuales
    const dnisUnicos = [...new Set(datos.map(d => String(d.dni).trim()))];
    const mapClientes = {};
    
    if (dnisUnicos.length > 0) {
      const dnisQuery = dnisUnicos.map(d => `"${d}"`).join(",");
      const clis = Supabase.select("clientes", `dni=in.(${dnisQuery})`) || [];
      clis.forEach(c => {
        mapClientes[String(c.dni).trim()] = c.id;
      });
    }

    const parseFechaStr = (str) => {
      if (!str) return null;
      const partes = str.split('/');
      return `${partes[2]}-${partes[1]}-${partes[0]}`; // yyyy-MM-dd
    };

    const registrosParaInsertar = datos.map(d => {
      const clienteId = mapClientes[String(d.dni).trim()];
      if (!clienteId) return null;

      return {
        cliente_id: clienteId,
        fecha_oatc_original: parseFechaStr(d.fechaAtencion),
        servicio_origen: d.servicioOrigen || "General",
        campana_asignada: d.campanaAsignada
      };
    }).filter(Boolean);

    if (registrosParaInsertar.length > 0) {
      Supabase.insert("camp_tratamientos", registrosParaInsertar);
      console.log(`✅ ¡Insertados ${registrosParaInsertar.length} registros en camp_tratamientos!`);
    }

    return true;
  } catch (e) {
    console.error("Error en registrarAccionCampana Supabase: " + e.message);
    return false;
  }
}

/**
 * Obtiene los registros de una campaña específica desde camp_tratamientos
 */
function obtenerDatosPorCampana(nombreCampana) {
  try {
    if (!nombreCampana) return JSON.stringify([]);
    
    console.log(`📡 Consultando tratamientos para la campaña: ${nombreCampana}`);
    const query = `campana_asignada=eq.${nombreCampana}&select=*,clientes(nombre,apellido,celular,dni)&order=fecha_oatc_original.desc`;
    const campDb = Supabase.select("camp_tratamientos", query) || [];

    const resultado = campDb.map(r => {
      const cli = r.clientes || { nombre: "Desconocido", apellido: "", celular: "---", dni: "" };
      const fechaAtencion = r.fecha_oatc_original ? new Date(r.fecha_oatc_original + "T12:00:00") : new Date();

      return {
        nombre: cli.nombre,
        apellido: cli.apellido,
        dni: cli.dni,
        celular: cli.celular || '---',
        ultimaVisitaTexto: Utilities.formatDate(fechaAtencion, "America/Lima", "dd/MM/yyyy"),
        ultimaVisitaTime: fechaAtencion.getTime(),
        campana: r.campana_asignada,
        esCampana: true
      };
    });

    return JSON.stringify(resultado);
  } catch (e) {
    console.error("Error en obtenerDatosPorCampana Supabase: " + e.message);
    return JSON.stringify([]);
  }
}