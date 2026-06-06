/**
 * 📊 Gestión de Tabla de Órdenes de Atención (OATC) - Integración Supabase
 * Lee y manipula las OATCs directamente en Supabase, desvinculando por completo Google Sheets.
 */

function obtenerOATCRegistradasTodas() {
  const fechaHoy = Utilities.formatDate(new Date(), "America/Lima", "yyyy-MM-dd");
  
  const query = `fecha=eq.${fechaHoy}&select=*,agentes(apodo,nombre_completo),clientes(nombre,apellido,dni,celular)`;
  const oatcs = Supabase.select("oatc", query);
  
  const queryCitas = `fecha=eq.${fechaHoy}`;
  const citas = Supabase.select("registro_citas", queryCitas);

  let result = [];
  
  (citas || []).forEach(c => {
    result.push([
      c.hora,
      c.id,
      c.servicio,
      c.fecha,
      c.cliente,
      "cita",
      c.agente || "",
      c.estado === "Resuelta" ? "RESUELTO" : "",
      "",
      "",
      c.estado === "Cancelada" ? "CANCELADO" : "",
      "",
      "Ausente"
    ]);
  });

  (oatcs || []).forEach(o => {
    const agenteName = o.agentes ? (o.agentes.apodo || o.agentes.nombre_completo) : "";
    const clienteName = o.clientes ? `${o.clientes.nombre} ${o.clientes.apellido}`.trim() : "POR ASIGNAR";
    result.push([
      o.hora_registro || "",
      o.id,
      o.tipo_oatc || "",
      o.fecha || "",
      clienteName,
      o.categoria_demanda || "",
      agenteName,
      o.hora_resuelto || "",
      o.inicio_espera || "",
      o.tiempo_espera || "",
      o.comentario_cancelacion || "",
      o.correlativo || "",
      ""
    ]);
  });

  return inyectarEstadoAgentesEnOATC(result);
}

function obtenerOATCPendientes() {
  const fechaHoy = Utilities.formatDate(new Date(), "America/Lima", "yyyy-MM-dd");
  
  // 1. Obtener OATCs pendientes de Supabase
  const query = `fecha=eq.${fechaHoy}&or=(hora_resuelto.is.null,hora_resuelto.eq."")&select=*,agentes(apodo,nombre_completo),clientes(nombre,apellido,dni,celular)`;
  const oatcs = Supabase.select("oatc", query);
  
  // Filtrar las canceladas
  const pendingOatcs = (oatcs || []).filter(o => !o.comentario_cancelacion || !o.comentario_cancelacion.startsWith("Cancelado"));

  // 2. Obtener Citas pendientes
  const queryCitas = `fecha=eq.${fechaHoy}&estado=eq.Pendiente`;
  const citas = Supabase.select("registro_citas", queryCitas);

  let result = [];
  
  // Primero Citas
  (citas || []).forEach(c => {
    result.push([
      c.hora,
      c.id,
      c.servicio,
      c.fecha,
      c.cliente,
      "cita",
      c.agente || "",
      "",
      "",
      "",
      "",
      "",
      "Ausente"
    ]);
  });

  // Luego OATCs
  pendingOatcs.forEach(o => {
    const agenteName = o.agentes ? (o.agentes.apodo || o.agentes.nombre_completo) : "";
    const clienteName = o.clientes ? `${o.clientes.nombre} ${o.clientes.apellido}`.trim() : "POR ASIGNAR";
    result.push([
      o.hora_registro || "",
      o.id,
      o.tipo_oatc || "",
      o.fecha || "",
      clienteName,
      o.categoria_demanda || "",
      agenteName,
      o.hora_resuelto || "",
      o.inicio_espera || "",
      o.tiempo_espera || "",
      o.comentario_cancelacion || "",
      o.correlativo || "",
      ""
    ]);
  });

  return inyectarEstadoAgentesEnOATC(result);
}

