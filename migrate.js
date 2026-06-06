/**
 * 🚀 Migrador ETL para Antigravity & Supabase
 * Lee los datos de las hojas de Google Sheets históricas y los inserta de manera estructurada en Supabase.
 */

const CONFIG_MIGRACION = {
  LIBRO_ID: "1SXuedQigLxVUF2oxn65wEZ5-HnDDiVdy7lY7HaweVC4", // ID centralizado de tus datos
};

function migrarAgentesASupabase() {
  try {
    console.log("🚀 Iniciando migración de Agentes...");
    const libro = SpreadsheetApp.openById(CONFIG_MIGRACION.LIBRO_ID);
    const hojaAgentes = libro.getSheetByName("Agentes");
    if (!hojaAgentes) throw new Error("Hoja 'Agentes' no encontrada.");

    const rawData = hojaAgentes.getDataRange().getValues();
    const headers = rawData.shift(); // Quitar cabecera

    const mapaFichas = {};
    const agentesParaInsertar = rawData.map((row, index) => {
      const nombre = String(row[2]).trim();
      if (!nombre) return null;

      // Parsear fecha de nacimiento si existe (Columna Q -> Índice 16)
      let fechaNac = null;
      if (row[16] instanceof Date) {
        fechaNac = Utilities.formatDate(row[16], "America/Lima", "yyyy-MM-dd");
      } else if (row[16]) {
        const str = String(row[16]).trim();
        const partes = str.split('/');
        if (partes.length === 3) {
          fechaNac = `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
        }
      }

      const fichaId = parseInt(row[1]) || (index + 1);
      if (mapaFichas[fichaId]) {
        console.warn(`⚠️ Saltando ficha_id duplicado en planilla: ${fichaId}`);
        return null;
      }
      mapaFichas[fichaId] = true;

      // Mapear con la estructura exacta de public.agentes
      return {
        ficha_id: fichaId,
        nombre_completo: nombre,
        relacion_laboral: String(row[3] || 'Agente dependiente').trim(),
        salon: String(row[4] || 'Gloss Salon').trim(),
        hr_entrada: row[5] instanceof Date ? Utilities.formatDate(row[5], "America/Lima", "hh:mm a") : String(row[5] || '').trim(),
        hr_salida: row[6] instanceof Date ? Utilities.formatDate(row[6], "America/Lima", "hh:mm a") : String(row[6] || '').trim(),
        dia_descanso: String(row[7] || '').trim(),
        apodo: String(row[8] || row[13] || '').trim(), // Combina apodo y nickname
        dni: String(row[9] || '').trim() || null,
        estado: String(row[10] || 'Activo').trim() === 'Activo' ? 'Activo' : 'Inactivo',
        especialidad: String(row[11] || 'General').trim(),
        celular: String(row[14] || '').trim(),
        genero: String(row[15] || '').trim(),
        fecha_nacimiento: fechaNac
      };
    }).filter(Boolean);

    console.log(`📊 Total agentes procesados para migrar: ${agentesParaInsertar.length}`);

    // Insertar/actualizar en Supabase para evitar errores de clave duplicada
    const respuesta = Supabase.upsert("agentes", agentesParaInsertar, "ficha_id");
    console.log("✅ ¡Migración de Agentes completada con éxito!");
    return `Insertados/Actualizados ${agentesParaInsertar.length} agentes con éxito.`;
  } catch (e) {
    console.error("❌ Error en migrarAgentesASupabase: " + e.message);
    return "Error: " + e.message;
  }
}

function migrarClientesASupabase() {
  try {
    console.log("🚀 Iniciando migración de Clientes...");
    const libro = SpreadsheetApp.openById(CONFIG_MIGRACION.LIBRO_ID);
    const hojaClientes = libro.getSheetByName("Clientes");
    if (!hojaClientes) throw new Error("Hoja 'Clientes' no encontrada.");

    const rawData = hojaClientes.getDataRange().getValues();
    rawData.shift(); // Quitar cabecera

    const mapaDNIs = {};
    const clientesParaInsertar = rawData.map(row => {
      const nombre = String(row[1]).trim();
      const apellido = String(row[2]).trim();
      const dni = String(row[3]).trim();

      if (!nombre || !dni) return null; // Saltar registros inválidos

      // Parsear fecha de nacimiento si existe (Columna H -> Índice 7)
      let fechaNac = null;
      if (row[7] instanceof Date) {
        fechaNac = Utilities.formatDate(row[7], "America/Lima", "yyyy-MM-dd");
      }

      return {
        nombre: nombre,
        apellido: apellido,
        dni: dni,
        email: String(row[4] || '').trim() || null,
        celular: String(row[5] || '').trim() || null,
        fecha_nacimiento: fechaNac
      };
    }).filter(c => {
      if (!c) return false;
      if (mapaDNIs[c.dni]) {
        console.log(`⚠️ Saltando DNI duplicado en planilla: ${c.dni} (${c.nombre} ${c.apellido})`);
        return false;
      }
      mapaDNIs[c.dni] = true;
      return true;
    });

    console.log(`📊 Total clientes procesados para migrar (únicos): ${clientesParaInsertar.length}`);

    // Subir en lotes de 100 con upsert para evitar errores de clave duplicada
    const tamañoLote = 100;
    let lotesEnviados = 0;

    for (let i = 0; i < clientesParaInsertar.length; i += tamañoLote) {
      const lote = clientesParaInsertar.slice(i, i + tamañoLote);
      Supabase.upsert("clientes", lote, "dni");
      lotesEnviados += lote.length;
      console.log(`✈️ Lote enviado: ${lotesEnviados}/${clientesParaInsertar.length} clientes.`);
    }

    console.log("✅ ¡Migración de Clientes completada con éxito!");
    return `Insertados/Actualizados ${clientesParaInsertar.length} clientes con éxito en Supabase.`;
  } catch (e) {
    console.error("❌ Error en migrarClientesASupabase: " + e.message);
    return "Error: " + e.message;
  }
}

function migrarOATCASupabase() {
  try {
    console.log("🚀 Iniciando migración de OATCs...");
    const libro = SpreadsheetApp.openById(CONFIG_MIGRACION.LIBRO_ID);
    const hojaOATC = libro.getSheetByName("OATC");
    if (!hojaOATC) throw new Error("Hoja 'OATC' no encontrada.");

    const rawData = hojaOATC.getDataRange().getValues();
    rawData.shift(); // Quitar cabecera

    console.log("📡 Cargando Catálogo de Clientes y Agentes desde Supabase...");
    
    // 1. Cargar Clientes
    const clientesDb = Supabase.select("clientes", "select=id,nombre,apellido,dni") || [];
    const mapClientesPorDni = {};
    const mapClientesPorNombre = {};
    
    clientesDb.forEach(c => {
      const dni = String(c.dni || '').trim();
      if (dni) mapClientesPorDni[dni] = c.id;
      
      const nomCompleto = `${c.nombre || ''} ${c.apellido || ''}`.trim().toLowerCase();
      if (nomCompleto) mapClientesPorNombre[nomCompleto] = c.id;
    });

    // Helper para obtener o crear cliente genérico/específico
    const obtenerOCrearClienteMigracion = (infoCliente, demanda) => {
      const infoLimpia = String(infoCliente || '').trim();
      const demandaLimpia = String(demanda || '').trim().toLowerCase();

      // Caso POR ASIGNAR o Vacío
      if (!infoLimpia || infoLimpia === "POR ASIGNAR") {
        const dniAsignar = "00000000";
        if (mapClientesPorDni[dniAsignar]) return mapClientesPorDni[dniAsignar];
        const res = Supabase.insert("clientes", { nombre: "POR", apellido: "ASIGNAR", dni: dniAsignar });
        if (res && res.length > 0) {
          mapClientesPorDni[dniAsignar] = res[0].id;
          return res[0].id;
        }
        return null;
      }

      // Intentar extraer DNI
      let dniExtraido = "";
      if (infoLimpia.includes(" | DNI:")) {
        const parts = infoLimpia.split(" | DNI:");
        const dniPart = parts[1].split(" | CEL:")[0].trim();
        dniExtraido = dniPart;
      } else {
        const matchDNI = infoLimpia.match(/DNI:(\d+)/);
        if (matchDNI) dniExtraido = matchDNI[1];
      }

      if (dniExtraido && mapClientesPorDni[dniExtraido]) {
        return mapClientesPorDni[dniExtraido];
      }

      // Intentar por Nombre Completo
      let nombreParaBuscar = infoLimpia;
      if (infoLimpia.includes(" | DNI:")) {
        nombreParaBuscar = infoLimpia.split(" | DNI:")[0].trim();
      }
      const nombreParaBuscarLC = nombreParaBuscar.toLowerCase();
      if (mapClientesPorNombre[nombreParaBuscarLC]) {
        return mapClientesPorNombre[nombreParaBuscarLC];
      }

      // Si no existe, crear cliente genérico según la Demanda (con DNI de 8 dígitos relleno de ceros)
      let dniGenerico = "00000000";
      let nomGenerico = "POR";
      let apeGenerico = "ASIGNAR";

      if (demandaLimpia === "cliente") {
        dniGenerico = "00000001";
        nomGenerico = "CLIENTE";
        apeGenerico = "GENERICO";
      } else if (demandaLimpia === "turno") {
        dniGenerico = "00000002";
        nomGenerico = "TURNO";
        apeGenerico = "GENERICO";
      } else if (demandaLimpia && demandaLimpia !== "por asignar") {
        dniGenerico = "00000003";
        nomGenerico = "DEMANDA";
        apeGenerico = "GENERICO";
      }

      if (mapClientesPorDni[dniGenerico]) {
        return mapClientesPorDni[dniGenerico];
      }

      console.log(`👤 Creando cliente genérico para demanda '${demandaLimpia}' con DNI ${dniGenerico}`);
      const nuevoCliente = {
        nombre: nomGenerico,
        apellido: apeGenerico,
        dni: dniGenerico
      };
      
      const res = Supabase.insert("clientes", nuevoCliente);
      if (res && res.length > 0) {
        mapClientesPorDni[dniGenerico] = res[0].id;
        mapClientesPorNombre[`${nomGenerico} ${apeGenerico}`.trim().toLowerCase()] = res[0].id;
        return res[0].id;
      }
      return null;
    };

    // 2. Cargar Agentes
    const agentesDb = Supabase.select("agentes", "select=id,nombre_completo,apodo") || [];
    const mapAgentes = {};
    agentesDb.forEach(a => {
      const apodo = String(a.apodo || '').trim().toLowerCase();
      const nombre = String(a.nombre_completo || '').trim().toLowerCase();
      if (apodo) mapAgentes[apodo] = a.id;
      if (nombre) mapAgentes[nombre] = a.id;
    });

    const obtenerAgenteIdMigracion = (nombreAgente) => {
      if (!nombreAgente) return null;
      const nombreLimpio = String(nombreAgente).trim().toLowerCase();
      return mapAgentes[nombreLimpio] || null;
    };

    const contadorDiario = {};

    // 3. Mapear datos a OATC y Citas no concretadas
    const oatcParaInsertar = [];
    const citasParaInsertar = [];

    rawData.forEach((row, index) => {
      const colBStr = String(row[1] || '').trim();
      const esRegistroCitaNoConcretada = /^cita/i.test(colBStr);

      const horaRegistro = String(row[0] || '').trim().substring(0, 45);
      const tipoOatc = String(row[2] || 'General').trim().substring(0, 95);
      
      // Validar y parsear fecha
      let fechaStr = "";
      if (row[3] instanceof Date) {
        fechaStr = Utilities.formatDate(row[3], "America/Lima", "yyyy-MM-dd");
      } else if (row[3]) {
        fechaStr = String(row[3]).trim();
      }
      if (!fechaStr) {
        fechaStr = Utilities.formatDate(new Date(), "America/Lima", "yyyy-MM-dd");
      }

      const clienteText = String(row[4] || '').trim();
      const agenteText = String(row[6] || '').trim();
      const comentario = String(row[10] || '').trim() || null;

      if (esRegistroCitaNoConcretada) {
        // Extraer la hora de la Col B si es posible, de lo contrario usar Col A
        let horaCita = horaRegistro;
        const matchHora = colBStr.match(/cita\s+(.+)$/i);
        if (matchHora) {
          horaCita = matchHora[1].trim();
        }
        
        // Determinar estado: si hay comentario de cancelación o es cancelado
        let estadoCita = "No asistió";
        if (comentario && (comentario.toLowerCase().includes("cancel") || comentario.toLowerCase().includes("anul"))) {
          estadoCita = "Cancelada";
        }

        const clienteId = obtenerOCrearClienteMigracion(clienteText, "cliente");
        const agenteId = obtenerAgenteIdMigracion(agenteText);

        citasParaInsertar.push({
          fecha: fechaStr,
          hora: horaCita,
          cliente: clienteText,
          cliente_id: clienteId,
          tipo_cliente: "Cita",
          agente: agenteText || null,
          agente_id: agenteId || null,
          servicio: tipoOatc,
          estado: estadoCita
        });
        return; // Omitir esta fila para la tabla OATC
      }

      // Proceso normal de OATC
      let rawDemanda = String(row[5] || 'cliente').trim().toLowerCase();
      // Eliminar acentos
      rawDemanda = rawDemanda.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      
      let demandaText = 'cliente'; // Default
      if (['cliente', 'turno', 'promocion', 'correccion'].includes(rawDemanda)) {
        demandaText = rawDemanda;
      } else {
        if (rawDemanda.includes('promocion')) demandaText = 'promocion';
        else if (rawDemanda.includes('correccion')) demandaText = 'correccion';
        else if (rawDemanda.includes('turno')) demandaText = 'turno';
        else demandaText = 'cliente';
      }

      const clienteId = obtenerOCrearClienteMigracion(clienteText, demandaText);
      const agenteId = obtenerAgenteIdMigracion(agenteText);

      const horaResuelto = row[7] ? String(row[7]).trim().substring(0, 45) : null;
      const inicioEspera = row[8] ? String(row[8]).trim().substring(0, 45) : null;
      const tiempoEspera = row[9] ? String(row[9]).trim().substring(0, 45) : null;
      
      if (!contadorDiario[fechaStr]) {
        contadorDiario[fechaStr] = 1;
      } else {
        contadorDiario[fechaStr]++;
      }
      const correlativo = contadorDiario[fechaStr];

      if (!tipoOatc) return;

      oatcParaInsertar.push({
        hora_registro: horaRegistro || "12:00 PM",
        tipo_oatc: tipoOatc,
        fecha: fechaStr,
        cliente_id: clienteId,
        categoria_demanda: demandaText,
        agente_id: agenteId,
        hora_resuelto: horaResuelto,
        inicio_espera: inicioEspera,
        tiempo_espera: tiempoEspera,
        comentario_cancelacion: comentario,
        correlativo: correlativo
      });
    });

    console.log(`📊 Total OATCs procesadas para migrar: ${oatcParaInsertar.length}`);
    console.log(`📊 Total citas no concretadas extraídas para migrar: ${citasParaInsertar.length}`);

    // 4. Subir OATCs en lotes de 100
    const tamañoLote = 100;
    let lotesEnviadosOatc = 0;
    for (let i = 0; i < oatcParaInsertar.length; i += tamañoLote) {
      const lote = oatcParaInsertar.slice(i, i + tamañoLote);
      Supabase.insert("oatc", lote);
      lotesEnviadosOatc += lote.length;
      console.log(`✈️ Lote OATC enviado: ${lotesEnviadosOatc}/${oatcParaInsertar.length} registros.`);
    }

    // 5. Subir Citas no concretadas en lotes de 100
    let lotesEnviadosCitas = 0;
    for (let i = 0; i < citasParaInsertar.length; i += tamañoLote) {
      const lote = citasParaInsertar.slice(i, i + tamañoLote);
      Supabase.insert("registro_citas", lote);
      lotesEnviadosCitas += lote.length;
      console.log(`✈️ Lote Citas no concretadas enviado: ${lotesEnviadosCitas}/${citasParaInsertar.length} registros.`);
    }

    console.log("✅ ¡Migración de OATC y Citas no concretadas completada con éxito!");
    return `Insertados ${oatcParaInsertar.length} registros en oatc y ${citasParaInsertar.length} citas no concretadas en registro_citas de Supabase.`;
  } catch (e) {
    console.error("❌ Error en migrarOATCASupabase: " + e.message);
    return "Error: " + e.message;
  }
}

function migrarAsistenciaASupabase() {
  try {
    console.log("🚀 Iniciando migración de Asistencias...");
    const libro = SpreadsheetApp.openById(CONFIG_MIGRACION.LIBRO_ID);
    const hojaAsistencia = libro.getSheetByName("Asistencia");
    if (!hojaAsistencia) throw new Error("Hoja 'Asistencia' no encontrada.");

    const rawData = hojaAsistencia.getDataRange().getValues();
    rawData.shift(); // Quitar cabecera

    console.log("📡 Cargando Catálogo de Agentes desde Supabase...");
    const agentesDb = Supabase.select("agentes", "select=id,nombre_completo,apodo") || [];
    const mapAgentes = {};
    agentesDb.forEach(a => {
      const apodo = String(a.apodo || '').trim().toLowerCase();
      const nombre = String(a.nombre_completo || '').trim().toLowerCase();
      if (apodo) mapAgentes[apodo] = a.id;
      if (nombre) mapAgentes[nombre] = a.id;
    });

    const obtenerOCrearAgenteMigracion = (nombreAgente) => {
      if (!nombreAgente) return null;
      const nombreLimpio = String(nombreAgente).trim();
      let nombreLC = nombreLimpio.toLowerCase();

      // Mapeo manual de Eualali a Eualalia
      if (nombreLC.includes("eualali")) {
        nombreLC = "eualalia chipana buitron";
      }

      // Buscar en el caché existente
      if (mapAgentes[nombreLC]) {
        return mapAgentes[nombreLC];
      }

      // Si no existe, crearlo como Inactivo para conservar la historia
      console.log(`👤 Creando agente histórico inactivo para: '${nombreLimpio}'`);
      const nuevoAgente = {
        nombre_completo: nombreLimpio === "NACZ" ? "NACZ HISTORICO" : nombreLimpio + " (Histórico)",
        apodo: nombreLimpio.toUpperCase(),
        estado: "Inactivo",
        especialidad: "General"
      };

      const res = Supabase.insert("agentes", nuevoAgente);
      if (res && res.length > 0) {
        const nuevoId = res[0].id;
        mapAgentes[nombreLC] = nuevoId;
        mapAgentes[nombreLimpio.toLowerCase()] = nuevoId;
        mapAgentes[nuevoAgente.nombre_completo.toLowerCase()] = nuevoId;
        mapAgentes[nuevoAgente.apodo.toLowerCase()] = nuevoId;
        return nuevoId;
      }
      return null;
    };

    const asistenciaParaInsertar = rawData.map((row, index) => {
      // Validar y parsear fecha
      let fechaStr = "";
      if (row[0] instanceof Date) {
        fechaStr = Utilities.formatDate(row[0], "America/Lima", "yyyy-MM-dd");
      } else if (row[0]) {
        fechaStr = String(row[0]).trim();
      }
      if (!fechaStr) return null; // No migrar si no hay fecha

      const agenteText = String(row[1] || '').trim();
      const agenteId = obtenerOCrearAgenteMigracion(agenteText);

      if (!agenteId) {
        console.warn(`⚠️ Agente '${agenteText}' no pudo ser resuelto en fila ${index + 2}. Se omite el registro.`);
        return null;
      }

      // Validar y formatear horas
      const formatearHora = (val) => {
        if (!val) return null;
        if (val instanceof Date) {
          return Utilities.formatDate(val, "America/Lima", "hh:mm a");
        }
        const strVal = String(val).trim();
        return strVal ? strVal.substring(0, 45) : null;
      };

      const entrada = formatearHora(row[2]);
      const refInicio = formatearHora(row[3]);
      const refTermino = formatearHora(row[4]);
      const salida = formatearHora(row[5]);
      
      let estado = salida ? 'Ausente' : 'Disponible';

      return {
        fecha: fechaStr,
        agente_id: agenteId,
        entrada: entrada,
        ref_inicio: refInicio,
        ref_termino: refTermino,
        salida: salida,
        estado_texto: estado,
        ultima_act: new Date().toISOString()
      };
    }).filter(Boolean);

    console.log(`📊 Total asistencias procesadas para migrar: ${asistenciaParaInsertar.length}`);

    // Subir en lotes de 100
    const tamañoLote = 100;
    let lotesEnviados = 0;

    for (let i = 0; i < asistenciaParaInsertar.length; i += tamañoLote) {
      const lote = asistenciaParaInsertar.slice(i, i + tamañoLote);
      Supabase.insert("control_asistencia", lote);
      lotesEnviados += lote.length;
      console.log(`✈️ Lote Asistencia enviado: ${lotesEnviados}/${asistenciaParaInsertar.length} registros.`);
    }

    console.log("✅ ¡Migración de Asistencias completada con éxito!");
    return `Insertados ${asistenciaParaInsertar.length} registros en la tabla control_asistencia de Supabase.`;
  } catch (e) {
    console.error("❌ Error en migrarAsistenciaASupabase: " + e.message);
    return "Error: " + e.message;
  }
}

function debugLeerAsistencia() {
  try {
    const libro = SpreadsheetApp.openById(CONFIG_MIGRACION.LIBRO_ID);
    const hojaAsistencia = libro.getSheetByName("Asistencia");
    if (!hojaAsistencia) {
      console.log("Hoja 'Asistencia' no encontrada.");
      return "Hoja Asistencia no encontrada";
    }
    const rawData = hojaAsistencia.getRange(1, 1, 5, hojaAsistencia.getLastColumn()).getValues();
    const result = JSON.stringify(rawData, null, 2);
    console.log("Cabeceras y primeros registros de Asistencia:\n" + result);
    return result;
  } catch (e) {
    console.error("Error al leer Asistencia: " + e.message);
    return "Error: " + e.message;
  }
}

function debugLeerOATC() {
  try {
    const libro = SpreadsheetApp.openById(CONFIG_MIGRACION.LIBRO_ID);
    const hojaOATC = libro.getSheetByName("OATC");
    if (!hojaOATC) {
      console.log("Hoja 'OATC' no encontrada.");
      return "Hoja OATC no encontrada";
    }
    const rawData = hojaOATC.getRange(1, 1, 5, hojaOATC.getLastColumn()).getValues();
    const result = JSON.stringify(rawData, null, 2);
    console.log("Cabeceras y primeros registros de OATC:\n" + result);
    return result;
  } catch (e) {
    console.error("Error al leer OATC: " + e.message);
    return "Error: " + e.message;
  }
}

function buscarAgenteNACZ() {
  try {
    const libro = SpreadsheetApp.openById(CONFIG_MIGRACION.LIBRO_ID);
    const sheet = libro.getSheetByName("Agentes");
    if (!sheet) return "Sheet Agentes not found";
    const data = sheet.getDataRange().getValues();
    let result = [];
    data.forEach((row, i) => {
      const rowStr = JSON.stringify(row);
      if (rowStr.toUpperCase().includes("NACZ")) {
        result.push("Fila " + (i + 1) + ": " + rowStr);
      }
    });
    console.log("NACZ search result: " + JSON.stringify(result));
    return JSON.stringify(result);
  } catch(e) {
    return "Error: " + e.message;
  }
}

function migrarCampTratamientosASupabase() {
  try {
    console.log("🚀 Iniciando migración de CampTratamientos...");
    const libro = SpreadsheetApp.openById(CONFIG_MIGRACION.LIBRO_ID);
    const hojaCamp = libro.getSheetByName("CampTratamientos");
    if (!hojaCamp) throw new Error("Hoja 'CampTratamientos' no encontrada.");

    const rawData = hojaCamp.getDataRange().getValues();
    rawData.shift(); // Quitar cabecera

    console.log("📡 Cargando Catálogo de Clientes desde Supabase...");
    const clientesDb = Supabase.select("clientes", "select=id,dni") || [];
    const mapClientesPorDni = {};
    clientesDb.forEach(c => {
      const dni = String(c.dni || '').trim();
      if (dni) mapClientesPorDni[dni] = c.id;
    });

    const listParaInsertar = rawData.map((row, index) => {
      const dni = String(row[1]).trim();
      if (!dni) return null;

      const clienteId = mapClientesPorDni[dni];
      if (!clienteId) {
        console.warn(`⚠️ Cliente DNI '${dni}' no encontrado en Supabase para fila ${index + 2}. Se omite.`);
        return null;
      }

      // Validar y parsear fecha registro
      let fechaReg = new Date().toISOString();
      if (row[0] instanceof Date) {
        fechaReg = row[0].toISOString();
      }

      // Validar y parsear fecha oatc original
      let fechaOatcStr = "";
      if (row[3] instanceof Date) {
        fechaOatcStr = Utilities.formatDate(row[3], "America/Lima", "yyyy-MM-dd");
      } else if (row[3]) {
        fechaOatcStr = String(row[3]).trim();
      }
      if (!fechaOatcStr) {
        fechaOatcStr = Utilities.formatDate(new Date(), "America/Lima", "yyyy-MM-dd");
      }

      const servicio = String(row[4] || 'General').trim();
      const campana = String(row[5] || 'Células Madre').trim();

      return {
        fecha_registro: fechaReg,
        cliente_id: clienteId,
        fecha_oatc_original: fechaOatcStr,
        servicio_origen: servicio,
        campana_asignada: campana
      };
    }).filter(Boolean);

    console.log(`📊 Total tratamientos procesados para migrar: ${listParaInsertar.length}`);

    // Subir en lotes de 100
    const tamañoLote = 100;
    let lotesEnviados = 0;

    for (let i = 0; i < listParaInsertar.length; i += tamañoLote) {
      const lote = listParaInsertar.slice(i, i + tamañoLote);
      Supabase.insert("camp_tratamientos", lote);
      lotesEnviados += lote.length;
      console.log(`✈️ Lote CampTratamientos enviado: ${lotesEnviados}/${listParaInsertar.length} registros.`);
    }

    console.log("✅ ¡Migración de CampTratamientos completada con éxito!");
    return `Insertados ${listParaInsertar.length} registros en la tabla camp_tratamientos de Supabase.`;
  } catch (e) {
    console.error("❌ Error en migrarCampTratamientosASupabase: " + e.message);
    return "Error: " + e.message;
  }
}

function migrarCitasCompletoASupabase() {
  try {
    console.log("🚀 Iniciando migración completa de Citas a Supabase...");
    const libro = SpreadsheetApp.openById(CONFIG_MIGRACION.LIBRO_ID);
    const hojaCitas = libro.getSheetByName("Registro Citas");
    if (!hojaCitas) throw new Error("Hoja 'Registro Citas' no encontrada.");

    const rawData = hojaCitas.getDataRange().getValues();
    rawData.shift(); // Quitar cabecera

    console.log("📡 Cargando Catálogo de Clientes y Agentes desde Supabase...");
    const clientesDb = Supabase.select("clientes", "select=id,nombre,apellido,dni") || [];
    const mapClientesPorNombre = {};
    clientesDb.forEach(c => {
      const nomCompleto = `${c.nombre || ''} ${c.apellido || ''}`.trim().toLowerCase();
      if (nomCompleto) mapClientesPorNombre[nomCompleto] = c.id;
    });

    const obtenerOCrearClienteIdLocal = (nombreCompleto) => {
      const infoLimpia = String(nombreCompleto || '').trim();
      if (!infoLimpia) return null;
      const lc = infoLimpia.toLowerCase();
      if (mapClientesPorNombre[lc]) return mapClientesPorNombre[lc];

      // Si no existe, crearlo
      const partes = infoLimpia.split(' ');
      const nom = partes[0] || 'Cliente';
      const ape = partes.slice(1).join(' ') || 'Genérico';
      const dniTemp = "CITA_" + Math.floor(Math.random() * 10000000);
      const res = Supabase.insert("clientes", { nombre: nom, apellido: ape, dni: dniTemp });
      if (res && res.length > 0) {
        mapClientesPorNombre[lc] = res[0].id;
        return res[0].id;
      }
      return null;
    };

    const agentesDb = Supabase.select("agentes", "select=id,nombre_completo,apodo") || [];
    const mapAgentes = {};
    agentesDb.forEach(a => {
      const apodo = String(a.apodo || '').trim().toLowerCase();
      const nombre = String(a.nombre_completo || '').trim().toLowerCase();
      if (apodo) mapAgentes[apodo] = a.id;
      if (nombre) mapAgentes[nombre] = a.id;
    });

    const citasParaInsertar = rawData.map((row, index) => {
      const cliente = String(row[3] || '').trim();
      if (!cliente) return null;

      let fechaISO = "";
      if (row[1] instanceof Date) {
        fechaISO = Utilities.formatDate(row[1], "America/Lima", "yyyy-MM-dd");
      } else if (row[1]) {
        fechaISO = String(row[1]).trim();
      }

      const agente = String(row[5] || '').trim();
      const clienteId = obtenerOCrearClienteIdLocal(cliente);
      const agenteId = mapAgentes[agente.toLowerCase()] || null;

      return {
        fecha: fechaISO,
        hora: String(row[2] || '').trim(),
        cliente: cliente,
        cliente_id: clienteId,
        tipo_cliente: String(row[4] || 'Cita').trim(),
        agente: agente || null,
        agente_id: agenteId,
        servicio: String(row[6] || '').trim(),
        estado: String(row[7] || 'Pendiente').trim()
      };
    }).filter(Boolean);

    console.log(`📊 Total citas procesadas para migrar: ${citasParaInsertar.length}`);

    // Subir en bloques
    const tamañoLote = 100;
    let lotesEnviados = 0;
    for (let i = 0; i < citasParaInsertar.length; i += tamañoLote) {
      const lote = citasParaInsertar.slice(i, i + tamañoLote);
      Supabase.insert("registro_citas", lote);
      lotesEnviados += lote.length;
      console.log(`✈️ Lote Citas enviado: ${lotesEnviados}/${citasParaInsertar.length} registros.`);
    }

    console.log("✅ ¡Migración de Registro Citas completada con éxito!");
    return `Insertados ${citasParaInsertar.length} registros en la tabla registro_citas de Supabase.`;
  } catch (e) {
    console.error("❌ Error en migrarCitasCompletoASupabase: " + e.message);
    return "Error: " + e.message;
  }
}

function migrarAgendaEventosASupabase() {
  try {
    console.log("🚀 Iniciando migración de Agenda_Eventos a Supabase...");
    const libro = SpreadsheetApp.getActiveSpreadsheet();
    const hojaAgenda = libro.getSheetByName("Agenda_Eventos");
    if (!hojaAgenda) throw new Error("Hoja 'Agenda_Eventos' no encontrada.");

    const rawData = hojaAgenda.getDataRange().getValues();
    rawData.shift(); // Quitar cabecera

    const eventosParaInsertar = rawData.map((row, index) => {
      const id = String(row[0] || '').trim();
      if (!id) return null;

      let fechaISO = "";
      if (row[1] instanceof Date) {
        fechaISO = Utilities.formatDate(row[1], "America/Lima", "yyyy-MM-dd");
      } else if (row[1]) {
        fechaISO = String(row[1]).trim();
      }

      return {
        id: id,
        fecha: fechaISO,
        tipo: String(row[2] || 'Tarea').trim(),
        descripcion: String(row[3] || '').trim(),
        estado: String(row[4] || 'Pendiente').trim(),
        prioridad: String(row[5] || 'Media').trim()
      };
    }).filter(Boolean);

    console.log(`📊 Total eventos procesados para migrar: ${eventosParaInsertar.length}`);

    // Subir en bloques
    const tamañoLote = 100;
    let lotesEnviados = 0;
    for (let i = 0; i < eventosParaInsertar.length; i += tamañoLote) {
      const lote = eventosParaInsertar.slice(i, i + tamañoLote);
      Supabase.insert("agenda_eventos", lote);
      lotesEnviados += lote.length;
      console.log(`✈️ Lote Agenda_Eventos enviado: ${lotesEnviados}/${eventosParaInsertar.length} registros.`);
    }

    console.log("✅ ¡Migración de Agenda_Eventos completada con éxito!");
    return `Insertados ${eventosParaInsertar.length} registros en la tabla agenda_eventos de Supabase.`;
  } catch (e) {
    console.error("❌ Error en migrarAgendaEventosASupabase: " + e.message);
    return "Error: " + e.message;
  }
}

function sincronizarOATCFaltantes() {
  try {
    console.log("🚀 Buscando la última OATC registrada en Supabase...");
    const latest = Supabase.select("oatc", "select=fecha&order=fecha.desc&limit=1") || [];
    const latestDateStr = latest.length > 0 ? latest[0].fecha : "1970-01-01";
    console.log(`📅 Última fecha registrada en Supabase para OATC: ${latestDateStr}`);

    const libro = SpreadsheetApp.openById(CONFIG_MIGRACION.LIBRO_ID);
    const hojaOATC = libro.getSheetByName("OATC");
    if (!hojaOATC) throw new Error("Hoja 'OATC' no encontrada.");

    const rawData = hojaOATC.getDataRange().getValues();
    rawData.shift(); // Quitar cabecera

    console.log("📡 Cargando Catálogo de Clientes y Agentes desde Supabase...");
    const clientesDb = Supabase.select("clientes", "select=id,nombre,apellido,dni") || [];
    const mapClientesPorDni = {};
    const mapClientesPorNombre = {};
    clientesDb.forEach(c => {
      const dni = String(c.dni || '').trim();
      if (dni) mapClientesPorDni[dni] = c.id;
      const nomCompleto = `${c.nombre || ''} ${c.apellido || ''}`.trim().toLowerCase();
      if (nomCompleto) mapClientesPorNombre[nomCompleto] = c.id;
    });

    const agentesDb = Supabase.select("agentes", "select=id,nombre_completo,apodo") || [];
    const mapAgentes = {};
    agentesDb.forEach(a => {
      const apodo = String(a.apodo || '').trim().toLowerCase();
      const nombre = String(a.nombre_completo || '').trim().toLowerCase();
      if (apodo) mapAgentes[apodo] = a.id;
      if (nombre) mapAgentes[nombre] = a.id;
    });

    const obtenerOCrearClienteMigracion = (infoCliente, demanda) => {
      const infoLimpia = String(infoCliente || '').trim();
      const demandaLimpia = String(demanda || '').trim().toLowerCase();
      if (!infoLimpia || infoLimpia === "POR ASIGNAR") {
        const dniAsignar = "00000000";
        if (mapClientesPorDni[dniAsignar]) return mapClientesPorDni[dniAsignar];
        const res = Supabase.insert("clientes", { nombre: "POR", apellido: "ASIGNAR", dni: dniAsignar });
        if (res && res.length > 0) {
          mapClientesPorDni[dniAsignar] = res[0].id;
          return res[0].id;
        }
        return null;
      }
      let dniExtraido = "";
      if (infoLimpia.includes(" | DNI:")) {
        dniExtraido = infoLimpia.split(" | DNI:")[1].split(" | CEL:")[0].trim();
      }
      if (dniExtraido && mapClientesPorDni[dniExtraido]) return mapClientesPorDni[dniExtraido];
      let nombreParaBuscar = infoLimpia.split(" | DNI:")[0].trim();
      if (mapClientesPorNombre[nombreParaBuscar.toLowerCase()]) return mapClientesPorNombre[nombreParaBuscar.toLowerCase()];
      
      const nuevo = { nombre: nombreParaBuscar.split(' ')[0] || "Cliente", apellido: nombreParaBuscar.split(' ').slice(1).join(' ') || "Nuevo", dni: dniExtraido || "TEMP_" + Math.floor(Math.random()*1000000) };
      const res = Supabase.insert("clientes", nuevo);
      if (res && res.length > 0) {
        mapClientesPorDni[nuevo.dni] = res[0].id;
        return res[0].id;
      }
      return null;
    };

    const contadorDiario = {};

    const oatcParaInsertar = [];
    rawData.forEach(row => {
      let fechaStr = "";
      if (row[3] instanceof Date) {
        fechaStr = Utilities.formatDate(row[3], "America/Lima", "yyyy-MM-dd");
      } else if (row[3]) {
        fechaStr = String(row[3]).trim();
      }

      if (fechaStr && fechaStr > latestDateStr) {
        const horaRegistro = String(row[0] || '').trim().substring(0, 45);
        const tipoOatc = String(row[2] || 'General').trim().substring(0, 95);
        const clienteText = String(row[4] || '').trim();
        let rawDemanda = String(row[5] || 'cliente').trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        let demandaText = ['cliente', 'turno', 'promocion', 'correccion'].includes(rawDemanda) ? rawDemanda : 'cliente';
        
        const agenteText = String(row[6] || '').trim();
        const clienteId = obtenerOCrearClienteMigracion(clienteText, demandaText);
        const agenteId = mapAgentes[agenteText.toLowerCase()] || null;

        const horaResuelto = row[7] ? String(row[7]).trim().substring(0, 45) : null;
        const inicioEspera = row[8] ? String(row[8]).trim().substring(0, 45) : null;
        const tiempoEspera = row[9] ? String(row[9]).trim().substring(0, 45) : null;
        const comentario = String(row[10] || '').trim() || null;

        if (!contadorDiario[fechaStr]) {
          contadorDiario[fechaStr] = 1;
        } else {
          contadorDiario[fechaStr]++;
        }

        oatcParaInsertar.push({
          hora_registro: horaRegistro || "12:00 PM",
          tipo_oatc: tipoOatc,
          fecha: fechaStr,
          cliente_id: clienteId,
          categoria_demanda: demandaText,
          agente_id: agenteId,
          hora_resuelto: horaResuelto,
          inicio_espera: inicioEspera,
          tiempo_espera: tiempoEspera,
          comentario_cancelacion: comentario,
          correlativo: contadorDiario[fechaStr]
        });
      }
    });

    console.log(`📊 Nuevos registros OATC encontrados para migrar: ${oatcParaInsertar.length}`);
    if (oatcParaInsertar.length === 0) return "No hay nuevas OATCs para migrar.";

    const tamañoLote = 100;
    let lotesEnviados = 0;
    for (let i = 0; i < oatcParaInsertar.length; i += tamañoLote) {
      const lote = oatcParaInsertar.slice(i, i + tamañoLote);
      Supabase.insert("oatc", lote);
      lotesEnviados += lote.length;
      console.log(`✈️ Lote OATC enviado: ${lotesEnviados}/${oatcParaInsertar.length} registros.`);
    }

    return `Sincronización exitosa: ${oatcParaInsertar.length} nuevas OATCs migradas.`;
  } catch (e) {
    console.error("❌ Error en sincronizarOATCFaltantes: " + e.message);
    return "Error: " + e.message;
  }
}

function sincronizarAsistenciaFaltante() {
  try {
    console.log("🚀 Buscando la última Asistencia registrada en Supabase...");
    const latest = Supabase.select("control_asistencia", "select=fecha&order=fecha.desc&limit=1") || [];
    const latestDateStr = latest.length > 0 ? latest[0].fecha : "1970-01-01";
    console.log(`📅 Última fecha registrada en Supabase para Asistencia: ${latestDateStr}`);

    const libro = SpreadsheetApp.openById(CONFIG_MIGRACION.LIBRO_ID);
    const hojaAsistencia = libro.getSheetByName("Asistencia");
    if (!hojaAsistencia) throw new Error("Hoja 'Asistencia' no encontrada.");

    const rawData = hojaAsistencia.getDataRange().getValues();
    rawData.shift(); // Quitar cabecera

    console.log("📡 Cargando Catálogo de Agentes desde Supabase...");
    const agentesDb = Supabase.select("agentes", "select=id,nombre_completo,apodo") || [];
    const mapAgentes = {};
    agentesDb.forEach(a => {
      const apodo = String(a.apodo || '').trim().toLowerCase();
      const nombre = String(a.nombre_completo || '').trim().toLowerCase();
      if (apodo) mapAgentes[apodo] = a.id;
      if (nombre) mapAgentes[nombre] = a.id;
    });

    const asistenciaParaInsertar = [];
    rawData.forEach(row => {
      let fechaStr = "";
      if (row[0] instanceof Date) {
        fechaStr = Utilities.formatDate(row[0], "America/Lima", "yyyy-MM-dd");
      } else if (row[0]) {
        fechaStr = String(row[0]).trim();
      }

      if (fechaStr && fechaStr > latestDateStr) {
        const agenteText = String(row[1] || '').trim().toLowerCase();
        const agenteId = mapAgentes[agenteText] || null;

        if (agenteId) {
          const formatearHora = (val) => {
            if (!val) return null;
            if (val instanceof Date) return Utilities.formatDate(val, "America/Lima", "hh:mm a");
            return String(val).trim().substring(0, 45);
          };

          asistenciaParaInsertar.push({
            fecha: fechaStr,
            agente_id: agenteId,
            entrada: formatearHora(row[2]),
            ref_inicio: formatearHora(row[3]),
            ref_termino: formatearHora(row[4]),
            salida: formatearHora(row[5]),
            estado_texto: row[5] ? 'Ausente' : 'Disponible',
            ultima_act: new Date().toISOString()
          });
        }
      }
    });

    console.log(`📊 Nuevos registros de Asistencia encontrados para migrar: ${asistenciaParaInsertar.length}`);
    if (asistenciaParaInsertar.length === 0) return "No hay nuevas asistencias para migrar.";

    const tamañoLote = 100;
    let lotesEnviados = 0;
    for (let i = 0; i < asistenciaParaInsertar.length; i += tamañoLote) {
      const lote = asistenciaParaInsertar.slice(i, i + tamañoLote);
      Supabase.insert("control_asistencia", lote);
      lotesEnviados += lote.length;
      console.log(`✈️ Lote Asistencia enviado: ${lotesEnviados}/${asistenciaParaInsertar.length} registros.`);
    }

    return `Sincronización exitosa: ${asistenciaParaInsertar.length} asistencias migradas.`;
  } catch (e) {
    console.error("❌ Error en sincronizarAsistenciaFaltante: " + e.message);
    return "Error: " + e.message;
  }
}