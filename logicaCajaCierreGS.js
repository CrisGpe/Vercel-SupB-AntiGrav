/**
 * 💰 Gestión de Caja, Ventas y Arqueo de Cierre Diario - Integración Sheets
 * Consolida la lógica de gestionNoModalVentasCajaGS.js y gestionCierreGS.js.
 */

// ==========================================
// DESDE: gestionNoModalVentasCajaGS.js
// ==========================================

/**
 * Escribe las filas en la hoja de Caja según tus requerimientos de columnas
 */
function registrarVentaEnCaja(datosVenta) {
  const ID_SS_CAJA = "1qAbkESiV1zPy2JVTySdgFzWLPb5OTvd4bqKqkNbi4Lg";
  const ssCaja = SpreadsheetApp.openById(ID_SS_CAJA);
  const hojaRegistro = ssCaja.getSheetByName("Registro ventas caja");
  
  const fechaHoy = new Date();
  const ticketID = generarTicketID(hojaRegistro); 

  // Mapeamos el carrito para que cada producto sea una fila
  const filasParaInsertar = datosVenta.items.map(producto => {
    return [
      fechaHoy,                   // A: Fecha
      ticketID,                   // B: Ticket_ID
      datosVenta.idOatc,          // C: ID_OATC
      datosVenta.cliente,         // D: Cliente REAL
      datosVenta.agente,          // E: Agente REAL
      "Venta Producto",           // F: Servicio_Original
      producto.nombre,            // G: Servicio_Final (DETALLE AQUÍ)
      "Venta Producto",           // H: Servicio_SubCategoria
      "Venta Producto",           // I: Servicio_Categoria
      0, 0, 0,                    // J, K, L: Montos
      producto.precio,            // M: Monto_Final (MONTO POR PRODUCTO)
      0,                          // N: Comisión
      "Stand-by",                 // O: Estado
      "",                         // P: RUC
      ""                          // Q: Boleta (VACÍO)
    ];
  });

  // Escritura masiva en la hoja
  hojaRegistro.getRange(hojaRegistro.getLastRow() + 1, 1, filasParaInsertar.length, filasParaInsertar[0].length)
              .setValues(filasParaInsertar);

  return { success: true, ticket: ticketID };
}

/**
 * Obtiene productos de la base de datos externa
 */
function obtenerListaProductosVenta() {
  const ID_SS_PRODUCTOS = "1s9W4vOYwznpsLtEc7lYDYAYmfI_r-CJORaZ5G6eVqSA";
  try {
    const ssProd = SpreadsheetApp.openById(ID_SS_PRODUCTOS);
    const hojaProd = ssProd.getSheetByName("BBDD_Productos");
    const data = hojaProd.getDataRange().getValues();
    data.shift(); // Quitar cabecera
    
    return data.map(r => {
      // Concatenamos Nombre (Col D) + Presentación (Col E)
      const nombreCompleto = `${String(r[3] || '')} ${String(r[4] || '')}`.trim();
      
      return {
        sku: String(r[0] || ""),
        marca: String(r[1] || ""),     // Col B
        linea: String(r[2] || ""),     // Col C
        nombre: nombreCompleto,        // Col D + E
        precio: parseFloat(r[5]) || 0,
        precioMinimo: parseFloat(r[6]) || 0  // Col F
      };
    }).filter(p => p.nombre.length > 2); // Filtra filas vacías
  } catch (e) {
    console.error("Error obteniendo productos: " + e.toString());
    return [];
  }
}

function generarTicketID(hoja) {
  const hoy = new Date().toLocaleDateString();
  const data = hoja.getDataRange().getValues();
  
  const ventasHoy = data.filter(fila => {
    const fechaFila = fila[0] instanceof Date ? fila[0].toLocaleDateString() : "";
    return fechaFila === hoy;
  });

  const correlativo = ventasHoy.length + 1;
  return "V" + String(correlativo).padStart(3, '0');
}

/**
 * Procesa la venta recibiendo cliente y agente reales desde el modal
 */
