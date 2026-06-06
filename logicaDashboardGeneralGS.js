/**
 * 📊 Enrutamiento, Seguridad, Configuración General y Gestión de OATCs - Integración Supabase & Sheets
 * Consolida la lógica de Código.js, gestionBackendDashboards.js y gestionTablaOATCViewGS.js.
 */

// ==========================================
// DESDE: Código.js
// ==========================================

function doGet(e) {
  console.log("SERVER DEBUG: Iniciando enrutamiento de dashboards...");
  
  const page = 'recepcionDashboard';
  let title = 'Módulo ATC & Control de Operaciones - Gloss Salón';
  
  const param = e && e.parameter && e.parameter.p ? e.parameter.p.toLowerCase() : '';
  
  if (param === 'caja') {
    title = 'Dashboard Caja - Gloss Salón';
  } else if (param === 'insumos') {
    title = 'Inventario & Despacho Insumos - Gloss Salón';
  } else if (param === 'reportes') {
    title = 'Reportes & Estadísticas - Gloss Salón';
  } else if (param === 'recepcion') {
    title = 'Dashboard Recepción - Gloss Salón';
  }

  try {
    const htmlTemplate = HtmlService.createTemplateFromFile(page);
    const htmlOutput = htmlTemplate.evaluate();
    
    htmlOutput.setTitle(title)
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
              
    console.log(`SERVER DEBUG: Servido ${page} exitosamente.`);
    return htmlOutput;
  } catch (err) {
    console.error(`SERVER DEBUG CRÍTICO: Error al servir ${page}: ` + err.message, err.stack);
    return HtmlService.createHtmlOutput(`
      <html>
        <body style="background: #0f172a; color: #f1f5f9; font-family: sans-serif; padding: 30px; text-align: center;">
          <h1 style="color: #ef4444;">Error Crítico del Servidor</h1>
          <p>No se pudo cargar el Dashboard: ${err.message}</p>
        </body>
      </html>
    `).setTitle("Error de Servidor").setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
}

function include(filename) {
  const cleanFilename = filename.replace(/\.html$/, '');
  try {
    console.log("SERVER DEBUG: Incluyendo sub-plantilla:", cleanFilename);
    return HtmlService
      .createHtmlOutputFromFile(cleanFilename)
      .getContent();
  } catch (err) {
    console.error("SERVER DEBUG: Error al incluir sub-plantilla '" + filename + "' (limpio: '" + cleanFilename + "'): " + err.message);
    return `/* ERROR INCLUYENDO ${filename}: ${err.message} */`;
  }
}

function verificarPinUsuario(pin) {
  console.log("SERVER DEBUG: Iniciando verificarPinUsuario...");
  try {
    if (!pin || String(pin).trim() === "") {
      return { success: false, message: "PIN requerido." };
    }

    const pinLimpio = String(pin).trim();
    // Consultamos en Supabase por el PIN (password_hash) y estado activo
    const queryStr = `password_hash=eq.${encodeURIComponent(pinLimpio)}&estado=eq.activo`;
    console.log("SERVER DEBUG: Consultando usuarios con PIN query:", queryStr);
    const usuarios = Supabase.select("usuarios", queryStr);
    console.log("SERVER DEBUG: Usuarios obtenidos:", JSON.stringify(usuarios));
    
    if (!usuarios || usuarios.length === 0) {
      return { success: false, message: "PIN incorrecto o usuario inactivo." };
    }
    
    const usuario = usuarios[0];
    return {
      success: true,
      rol: usuario.rol,
      nombre: usuario.nombre,
      token: usuario.id
    };
  } catch (e) {
    console.error("SERVER DEBUG ERROR: Error en verificarPinUsuario: " + e.message, e.stack);
    return { success: false, message: "Error interno: " + e.message };
  }
}

function autenticarUsuario(username, password) {
  console.log("SERVER DEBUG: Iniciando autenticarUsuario...");
  try {
    if (!username || String(username).trim() === "" || !password || String(password).trim() === "") {
      return { success: false, message: "Usuario y contraseña requeridos." };
    }

    const userLimpio = String(username).trim();
    const passLimpio = String(password).trim();
    
    // Consultamos en Supabase por el username, password_hash y estado activo
    const queryStr = `username=eq.${encodeURIComponent(userLimpio)}&password_hash=eq.${encodeURIComponent(passLimpio)}&estado=eq.activo`;
    console.log("SERVER DEBUG: Consultando usuarios con query:", queryStr);
    const usuarios = Supabase.select("usuarios", queryStr);
    console.log("SERVER DEBUG: Usuarios obtenidos:", JSON.stringify(usuarios));
    
    if (!usuarios || usuarios.length === 0) {
      return { success: false, message: "Usuario o contraseña incorrectos, o usuario inactivo." };
    }
    
    const usuario = usuarios[0];
    return {
      success: true,
      rol: usuario.rol,
      nombre: usuario.nombre,
      token: usuario.id
    };
  } catch (e) {
    console.error("SERVER DEBUG ERROR: Error en autenticarUsuario: " + e.message, e.stack);
    return { success: false, message: "Error interno: " + e.message };
  }
}


/**
 * 🛠️ APIS DEL PANEL SECRETO (CRUD DIRECTO A SUPABASE)
 */
function obtenerDatosTablaSecreta(tabla) {
  try {
    // Si consulta la papelera, traemos todo
    if (tabla === 'garbage') {
      return Supabase.select("garbage", "select=*&order=fecha_eliminacion.desc");
    }
    // De lo contrario, traemos la tabla seleccionada ordenada por creación
    return Supabase.select(tabla, "select=*&order=created_at.desc");
  } catch(e) {
    throw new Error("No se pudo obtener la información de Supabase: " + e.message);
  }
}

function crearFilaSecreta(tabla, datos) {
  try {
    return Supabase.insert(tabla, datos);
  } catch(e) {
    throw new Error("Error al crear fila: " + e.message);
  }
}

function editFilaSecreta(tabla, id, datos) {
  try {
    return Supabase.update(tabla, datos, `id=eq.${id}`);
  } catch(e) {
    throw new Error("Error al modificar fila: " + e.message);
  }
}

// Retrocompatibilidad con nombres alternativos de llamada
function editarFilaSecreta(tabla, id, datos) {
  return editFilaSecreta(tabla, id, datos);
}

/**
 * 🗑️ BORRADO LÓGICO E INTEGRACIÓN CON LA PAPELERA (GARBAGE)
 */
function eliminarFilaSecretaConGarbage(tabla, id, justificacion) {
  try {
    // 1. Obtener la fila completa antes de borrarla
    const registros = Supabase.select(tabla, `id=eq.${id}`);
    if (!registros || registros.length === 0) throw new Error("Registro no encontrado.");
    const datosBorrados = registros[0];

    // 2. Insertar una copia en public.garbage
    const registroGarbage = {
      tabla_origen: tabla,
      registro_id: id,
      datos_eliminados: datosBorrados,
      justificacion: justificacion
    };
    Supabase.insert("garbage", registroGarbage);

    // 3. Eliminar físicamente el registro de la tabla original
    Supabase.delete(tabla, `id=eq.${id}`);

    return true;
  } catch(e) {
    throw new Error("Error en el flujo de borrado: " + e.message);
  }
}

/**
 * 🔄 RESTAURACIÓN DESDE PAPELERA
 */
function restaurarFilaSecreta(garbageId) {
  try {
    // 1. Obtener el registro de la papelera
    const garbageRecords = Supabase.select("garbage", `id=eq.${garbageId}`);
    if (!garbageRecords || garbageRecords.length === 0) throw new Error("Registro de basura no encontrado.");
    const item = garbageRecords[0];

    const tablaOriginal = item.tabla_origen;
    const datosOriginales = item.datos_eliminados;

    // 2. Volver a insertarlo en su tabla original
    Supabase.insert(tablaOriginal, datosOriginales);

    // 3. Quitarlo de la papelera
    Supabase.delete("garbage", `id=eq.${garbageId}`);

    return true;
  } catch(e) {
    throw new Error("Error al restaurar: " + e.message);
  }
}

// Libros (Para compatibilidad heredada de las partes no migradas aún)
var RegistrosAdmin = SpreadsheetApp.openById("1SXuedQigLxVUF2oxn65wEZ5-HnDDiVdy7lY7HaweVC4"); 
var RegistrosRecepcion = SpreadsheetApp.openById("1SXuedQigLxVUF2oxn65wEZ5-HnDDiVdy7lY7HaweVC4");


// ==========================================
// DESDE: gestionBackendDashboards.js
// ==========================================

// 1. ENDPOINTS DE CAJA
function obtenerVentasCajaHoy() {
  try {
    const fechaHoy = Utilities.formatDate(new Date(), "America/Lima", "yyyy-MM-dd");
    const ventas = Supabase.select("ventas_caja", `select=*&order=created_at.desc`);
    
    const hoyStr = Utilities.formatDate(new Date(), "America/Lima", "yyyy-MM-dd");
    return (ventas || []).filter(v => {
      if (!v.created_at) return false;
      const fStr = Utilities.formatDate(new Date(v.created_at), "America/Lima", "yyyy-MM-dd");
      return fStr === hoyStr;
    });
  } catch (e) {
    console.error("Error en obtenerVentasCajaHoy: " + e.message);
    return [];
  }
}

// 2. ENDPOINTS DE INVENTARIO (INSUMOS & DESPACHOS)
function obtenerInsumosInventario() {
  try {
    return Supabase.select("insumos", "select=*&order=nombre.asc");
  } catch (e) {
    console.error("Error en obtenerInsumosInventario: " + e.message);
    return [];
  }
}

function obtenerDespachosRecientes() {
  try {
    const despachos = Supabase.select("despacho_insumos", "select=*,insumos(*),agentes(*)&order=fecha_despacho.desc&limit=15");
    return (despachos || []).map(d => ({
      id: d.id,
      fecha_despacho: d.fecha_despacho,
      cantidad: d.cantidad,
      destino: d.destino || d.notas,
      insumo_nombre: d.insumos ? d.insumos.nombre : 'Insumo Eliminado',
      agente_nombre: d.agentes ? d.agentes.nombre_completo : 'N/A'
    }));
  } catch (e) {
    console.error("Error en obtenerDespachosRecientes: " + e.message);
    return [];
  }
}

function registrarInsumoServidor(insumo) {
  try {
    console.log("Registrando nuevo insumo:", JSON.stringify(insumo));
    return Supabase.insert("insumos", insumo);
  } catch (e) {
    console.error("Error en registrarInsumoServidor: " + e.message);
    throw new Error(e.message);
  }
}

function registrarDespachoServidor(despacho) {
  try {
    console.log("Registrando despacho:", JSON.stringify(despacho));
    
    const insumoArray = Supabase.select("insumos", `id=eq.${despacho.insumo_id}`);
    if (!insumoArray || insumoArray.length === 0) throw new Error("Insumo no encontrado.");
    
    const insumo = insumoArray[0];
    if (insumo.stock < despacho.cantidad) {
      throw new Error(`Stock insuficiente. Solo quedan ${insumo.stock} ${insumo.unidad_medida}.`);
    }

    const nuevoStock = insumo.stock - despacho.cantidad;
    Supabase.update("insumos", { stock: nuevoStock }, `id=eq.${despacho.insumo_id}`);

    const payload = {
      insumo_id: despacho.insumo_id,
      cantidad: despacho.cantidad,
      destino: despacho.destino || 'Salón General',
      fecha_despacho: new Date().toISOString()
    };
    
    return Supabase.insert("despacho_insumos", payload);
  } catch (e) {
    console.error("Error en registrarDespachoServidor: " + e.message);
    throw new Error(e.message);
  }
}

// 3. ENDPOINTS DE REPORTES & ESTADÍSTICAS
function obtenerDatosResumenReportes() {
  try {
    const fechaHoy = Utilities.formatDate(new Date(), "America/Lima", "yyyy-MM-dd");
    
    const citas = Supabase.select("registro_citas", `fecha=eq.${fechaHoy}`) || [];
    
    const ventas = obtenerVentasCajaHoy() || [];
    const facturacionHoy = ventas.reduce((acc, v) => acc + (parseFloat(v.monto_final) || 0), 0);
    
    const oatcs = Supabase.select("oatc", `fecha=eq.${fechaHoy}`) || [];
    const activas = oatcs.filter(o => o.estado_resolucion !== 'Resuelto').length;

    const insumos = obtenerInsumosInventario() || [];
    const criticos = insumos.filter(i => i.stock < 5).length;

    const estilistasMap = {};
    const serviciosMap = {};

    ventas.forEach(v => {
      const agente = v.agente_id || "Sin Asignar";
      estilistasMap[agente] = (estilistasMap[agente] || 0) + (parseFloat(v.monto_final) || 0);

      const cat = v.servicio_categoria || "Otros";
      serviciosMap[cat] = (serviciosMap[cat] || 0) + 1;
    });

    const estilistasNombres = Object.keys(estilistasMap);
    const estilistasFacturacion = Object.values(estilistasMap);
    const serviciosCategorias = Object.keys(serviciosMap);
    const serviciosCantidades = Object.values(serviciosMap);

    return {
      citasHoy: citas.length,
      facturacionHoy: facturacionHoy,
      ordenesActivas: activas,
      insumosCriticos: criticos,
      estilistasNombres: estilistasNombres.length > 0 ? estilistasNombres : ["Sin Ventas"],
      estilistasFacturacion: estilistasFacturacion.length > 0 ? estilistasFacturacion : [0],
      serviciosCategorias: serviciosCategorias.length > 0 ? serviciosCategorias : ["Otros"],
      serviciosCantidades: serviciosCantidades.length > 0 ? serviciosCantidades : [0]
    };
  } catch (e) {
    console.error("Error en obtenerDatosResumenReportes: " + e.message);
    return {
      citasHoy: 0,
      facturacionHoy: 0,
      ordenesActivas: 0,
      insumosCriticos: 0,
      estilistasNombres: ["Sin Ventas"],
      estilistasFacturacion: [0],
      serviciosCategorias: ["Otros"],
      serviciosCantidades: [0]
    };
  }
}


// ==========================================
// DESDE: gestionTablaOATCViewGS.js
// ==========================================

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
  
  const query = `fecha=eq.${fechaHoy}&or=(hora_resuelto.is.null,hora_resuelto.eq."")&select=*,agentes(apodo,nombre_completo),clientes(nombre,apellido,dni,celular)`;
  const oatcs = Supabase.select("oatc", query);
  
  const pendingOatcs = (oatcs || []).filter(o => !o.comentario_cancelacion || !o.comentario_cancelacion.startsWith("Cancelado"));

  const queryCitas = `fecha=eq.${fechaHoy}&estado=eq.Pendiente`;
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
      "",
      "",
      "",
      "",
      "",
      "Ausente"
    ]);
  });

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
      nuevoRow[12] = estado; 
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
