/**
 * Busca una OATC por ID y devuelve sus datos relevantes (incluyendo el cliente).
 * @param {string} oatcIdLimpio El ID de la OATC a buscar.
 * @returns {Object|null} Objeto con los datos {clienteNombre, tipoAtencion, ...} o null si no se encuentra.
 */
function obtenerDatosOATCparaEdicionCliente(oatcIdLimpio) {
  const hojaBorrador = RegistrosRecepcion.getSheetByName("Borrador");
  if (!hojaBorrador) return null;

  // Asumimos que la sección de OATC empieza en la Columna O (15)
  // Leeremos las columnas O a S (OATC ID, Tipo Cliente, etc.)
  const COL_INICIO = 15; // Columna O
  const NUM_COLUMNAS = 5; // O, P, Q, R, S

  const ultimaFila = hojaBorrador.getLastRow();
  if (ultimaFila < 2) return null;

  const datosOATC = hojaBorrador.getRange(2, COL_INICIO, ultimaFila - 1, NUM_COLUMNAS).getDisplayValues();

  // Índices en el array leído (O:S):
  const IDX_ID = 0; // Col O
  const IDX_CLIENTE_NOMBRE = 3; // Col Q (Asumimos que el nombre del cliente está en la Columna Q, índice 2)
  

  for (let i = 0; i < datosOATC.length; i++) {
    const fila = datosOATC[i];
    if (String(fila[IDX_ID]).trim() === String(oatcIdLimpio).trim()) {
      const clienteActual = String(fila[IDX_CLIENTE_NOMBRE]).trim();

      // 1. Obtener la lista completa de clientes (5 columnas)
      const listaClientesCompleta = obtenerListaClientes();
      return {
        clienteNombre: clienteActual,
        listaClientes: listaClientesCompleta,
      };
    }
  }
  return null;
}
function obtenerDatosOATCparaEdicionServicio(oatcIdLimpio) {
  const hojaBorrador = RegistrosRecepcion.getSheetByName("Borrador");
  if (!hojaBorrador) return null;

  // Asumimos que la sección de OATC empieza en la Columna O (15)
  // Leeremos las columnas O a S (OATC ID, Tipo Cliente, etc.)
  const COL_INICIO = 15; // Columna O
  const NUM_COLUMNAS = 5; // O, P, Q, R, S

  const ultimaFila = hojaBorrador.getLastRow();
  if (ultimaFila < 2) return null;

  const datosOATC = hojaBorrador.getRange(2, COL_INICIO, ultimaFila - 1, NUM_COLUMNAS).getDisplayValues();

  // Índices en el array leído (O:S):
  const IDX_ID = 0; // Col O
  const IDX_TIPO_SERVICIO = 1; // col P

  for (let i = 0; i < datosOATC.length; i++) {
    const fila = datosOATC[i];
    if (String(fila[IDX_ID]).trim() === String(oatcIdLimpio).trim()) {
      return {
        tipoServicio: String(fila[IDX_TIPO_SERVICIO]).trim(),
      };
    }
  }
  return null;
}
/**
 * Actualiza el nombre del cliente (Columna R) para una OATC específica (ID en Columna O)
 * en la hoja "Borrador".
 * * @param {string} idOATC El ID de la OATC (el valor exacto de la Columna O).
 * @param {string} nuevoNombre El nuevo nombre del cliente.
 * @returns {string} Mensaje de éxito o error para el cliente.
 */
function actualizarNombreClienteOATC(idOATC, nuevoNombre) {
  // Usamos el ID del libro que usaste en registrarCita
  const SPREADSHEET_ID = "1SXuedQigLxVUF2oxn65wEZ5-HnDDiVdy7lY7HaweVC4"; 
  const HOJA_OATC_NOMBRE = "Borrador"; 
  const COL_ID_OATC = 15; // Columna O
  const COL_CLIENTE_NOMBRE = 18; // Columna R (Nombre Cliente OATC)

  try {
    const libro = SpreadsheetApp.openById(SPREADSHEET_ID);
    const hojaOATC = libro.getSheetByName(HOJA_OATC_NOMBRE);
    
    if (!hojaOATC) {
      return `Error: Hoja '${HOJA_OATC_NOMBRE}' no encontrada.`;
    }

    // Leemos el rango de datos relevante (desde Columna O hasta la última fila)
    // Asumimos que la OATC se busca por su ID completo (ej. "cita 10:00 a")
    const ultimaFila = hojaOATC.getLastRow();
    
    if (ultimaFila < 2) {
      return "Error: No hay OATCs registradas en Borrador.";
    }

    // Leemos la columna O (IDs) para buscar coincidencias
    const rangoIDs = hojaOATC.getRange(1, COL_ID_OATC, ultimaFila, 1).getDisplayValues(); 
    let filaEncontrada = -1;

    // Buscamos la fila cuyo ID coincide
    for (let i = 1; i < rangoIDs.length; i++) { // Empezar desde la fila 2 (índice 1)
      if (String(rangoIDs[i][0]).trim() === String(idOATC).trim()) {
        filaEncontrada = i + 1; // Fila real en la hoja (base 1)
        break;
      }
    }

    if (filaEncontrada !== -1) {
      // Escribir el nuevo nombre en la columna R de la fila encontrada
      hojaOATC.getRange(filaEncontrada, COL_CLIENTE_NOMBRE).setValue(nuevoNombre);
      return `✅ Cliente de OATC #${idOATC} actualizado a: ${nuevoNombre}`;
    } else {
      return `Error: OATC #${idOATC} no encontrada en la hoja ${HOJA_OATC_NOMBRE}.`;
    }

  } catch (e) {
    console.error("Error al actualizar cliente:", e);
    return `Error de conexión o script: ${e.message}`;
  }
}