function procesarVentaCajaServidor(idOatc, carrito, cliente, agente) {
  try {
    // Preparamos el objeto con los datos capturados
    const datosVenta = {
      idOatc: idOatc,
      cliente: cliente, // Ahora viene del modal
      agente: agente,   // Ahora viene del modal
      items: carrito    // Array de productos con sus precios editados
    };

    // Llamamos a la función de registro
    const resultadoCaja = registrarVentaEnCaja(datosVenta);

    if (resultadoCaja.success) {
      const mensajeResolucion = resolverOATC(idOatc, agente);
      
      console.log(`[DEBUG] Resultado de resolverOATC: ${mensajeResolucion}`);
      return {
        success: true,
        ticket: resultadoCaja.ticket,
        mensajeResolucion: mensajeResolucion
      };
    } else {
      throw new Error("Error al insertar fila en caja.");
    }

  } catch (e) {
    console.error("Error en procesarVentaCajaServidor: " + e.toString());
    throw new Error("Servidor: " + e.message);
  }
}


// ==========================================
// DESDE: gestionCierreGS.js
// ==========================================

function pasarBorrador() {
  // Definimos el ID del libro de cálculo
  const SPREADSHEET_ID = "1SXuedQigLxVUF2oxn65wEZ5-HnDDiVdy7lY7HaweVC4";
  const libro = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  // Referencias a las hojas
  const hojaBorrador = libro.getSheetByName("Borrador");
  const hojaAsistencia = libro.getSheetByName("Asistencia");
  const hojaOATC = libro.getSheetByName("OATC");

  // Verificaciones básicas
  if (!hojaBorrador || !hojaAsistencia || !hojaOATC) {
    throw new Error("Error: No se encontraron todas las hojas necesarias (Borrador, Asistencia, OATC).");
  }

  // Usamos getLastRow() para encontrar el final de los datos en la hoja (Columna A/Global)
  const ultimaFilaGlobal = hojaBorrador.getLastRow();
  
  // Si no hay datos (solo encabezado), salimos temprano
  if (ultimaFilaGlobal < 2) {
    console.log("DEBUG(Servidor/PasarBorrador): No hay datos en el borrador para transferir.");
    return "Borrador vacío, no se transfirieron datos.";
  }
  
  // --- 1. Procesar datos de Asistencia (Columnas A a H) ---
  const rangoAsistencia = hojaBorrador.getRange(2, 1, ultimaFilaGlobal - 1, 8);
  const valoresBorradorAsistencia = rangoAsistencia.getValues();

  const filaInicioAsistencia = hojaAsistencia.getLastRow() + 1;

  // Escritura masiva de datos de Asistencia
  hojaAsistencia
    .getRange(filaInicioAsistencia, 1, valoresBorradorAsistencia.length, valoresBorradorAsistencia[0].length)
    .setValues(valoresBorradorAsistencia);
  
  console.log(`DEBUG(Servidor/PasarBorrador): ${valoresBorradorAsistencia.length} filas de Asistencia transferidas.`);

  // ----------------------------------------------------------------------------------

  // --- 2. Procesar datos OATC (Columnas N a Z) ---
  
  // Asumimos que terminan a la par
  const ultimaFilaOATC = ultimaFilaGlobal; 

  if (ultimaFilaOATC > 1) { 
    // Obtener el rango de datos de N2 a Z (13 columnas de ancho: N a Z)
    // N (14) -> O, P, Q, R, S, T, U, V, W, X, Y, Z (26)
    // 26 - 14 + 1 = 13 columnas
    
    // *** CAMBIO CLAVE: ANCHO DE COLUMNAS DE 7 A 15 ***
    const rangoOATC = hojaBorrador.getRange(2, 14, ultimaFilaOATC - 1, 15);
    const valoresBorradorOATC = rangoOATC.getValues();

    const filaInicioOATC = hojaOATC.getLastRow() + 1;

    // Escritura masiva de datos OATC
    hojaOATC
      .getRange(filaInicioOATC, 1, valoresBorradorOATC.length, valoresBorradorOATC[0].length)
      .setValues(valoresBorradorOATC);

    console.log(`DEBUG(Servidor/PasarBorrador): ${valoresBorradorOATC.length} filas de OATC transferidas.`);
  }

  // ----------------------------------------------------------------------------------

  // --- 3. Limpiar la hoja Borrador ---
  // Limpia todo el contenido desde la fila 2 hasta la última fila usada, en todas las columnas.
  if (ultimaFilaGlobal > 1) {
    hojaBorrador.getRange(2, 1, ultimaFilaGlobal - 1, hojaBorrador.getLastColumn()).clearContent();
  }

  return "Proceso de cierre de sistema completado con éxito.";
}
