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