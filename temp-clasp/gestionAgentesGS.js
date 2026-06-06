/**
 * Obtiene todos los datos de la hoja "Agentes" para mostrarlos en el modal.
 * Transforma las fechas/horas a cadenas para evitar problemas de serialización.
 */
function obtenerDatosAgentes() {
    const sheet = RegistrosAdmin.getSheetByName("Agentes"); 

    if (!sheet) {
        Logger.log("Error: La hoja 'Agentes' no fue encontrada.");
        return []; 
    }
    
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
        return [];
    }
    
    // Obtener los datos sin encabezado
    const lastCol = sheet.getLastColumn();
    const values = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues(); 

    // Definición de índices
    const FICHA_COL = 1;         
    const NOMBRE_COMPLETO_COL = 2; 
    const INGRESO_COL = 5;       
    const SALIDA_COL = 6;        
    const DIADESC_COL = 7;       
    const APODO_COL = 8;         
    const DNI_COL = 9;           
    const ESTADO_COL = 10;       
    const ESPECIALIDAD_COL = 11; 

    // Mapear y sanear los datos
    const agentes = values.map(row => {
        
        // --- CONVERSIÓN CRÍTICA AJUSTADA (hh:mm a) ---
        // 'hh' para hora en 12h, 'a' para AM/PM
        let ingresoStr = row[INGRESO_COL] instanceof Date ? 
                         Utilities.formatDate(row[INGRESO_COL], Session.getScriptTimeZone(), "hh:mm a") : 
                         String(row[INGRESO_COL] || '');
                         
        let salidaStr = row[SALIDA_COL] instanceof Date ? 
                        Utilities.formatDate(row[SALIDA_COL], Session.getScriptTimeZone(), "hh:mm a") : 
                        String(row[SALIDA_COL] || '');
        // ----------------------------------------------------------------
        
        return {
            id: row[FICHA_COL],
            nombreCompleto: row[NOMBRE_COMPLETO_COL],
            dni: row[DNI_COL] || 'N/A',
            apodo: row[APODO_COL],
            // Los campos ahora contendrán formato 12 horas (Ej: "10:00 AM")
            ingreso: ingresoStr,
            salida: salidaStr,
            diadesc: row[DIADESC_COL] || 'N/A', 
            especialidad: row[ESPECIALIDAD_COL] || 'General',
            estado: row[ESTADO_COL] || 'Inactivo'
        };
    });
    
  return agentes;
}
/**
 * Busca un agente por su ID de Ficha (Columna B).
 * @param {string} agenteId - El ID de la Ficha.
 * @returns {Object|null} Objeto con los datos del agente o null si no se encuentra.
 */
function obtenerDatosAgentePorId(agenteId) {
  const sheet = RegistrosAdmin.getSheetByName("Agentes");
  const data = sheet.getDataRange().getValues();
  
  // Asumiendo que la columna Ficha (ID) es la columna B (Índice 1)
  const FICHA_COL = 1;

  for (let i = 1; i < data.length; i++) {
    // Compara el valor de la columna Ficha (data[i][1]) con el ID buscado
    if (data[i][FICHA_COL] == agenteId) {
      const row = data[i];
      // Mapea y devuelve el objeto completo con todos los campos necesarios para edición
      return {
        fila: i + 1, // La fila en la hoja
        id: row[1],
        nombreCompleto: row[2],
        relacionLaboral: row[3],
        salon: row[4],
        ingreso: row[5], // HR entrada
        salida: row[6],  // HR salida
        diadesc: row[7], // Día Descanso
        apodo: row[8],
        dni: row[9],
        estado: row[10],
        especialidad: row[11],
        valorEspecialidad: row[12],
        nickname: row[13],
        celular: row[14],
        genero: row[15]
        // ... incluye el resto de las columnas si son necesarias para edición
      };
    }
  }
  return null;
}

/**
 * Agrega un nuevo agente o edita uno existente.
 * @param {Object} datos - Objeto con los datos del agente.
 * @returns {Object} Resultado de la operación.
 */
