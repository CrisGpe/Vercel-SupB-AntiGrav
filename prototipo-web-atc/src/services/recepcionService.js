import { supabase } from '@/lib/supabaseClient';

export const recepcionService = {
  fetchRecepcionData: async (startOfDay, endOfDay) => {
    const [
      { data: rawAgentesData, error: errAgentes }, 
      { data: asistData, error: errAsist }, 
      { data: oatcsData, error: errOatc },
      { data: clientesData, error: errClientes }
    ] = await Promise.all([
      supabase.from('agentes').select('*'),
      supabase.from('control_asistencia').select('*').gte('created_at', startOfDay).lte('created_at', endOfDay),
      supabase.from('oatc').select('*, agentes(nombre_completo, apodo, especialidad), clientes(nombre, apellido)').gte('creado_at', startOfDay).lte('creado_at', endOfDay).is('resuelto_at', null).order('correlativo', { ascending: false }),
      supabase.from('clientes').select('id, nombre, apellido, dni')
    ]);

    if (errAgentes || errAsist || errOatc || errClientes) {
      throw new Error("Hubo un error cargando datos de Supabase");
    }

    return { rawAgentesData, asistData, oatcsData, clientesData };
  },

  registrarIngreso: async (agenteId, nowIso) => {
    const { error } = await supabase.from('control_asistencia').insert({
      agente_id: agenteId, entrada_at: nowIso, estado_texto: 'Disponible', ultima_act: nowIso
    });
    if (error) throw error;
  },

  registrarSalida: async (asistenciaId, nowIso) => {
    const { error } = await supabase.from('control_asistencia').update({
      salida_at: nowIso, estado_texto: 'Ausente'
    }).eq('id', asistenciaId);
    if (error) throw error;
  },

  iniciarRefrigerio: async (asistenciaId, nowIso) => {
    const { error } = await supabase.from('control_asistencia').update({
      ref_inicio_at: nowIso, estado_texto: 'En refrigerio'
    }).eq('id', asistenciaId);
    if (error) throw error;
  },

  terminarRefrigerio: async (asistenciaId, nowIso) => {
    const { error } = await supabase.from('control_asistencia').update({
      ref_termino_at: nowIso, estado_texto: 'Disponible'
    }).eq('id', asistenciaId);
    if (error) throw error;
  },

  cambiarEstadoSimple: async (asistenciaId, nuevoEstado, nowIso) => {
    const { error } = await supabase.from('control_asistencia').update({
      estado_texto: nuevoEstado, ultima_act: nowIso
    }).eq('id', asistenciaId);
    if (error) throw error;
  },

  crearOatc: async (payload, asistenciaId, nuevoEstadoAgente, nowIso) => {
    const { error } = await supabase.from('oatc').insert(payload);
    if (error) throw error;
    
    if (asistenciaId && nuevoEstadoAgente) {
      await supabase.from('control_asistencia').update({ 
        estado_texto: nuevoEstadoAgente, ultima_act: nowIso 
      }).eq('id', asistenciaId);
    }
  },

  crearVentaProducto: async (payload) => {
    const { error } = await supabase.from('oatc').insert(payload);
    if (error) throw error;
  },

  resolverOatc: async (oatcId, asistenciaId, nowIso) => {
    const { error: oatcErr } = await supabase.from('oatc').update({ resuelto_at: nowIso }).eq('id', oatcId);
    if (oatcErr) throw oatcErr;

    if (asistenciaId) {
      await supabase.from('control_asistencia').update({ 
        estado_texto: 'Disponible', ultima_act: nowIso 
      }).eq('id', asistenciaId);
    }
  }
};
