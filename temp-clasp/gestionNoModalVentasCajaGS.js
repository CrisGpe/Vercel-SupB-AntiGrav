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