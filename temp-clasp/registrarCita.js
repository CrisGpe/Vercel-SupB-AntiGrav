// La función principal que se llama desde tu interfaz de usuario/modal refactorizada para Supabase
function registrarCita(CitaForm) {
  try {
    const ahora = new Date();
    // Las citas en Supabase se registran en zona horaria America/Lima de forma relacional
    const timestampISO = ahora.toISOString();

    // Estructura relacional esperada por Supabase en registro_citas
    // UUID se genera automáticamente en Supabase, enviamos el payload limpio
    const payload = {
      fecha: CitaForm.fechaCita, // Formato 'yyyy-MM-dd' del input date
      hora: CitaForm.horaCita,   // Formato 'HH:mm' del input select
      cliente: CitaForm.nombreClienteOATC,
      tipo_cliente: 'Cita',
      agente: CitaForm.nombreAgenteOATC || null,
      servicio: CitaForm.tipoOATC
    };

    console.log("SERVER DEBUG: Registrando cita en Supabase:", JSON.stringify(payload));

    if (CitaForm.numFila && CitaForm.numFila !== "") {
      // ES UNA EDICIÓN (numFila contiene el id UUID de Supabase)
      const res = Supabase.update("registro_citas", payload, `id=eq.${CitaForm.numFila}`);
      console.log("SERVER DEBUG: Cita editada en Supabase:", JSON.stringify(res));
      return "Cita actualizada correctamente en la nube.";
    } else {
      // ES UNA CITA NUEVA
      const res = Supabase.insert("registro_citas", payload);
      console.log("SERVER DEBUG: Cita insertada en Supabase:", JSON.stringify(res));
      return "Cita agendada exitosamente en la nube.";
    }
  } catch(e) {
    console.error("SERVER DEBUG ERROR: Fallo al registrar cita en Supabase: " + e.message, e.stack);
    throw new Error("No se pudo registrar la cita en Supabase: " + e.message);
  }
}