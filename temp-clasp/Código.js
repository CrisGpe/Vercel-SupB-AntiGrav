function doGet(e) {
  console.log("SERVER DEBUG: Iniciando enrutamiento de dashboards...");
  
  let page = 'recepcionDashboard';
  let title = 'Dashboard Recepción - Antigravity Salon';
  
  const param = e && e.parameter && e.parameter.p ? e.parameter.p.toLowerCase() : '';
  
  if (param === 'caja') {
    page = 'cajaDashboard';
    title = 'Dashboard Caja - Antigravity Salon';
  } else if (param === 'insumos') {
    page = 'despachoInsumos';
    title = 'Inventario & Despacho Insumos - Antigravity Salon';
  } else if (param === 'reportes') {
    page = 'reportesDashboard';
    title = 'Reportes & Estadísticas - Antigravity Salon';
  } else if (param === 'recepcion') {
    page = 'recepcionDashboard';
    title = 'Dashboard Recepción - Antigravity Salon';
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

function editarFilaSecreta(tabla, id, datos) {
  try {
    return Supabase.update(tabla, datos, `id=eq.${id}`);
  } catch(e) {
    throw new Error("Error al modificar fila: " + e.message);
  }
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
      // Nota: eliminado_por puede enlazarse al ID de sesión de ser requerido
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
RegistrosAdmin =  SpreadsheetApp.openById("1SXuedQigLxVUF2oxn65wEZ5-HnDDiVdy7lY7HaweVC4"); 
RegistrosRecepcion = SpreadsheetApp.openById("1SXuedQigLxVUF2oxn65wEZ5-HnDDiVdy7lY7HaweVC4");