function obtenerOATCResueltas() {
  const fechaHoy = Utilities.formatDate(new Date(), "America/Lima", "yyyy-MM-dd");
  
  const query = `fecha=eq.${fechaHoy}&hora_resuelto=neq.&select=*,agentes(apodo,nombre_completo),clientes(nombre,apellido,dni,celular)`;
  const oatcs = Supabase.select("oatc", query);
  
  // Filtrar las canceladas
  const resueltasOatcs = (oatcs || []).filter(o => o.hora_resuelto && (!o.comentario_cancelacion || !o.comentario_cancelacion.startsWith("Cancelado")));

  let result = [];
  
  resueltasOatcs.forEach(o => {
    const agenteName = o.agentes ? (o.agentes.apodo || o.agentes.nombre_completo) : "";
    const clienteName = o.clientes ? `${o.clientes.nombre} ${o.clientes.apellido}`.trim() : "POR ASIGNAR";
    result.push([
      o.hora_registro || "",
      o.id,
      o.tipo_oatc || "",
      o.fecha || "",
      clienteName,
      o.categoria_demanda || "",
      agenteName,
      o.hora_resuelto || "",
      o.inicio_espera || "",
      o.tiempo_espera || "",
      o.comentario_cancelacion || "",
      o.correlativo || "",
      ""
    ]);
  });

  return inyectarEstadoAgentesEnOATC(result);
}

function inyectarEstadoAgentesEnOATC(registrosDeHoy) {
  try {
    const fechaHoy = Utilities.formatDate(new Date(), "America/Lima", "yyyy-MM-dd");
    const asistencias = Supabase.select("control_asistencia", `fecha=eq.${fechaHoy}&select=*,agentes(apodo,nombre_completo)`);
    
    const mapaEstados = {};
    if (asistencias && asistencias.length > 0) {
      asistencias.forEach(asist => {
        const name = asist.agentes ? (asist.agentes.apodo || asist.agentes.nombre_completo) : null;
        if (name) {
          mapaEstados[name.trim()] = asist.estado_texto || "Ausente";
        }
      });
    }

    return registrosDeHoy.map(row => {
      const agenteName = row[6] ? String(row[6]).trim() : "";
      const estado = mapaEstados[agenteName] || "Ausente";
      
      const nuevoRow = [...row];
      nuevoRow[12] = estado; // Inyectar estado en índice 12
      return nuevoRow;
    });
  } catch (e) {
    console.error("Error inyectando estado de agentes en OATC: " + e.message);
    return registrosDeHoy;
  }
}

function guardarDetalleNotas(idOatc, monto, notas) {
  try {
    const parsedMonto = parseFloat(monto) || 0;
    const comment = `Monto: ${parsedMonto} | Nota: ${notas}`;
    Supabase.update("oatc", { comentario_cancelacion: comment }, `id=eq.${idOatc}`);
    return { success: true };
  } catch (e) {
    console.error("Error al guardar notas de OATC: " + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * 📊 Obtiene el histórico completo de OATCs cruzado para filtros dinámicos
 */
function obtenerHistoricoOATCParaFiltros(fechaInicio, fechaFin) {
  try {
    console.log(`📡 Consultando histórico de OATCs entre ${fechaInicio} y ${fechaFin}...`);
    const query = `fecha=gte.${fechaInicio}&fecha=lte.${fechaFin}&select=*,agentes(apodo,nombre_completo),clientes(nombre,apellido,dni,celular)&order=fecha.desc,hora_registro.desc`;
    const oatcs = Supabase.select("oatc", query) || [];
    
    const resultado = oatcs.map(o => {
      const cliente = o.clientes || { nombre: "POR", apellido: "ASIGNAR", dni: "---", celular: "---" };
      const agenteName = o.agentes ? (o.agentes.apodo || o.agentes.nombre_completo) : "POR ASIGNAR";
      
      let fechaTexto = '---';
      if (o.fecha) {
        const partes = o.fecha.split('-');
        if (partes.length === 3) {
          fechaTexto = `${partes[2]}/${partes[1]}/${partes[0]}`;
        }
      }

      return {
        id: o.id,
        correlativo: o.correlativo || '',
        fecha: o.fecha || '',
        fechaTexto: fechaTexto,
        hora: o.hora_registro || '',
        clienteNombre: `${cliente.nombre || ''} ${cliente.apellido || ''}`.trim(),
        clienteDni: cliente.dni || '---',
        clienteCelular: cliente.celular || '---',
        demanda: o.categoria_demanda || 'cliente',
        atencion: o.tipo_oatc || 'General',
        agente: agenteName,
        horaResuelto: o.hora_resuelto || '',
        cancelado: o.comentario_cancelacion || ''
      };
    });

    return JSON.stringify(resultado);
  } catch (e) {
    console.error("Error en obtenerHistoricoOATCParaFiltros: " + e.message);
    return JSON.stringify([]);
  }
}