function obtenerCitasRegistradasEnAdelante() {
  const libro = SpreadsheetApp.openById("1SXuedQigLxVUF2oxn65wEZ5-HnDDiVdy7lY7HaweVC4");
  const hojaCitas = libro.getSheetByName("Registro Citas"); 
  
  // --- DEBUG: IDENTIFICACIÓN DE COLUMNAS ---
  const encabezados = hojaCitas.getRange(1, 1, 1, 7).getValues()[0];
  console.log("DEBUG(Servidor): Encabezados detectados:", encabezados);
  // Se espera: [A:Timestamp, B:Fecha, C:Hora, D:Cliente, E:TipoCliente, F:Agente, G:Servicio]
  
  const hoySinHora = new Date();
  hoySinHora.setHours(0, 0, 0, 0); 

  const ultimaFilaGlobal = hojaCitas.getLastRow();
  if (ultimaFilaGlobal < 2) {
    console.log("DEBUG(Servidor): La hoja está vacía o solo tiene encabezados.");
    return [];
  }

  const datosCitas = hojaCitas.getRange(2, 1, ultimaFilaGlobal - 1, 7).getValues();
  const datosCitasDisplay = hojaCitas.getRange(2, 1, ultimaFilaGlobal - 1, 7).getDisplayValues();

  console.log("DEBUG(Servidor): Total filas leídas:", datosCitas.length);
  if (datosCitas.length > 0) {
    console.log("DEBUG(Servidor): Ejemplo Fila 2 (Valores Reales):", datosCitas[0]);
    console.log("DEBUG(Servidor): Ejemplo Fila 2 (Display Values):", datosCitasDisplay[0]);
  }

  // 1. Filtramos las citas que son de hoy en adelante
  const citasFiltradas = [];
  datosCitas.forEach((row, index) => {
    const fechaCitaValor = row[1]; // Se asume Columna B
    if (fechaCitaValor instanceof Date && !isNaN(fechaCitaValor)) {
      const fechaCopia = new Date(fechaCitaValor.getTime());
      fechaCopia.setHours(0, 0, 0, 0);
      
      if (fechaCopia >= hoySinHora) {
        citasFiltradas.push({
          numFila: index + 2,
          display: datosCitasDisplay[index]
        });
      }
    } else {
      // Log en caso de que la columna B no sea una fecha válida
      if(index === 0) console.warn(`DEBUG(Servidor): Fila ${index+2} no tiene fecha válida en Col B:`, fechaCitaValor);
    }
  });

  console.log("DEBUG(Servidor): Citas filtradas (Hoy+):", citasFiltradas.length);

  // 2. Formateamos para el modal [Fila, Hora, Cliente, Servicio, Agente, Fecha]
  const resultadoFinal = citasFiltradas.map(item => {
    return [
      item.numFila,        // [0] ID para acciones
      item.display[2],     // [1] Hora (Col C)
      item.display[3],     // [2] Cliente (Col D)
      item.display[6],     // [3] Servicio (Col G)
      item.display[5],     // [4] Agente (Col F)
      item.display[1]      // [5] Fecha (Col B)
    ];
  });

  if (resultadoFinal.length > 0) {
    console.log("DEBUG(Servidor): Ejemplo de datos enviados al Cliente:", resultadoFinal[0]);
  }

  return resultadoFinal;
}
function eliminarFilaCitaServidor(numFila) {
  const libro = SpreadsheetApp.openById("1SXuedQigLxVUF2oxn65wEZ5-HnDDiVdy7lY7HaweVC4");
  const hojaCitas = libro.getSheetByName("Registro Citas");
  
  // Seguridad: Verificar que la fila no sea la cabecera
  if (numFila >= 2) {
    hojaCitas.deleteRow(numFila);
    return true;
  }
  throw new Error("Fila inválida");
}
function migrarCitasDeHoy() {
  try {
    console.log("🚀 Iniciando migración de Citas desde Google Sheets...");
    const libro = SpreadsheetApp.openById("1SXuedQigLxVUF2oxn65wEZ5-HnDDiVdy7lY7HaweVC4");
    const hojaCitas = libro.getSheetByName("Registro Citas");
    if (!hojaCitas) throw new Error("Hoja 'Registro Citas' no encontrada.");

    const ultimaFila = hojaCitas.getLastRow();
    if (ultimaFila < 2) {
      console.log("No hay citas para migrar.");
      return "No hay citas para migrar.";
    }

    // Leemos todas las citas en el rango A:H
    const rawData = hojaCitas.getRange(1, 1, ultimaFila, 8).getValues();
    const headers = rawData[0];
    
    // Índices de columna basados en A-H
    const colFecha = 1; // B
    const colHora = 2;  // C
    const colCliente = 3; // D
    const colTipo = 4; // E
    const colAgente = 5; // F
    const colServicio = 6; // G
    const colEstado = 7; // H (8va columna)

    console.log("Cabeceras detectadas para migración de citas:", headers);

    let count = 0;

    for (let i = 1; i < rawData.length; i++) {
      const row = rawData[i];
      const numFila = i + 1;
      const estado = String(row[colEstado] || '').trim();

      // Filtrar solo las 'Pendiente'
      if (estado.toLowerCase() === 'pendiente') {
        const fechaVal = row[colFecha];
        let fechaISO = "";
        if (fechaVal instanceof Date) {
          fechaISO = Utilities.formatDate(fechaVal, "America/Lima", "yyyy-MM-dd");
        } else {
          fechaISO = String(fechaVal).trim();
        }

        const payload = {
          fecha: fechaISO,
          hora: String(row[colHora] || '').trim(),
          cliente: String(row[colCliente] || '').trim(),
          tipo_cliente: String(row[colTipo] || 'Cita').trim(),
          agente: String(row[colAgente] || '').trim() || null,
          servicio: String(row[colServicio] || '').trim(),
          estado: 'Pendiente'
        };

        console.log(`Migrando cita fila ${numFila}:`, payload);
        
        // Insertar en Supabase
        Supabase.insert("registro_citas", payload);

        // Marcar como 'Migrado' en la hoja de Google Sheets para evitar duplicados
        hojaCitas.getRange(numFila, colEstado + 1).setValue("Migrado");
        count++;
      }
    }

    console.log(`✅ ¡Migración de Citas completada! Se migraron ${count} citas.`);
    return `Se migraron ${count} citas correctamente a Supabase.`;
  } catch (e) {
    console.error("❌ Error en migrarCitasDeHoy: " + e.message);
    return "Error: " + e.message;
  }
}
/**
 * Obtiene los datos de una sola fila de cita para cargar en el formulario de edición
 */
