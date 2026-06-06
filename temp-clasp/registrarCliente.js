function registrarClienteEnHoja(datosCliente) {
  try {
    const payload = {
      nombre: datosCliente.nombre,
      apellido: datosCliente.apellido,
      dni: datosCliente.dni,
      cumpleanos: datosCliente.cumpleanos || null,
      celular: datosCliente.celular || null,
      email: datosCliente.correo || null
    };

    console.log("SERVER DEBUG: Registrando cliente en Supabase:", JSON.stringify(payload));
    const res = Supabase.insert("clientes", payload);
    console.log("SERVER DEBUG: Cliente registrado exitosamente en Supabase:", JSON.stringify(res));

    return `Cliente ${datosCliente.nombre} registrado exitosamente en la base de datos relacional.`;
  } catch(e) {
    console.error("SERVER DEBUG ERROR: Fallo al registrar cliente en Supabase: " + e.message, e.stack);
    throw new Error("No se pudo registrar al cliente en Supabase: " + e.message);
  }
}