function guardarOEditarAgente(datos) {
  const sheet = RegistrosAdmin.getSheetByName("Agentes");
  
  // Definición de índices de columna (ajusta estos si tu hoja cambia)
  const INDICES = {
    // 0: Fecha Registro
    FICHA: 1, // B
    NOMBRE_COMPLETO: 2, // C
    RELACION_LABORAL: 3, // D (Asumo 'Agente dependiente' por defecto)
    SALON: 4, // E (Asumo 'Gloss Salon' por defecto)
    HR_ENTRADA: 5, // F
    HR_SALIDA: 6, // G
    DIA_DESCANSO: 7, // H
    APODO: 8, // I
    DNI: 9, // J
    ESTADO: 10, // K
    ESPECIALIDAD: 11, // L
    // 12: Valor.especialidad
    // ...
  };

  try {
    let filaAEditar = -1;
    let esEdicion = datos.id ? true : false;
    
    // Si es edición, buscamos la fila
    if (esEdicion) {
      const datosExistentes = obtenerDatosAgentePorId(datos.id);
      if (datosExistentes) {
        filaAEditar = datosExistentes.fila;
      } else {
        return { exito: false, mensaje: "Error: No se encontró el agente para editar." };
      }
    }
    
    // 1. Preparar la nueva fila de datos
    let nuevaFila = [];
    if (esEdicion) {
        // Para la edición, obtenemos la fila completa existente
        const data = sheet.getRange(filaAEditar, 1, 1, sheet.getLastColumn()).getValues()[0];
        nuevaFila = data;
    } else {
        // Para agregar, obtenemos una fila vacía y llenamos lo básico
        // Esta parte es crítica: debemos crear un array que cubra TODAS las columnas
        const ultimaFila = sheet.getLastRow();
        const siguienteFicha = ultimaFila > 0 ? sheet.getRange(ultimaFila, INDICES.FICHA + 1).getValue() + 1 : 1; 
        
        nuevaFila = new Array(sheet.getLastColumn()).fill('');
        nuevaFila[0] = new Date(); // Fecha Registro
        nuevaFila[INDICES.FICHA] = siguienteFicha; // Nuevo ID
        nuevaFila[INDICES.RELACION_LABORAL] = 'Agente dependiente'; // Default
        nuevaFila[INDICES.SALON] = 'Gloss Salon'; // Default
        datos.id = siguienteFicha; // Asignar el nuevo ID al objeto de respuesta
    }

    // 2. Insertar/Actualizar los datos del formulario
    nuevaFila[INDICES.NOMBRE_COMPLETO] = datos.nombreCompleto;
    nuevaFila[INDICES.DNI] = datos.dni;
    nuevaFila[INDICES.APODO] = datos.apodo;
    nuevaFila[INDICES.ESPECIALIDAD] = datos.especialidad;
    nuevaFila[INDICES.ESTADO] = datos.estado;
    nuevaFila[INDICES.DIA_DESCANSO] = datos.diadesc;
    
    // Las horas de entrada/salida vienen como string 'HH:MM'. Deben guardarse así o como Date.
    // Para simplicidad y consistencia, las guardaremos como string si la columna solo tiene la hora
    nuevaFila[INDICES.HR_ENTRADA] = datos.ingreso; 
    nuevaFila[INDICES.HR_SALIDA] = datos.salida; 
    
    // 3. Escribir en la hoja
    if (esEdicion) {
      sheet.getRange(filaAEditar, 1, 1, nuevaFila.length).setValues([nuevaFila]);
      return { exito: true, mensaje: `Agente Ficha ${datos.id} actualizado con éxito.` };
    } else {
      // Agregar nueva fila al final
      sheet.appendRow(nuevaFila);
      return { exito: true, mensaje: `Agente ${datos.nombreCompleto} agregado con ID Ficha ${datos.id}.` };
    }

  } catch (e) {
    Logger.log('Error al guardar/editar agente: ' + e);
    return { exito: false, mensaje: `Fallo en la operación: ${e.message}` };
  }
}

/**
 * Elimina un agente marcando la fila como eliminada (buena práctica)
 * o eliminando la fila directamente (más simple pero peligroso).
 * Para simplicidad, por ahora, eliminaremos la fila.
 * @param {string} agenteId - El ID de la Ficha.
 * @returns {Object} Resultado de la operación.
 */
function eliminarAgente(agenteId) {
  const sheet = RegistrosAdmin.getSheetByName("Agentes");
  
  try {
    const datosAgente = obtenerDatosAgentePorId(agenteId);
    if (!datosAgente) {
      return { exito: false, mensaje: "Error: Agente no encontrado para eliminar." };
    }

    // Eliminación directa de la fila
    sheet.deleteRow(datosAgente.fila);
    
    return { exito: true, mensaje: `Agente Ficha ${agenteId} eliminado con éxito.` };
    
  } catch (e) {
    Logger.log('Error al eliminar agente: ' + e);
    return { exito: false, mensaje: `Fallo al eliminar: ${e.message}` };
  }
}