function obtenerDatosCitaPorFila(numFila) {
  const libro = SpreadsheetApp.openById("1SXuedQigLxVUF2oxn65wEZ5-HnDDiVdy7lY7HaweVC4");
  const hojaCitas = libro.getSheetByName("Registro Citas");
  
  // Obtenemos los valores de la fila específica (A:G)
  // Nota: Usamos getValues() para la lógica y getDisplayValues() para los strings
  const filaData = hojaCitas.getRange(numFila, 1, 1, 7).getValues()[0];
  const filaDisplay = hojaCitas.getRange(numFila, 1, 1, 7).getDisplayValues()[0];

  // Convertimos la fecha (B) al formato 'yyyy-MM-dd' que requiere el input type="date"
  let fechaISO = "";
  if (filaData[1] instanceof Date) {
    fechaISO = filaData[1].toISOString().split('T')[0];
  }

  // Convertimos la hora (C) al formato 'HH:mm' que requiere tu select/input
  // Como tu select usa valores tipo "07:15", intentamos extraerlo del display value
  let hora24h = "";
  const horaStr = filaDisplay[2]; // Ej: "10:30 AM"
  if (horaStr) {
    const [time, modifier] = horaStr.split(' ');
    let [hours, minutes] = time.split(':');
    if (hours === '12') hours = '00';
    if (modifier === 'PM' || modifier === 'pm') hours = parseInt(hours, 10) + 12;
    hora24h = `${String(hours).padStart(2, '0')}:${minutes}`;
  }

  return {
    fecha: fechaISO,
    hora: hora24h,
    cliente: filaDisplay[3],
    agente: filaDisplay[5],
    servicio: filaDisplay[6]
  };
}