function obtenerHistorialCliente(clienteBusqueda) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hoja = ss.getSheetByName("OATC"); // Asegúrate de que el nombre sea exacto
    if (!hoja) throw new Error("No se encontró la hoja 'Registros'");

    const datos = hoja.getDataRange().getValues();
    // Quitamos el encabezado (fila 1)
    const registros = datos.slice(1);

    // Mapeo según tus especificaciones:
    // Col A(0): Hora Inicio | Col B(1): ID OATC | Col C(2): Tipo Atención 
    // Col D(3): Fecha | Col E(4): Cliente | Col F(5): Tipo (Cliente/Turno)
    // Col G(6): Agente | Col H(7): Fin Atención
    
    const historial = registros
      .filter(fila => fila[4] === clienteBusqueda) // Coincidencia exacta Col E
      .map(fila => {
        return {
          fecha: fila[3] instanceof Date ? Utilities.formatDate(fila[3], ss.getSpreadsheetTimeZone(), "dd/MM/yyyy") : fila[3],
          horaInicio: fila[0],
          horaFin: fila[7],
          idOatc: fila[1],
          tipoAtencion: fila[2],
          tipoCliente: fila[5],
          agente: fila[6]
        };
      })
      .reverse(); // Mostrar lo más reciente primero

    return historial;
  } catch (e) {
    console.error("Error en obtenerHistorialCliente: " + e.message);
    return [];
  }
}