/**
 * ⚡ GESTIÓN DE BACKEND PARA CAJA, INVENTARIOS Y REPORTES
 * Integra las consultas de Supabase ySheets para dar soporte a las nuevas vistas premium.
 */

// 1. ENDPOINTS DE CAJA
function obtenerVentasCajaHoy() {
  try {
    const fechaHoy = Utilities.formatDate(new Date(), "America/Lima", "yyyy-MM-dd");
    // Traer las ventas registradas el día de hoy
    // Nota: ventas_caja filtra en la columna created_at o fecha
    const ventas = Supabase.select("ventas_caja", `select=*&order=created_at.desc`);
    
    // Filtrar localmente por fecha de hoy para garantizar robustez
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
    
    // 1. Validar stock actual
    const insumoArray = Supabase.select("insumos", `id=eq.${despacho.insumo_id}`);
    if (!insumoArray || insumoArray.length === 0) throw new Error("Insumo no encontrado.");
    
    const insumo = insumoArray[0];
    if (insumo.stock < despacho.cantidad) {
      throw new Error(`Stock insuficiente. Solo quedan ${insumo.stock} ${insumo.unidad_medida}.`);
    }

    // 2. Descontar stock
    const nuevoStock = insumo.stock - despacho.cantidad;
    Supabase.update("insumos", { stock: nuevoStock }, `id=eq.${despacho.insumo_id}`);

    // 3. Registrar despacho
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
    
    // A. Citas
    const citas = Supabase.select("registro_citas", `fecha=eq.${fechaHoy}`) || [];
    
    // B. Ventas y Facturación
    const ventas = obtenerVentasCajaHoy() || [];
    const facturacionHoy = ventas.reduce((acc, v) => acc + (parseFloat(v.monto_final) || 0), 0);
    
    // C. OATCs Activos (óptimo para recepción)
    const oatcs = Supabase.select("oatc", `fecha=eq.${fechaHoy}`) || [];
    const activas = oatcs.filter(o => o.estado_resolucion !== 'Resuelto').length;

    // D. Insumos Críticos (stock < 5)
    const insumos = obtenerInsumosInventario() || [];
    const criticos = insumos.filter(i => i.stock < 5).length;

    // E. Facturación por estilista
    // Agrupar
    const estilistasMap = {};
    const serviciosMap = {};

    ventas.forEach(v => {
      // Estilistas
      const agente = v.agente_id || "Sin Asignar";
      estilistasMap[agente] = (estilistasMap[agente] || 0) + (parseFloat(v.monto_final) || 0);

      // Servicios Categorias
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
