import { useState, useEffect, useCallback } from 'react';
import Swal from 'sweetalert2';
import { supabase } from '@/lib/supabaseClient';
import { recepcionService } from '../services/recepcionService';

export function useRecepcion() {
  const [agentes, setAgentes] = useState([]);
  const [asistencias, setAsistencias] = useState([]);
  const [oatcs, setOatcs] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nextOatcNumber, setNextOatcNumber] = useState('1');

  // Form states
  const [agenteAsistencia, setAgenteAsistencia] = useState('');
  const [clienteOatc, setClienteOatc] = useState('');
  const [demandaOatc, setDemandaOatc] = useState('');
  const [agenteOatc, setAgenteOatc] = useState('');
  const [atencionOatc, setAtencionOatc] = useState('');

  const [selectedAgentData, setSelectedAgentData] = useState(null);
  const [showAgentModal, setShowAgentModal] = useState(false);

  // Time formatting
  const getLimaDateInfo = () => {
    const d = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Lima"}));
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return {
      fechaLima: `${year}-${month}-${day}`,
      startOfDay: `${year}-${month}-${day}T00:00:00-05:00`,
      endOfDay: `${year}-${month}-${day}T23:59:59-05:00`
    };
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { startOfDay, endOfDay } = getLimaDateInfo();
      const { rawAgentesData, asistData, oatcsData, clientesData } = await recepcionService.fetchRecepcionData(startOfDay, endOfDay);
      
      setAgentes(rawAgentesData || []);
      setAsistencias(asistData || []);
      if (oatcsData) {
        setOatcs(oatcsData);
        setNextOatcNumber(oatcsData.length > 0 ? (oatcsData[0].correlativo + 1).toString() : '1');
      }
      setClientes(clientesData || []);
    } catch (e) {
      console.error(e);
      Swal.fire('Error de Conexión', e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    const { startOfDay, endOfDay } = getLimaDateInfo();
    
    // Realtime subscriptions
    const channelAsistencia = supabase.channel('custom-all-channel-asistencia')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'control_asistencia' }, () => {
        fetchData();
      }).subscribe();
      
    const channelOatc = supabase.channel('custom-all-channel-oatc')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'oatc' }, () => {
        fetchData();
      }).subscribe();

    return () => {
      supabase.removeChannel(channelAsistencia);
      supabase.removeChannel(channelOatc);
    };
  }, [fetchData]);

  const handleAction = async (actionName) => {
    const nowIso = new Date().toISOString();
    const ingresoActions = ['Registrar Entrada', 'Registrar Salida', 'Refrigerio', 'Psicólogo', 'Pasar la voz', 'Salió del salón', 'Pasar a otro salón'];
    
    let agente = null;
    let asistenciaActual = null;

    if (ingresoActions.includes(actionName)) {
      if (!agenteAsistencia) {
        Swal.fire('Atención', 'Por favor selecciona un agente primero en el panel de Ingreso.', 'warning');
        return;
      }
      agente = agentes.find(a => a.nombre_completo === agenteAsistencia || a.apodo === agenteAsistencia);
      if (!agente) {
        Swal.fire('Error', 'Agente no encontrado en la base de datos.', 'error');
        return;
      }
      asistenciaActual = asistencias.find(a => a.agente_id === agente.id);
    }

    try {
      if (actionName === 'Registrar Entrada') {
        if (asistenciaActual) {
          return Swal.fire('Información', 'El agente ya registró su entrada hoy.', 'info');
        }
        await recepcionService.registrarIngreso(agente.id, nowIso);
        Swal.fire('¡Éxito!', 'Entrada registrada correctamente.', 'success');
      } 
      else if (actionName === 'Registrar Salida') {
        if (!asistenciaActual) return Swal.fire('Error', 'No hay entrada registrada para hoy.', 'error');
        await recepcionService.registrarSalida(asistenciaActual.id, nowIso);
        Swal.fire('¡Éxito!', 'Salida registrada correctamente.', 'success');
      }
      else if (actionName === 'Refrigerio') {
        if (!asistenciaActual) return Swal.fire('Error', 'No hay entrada registrada.', 'error');
        if (!asistenciaActual.ref_inicio_at && !asistenciaActual.ref_termino_at) {
          await recepcionService.iniciarRefrigerio(asistenciaActual.id, nowIso);
          Swal.fire('¡Éxito!', 'Inicio de refrigerio registrado.', 'success');
        } else if (asistenciaActual.ref_inicio_at && !asistenciaActual.ref_termino_at) {
          await recepcionService.terminarRefrigerio(asistenciaActual.id, nowIso);
          Swal.fire('¡Éxito!', 'Término de refrigerio registrado.', 'success');
        } else {
          return Swal.fire('Información', 'El refrigerio ya fue completado hoy.', 'info');
        }
      }
      else if (['Psicólogo', 'Pasar la voz', 'Salió del salón', 'Pasar a otro salón'].includes(actionName)) {
        if (!asistenciaActual) return Swal.fire('Error', 'No hay entrada registrada.', 'error');
        await recepcionService.cambiarEstadoSimple(asistenciaActual.id, actionName, nowIso);
        Swal.fire('¡Éxito!', `Estado actualizado a: ${actionName}.`, 'success');
      }
      else if (actionName === 'Registrar OATC') {
        if (!demandaOatc || !agenteOatc || !atencionOatc) {
          return Swal.fire('Atención', 'Complete Demanda, Agente Disponible y Tipo de atención.', 'warning');
        }
        const agenteOatcObj = agentes.find(a => a.nombre_completo === agenteOatc || a.apodo === agenteOatc);
        if (!agenteOatcObj) return Swal.fire('Error', 'Agente seleccionado no existe.', 'error');

        let clienteId = null;
        if (clienteOatc) {
          const cli = clientes.find(c => `${c.nombre} ${c.apellido}`.toLowerCase().includes(clienteOatc.toLowerCase()) || c.dni === clienteOatc);
          if (cli) clienteId = cli.id;
        }

        const payload = {
          correlativo: parseInt(nextOatcNumber, 10), creado_at: nowIso,
          cliente_id: clienteId, tipo_oatc: atencionOatc, categoria_demanda: demandaOatc,
          agente_id: agenteOatcObj.id
        };

        const asis = asistencias.find(as => as.agente_id === agenteOatcObj.id);
        const nuevoEstado = demandaOatc.toLowerCase() === 'correccion' ? 'Asesorando' : 'Trabajando';
        
        await recepcionService.crearOatc(payload, asis?.id, nuevoEstado, nowIso);
        
        Swal.fire('¡Éxito!', `OATC N° ${nextOatcNumber} registrada.`, 'success');
        setClienteOatc(''); setDemandaOatc(''); setAgenteOatc(''); setAtencionOatc('');
      }
      else if (actionName === 'Venta de Producto') {
        if (!agenteOatc) return Swal.fire('Atención', 'Seleccione un Agente Disponible.', 'warning');
        const agenteOatcObj = agentes.find(a => a.nombre_completo === agenteOatc || a.apodo === agenteOatc);
        if (!agenteOatcObj) return Swal.fire('Error', 'Agente no existe.', 'error');

        let clienteId = null;
        if (clienteOatc) {
          const cli = clientes.find(c => `${c.nombre} ${c.apellido}`.toLowerCase().includes(clienteOatc.toLowerCase()) || c.dni === clienteOatc);
          if (cli) clienteId = cli.id;
        }

        const payload = {
          correlativo: parseInt(nextOatcNumber, 10), creado_at: nowIso,
          cliente_id: clienteId, tipo_oatc: 'Venta de Producto', categoria_demanda: 'producto',
          agente_id: agenteOatcObj.id
        };

        await recepcionService.crearVentaProducto(payload);
        Swal.fire('¡Éxito!', `Orden de Venta creada exitosamente.`, 'success');
        setClienteOatc(''); setDemandaOatc(''); setAgenteOatc(''); setAtencionOatc('');
      }
      else if (actionName === 'Registrar Cita' || actionName === 'Registrar Cliente') {
        Swal.fire({ title: 'Operación Pendiente', text: `La lógica para "${actionName}" se conectará en el siguiente paso.`, icon: 'info' });
      }

      setAgenteAsistencia(''); // clear input
      fetchData(); // Manual refetch as fallback, though realtime handles it
      
    } catch (e) {
      Swal.fire('Error', `Fallo al registrar: ${e.message}`, 'error');
    }
  };

  const handleResolverOATC = async (oatcId, agenteId) => {
    const result = await Swal.fire({
      title: '¿Resolver Orden?', text: "El servicio se enviará a Caja y el agente volverá a estar Disponible.",
      icon: 'question', showCancelButton: true, confirmButtonColor: '#10b981', cancelButtonColor: '#94a3b8', confirmButtonText: 'Sí, resolver'
    });
    if (!result.isConfirmed) return;

    try {
      const nowIso = new Date().toISOString();
      const asis = asistencias.find(a => a.agente_id === agenteId);
      
      await recepcionService.resolverOatc(oatcId, asis?.id, nowIso);
      Swal.fire('Resuelto', 'Orden enviada a caja exitosamente.', 'success');
      fetchData();
    } catch (e) {
      console.error(e);
      Swal.fire('Error', 'Ocurrió un error al resolver la orden.', 'error');
    }
  };

  const handleDeleteOATC = async (oatcId, agenteId) => {
    const result = await Swal.fire({
      title: '¿Eliminar Orden?',
      text: "Esta acción no se puede deshacer.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Sí, eliminar'
    });
    if (!result.isConfirmed) return;

    try {
      const nowIso = new Date().toISOString();
      const asis = asistencias.find(a => a.agente_id === agenteId);
      
      await recepcionService.eliminarOatc(oatcId, asis?.id, nowIso);
      Swal.fire('Eliminada', 'La orden ha sido eliminada.', 'success');
      fetchData();
    } catch (e) {
      console.error(e);
      Swal.fire('Error', 'Ocurrió un error al eliminar la orden.', 'error');
    }
  };

  const openAgentModal = (agente, asistencia) => {
    const agentOatcs = oatcs.filter(o => o.agente_id === agente.id);
    const qClientes = agentOatcs.filter(o => ['cliente', 'correccion', 'producto'].includes(o.categoria_demanda?.toLowerCase())).length;
    const qTurnos = agentOatcs.filter(o => ['turno', 'turno_nino', 'turno_caballero'].includes(o.categoria_demanda?.toLowerCase())).length;
    
    setSelectedAgentData({ ...agente, asistencia, qClientes, qTurnos });
    setShowAgentModal(true);
  };

  return {
    agentes, asistencias, oatcs, clientes, loading, nextOatcNumber,
    agenteAsistencia, setAgenteAsistencia,
    clienteOatc, setClienteOatc,
    demandaOatc, setDemandaOatc,
    agenteOatc, setAgenteOatc,
    atencionOatc, setAtencionOatc,
    selectedAgentData, showAgentModal, setShowAgentModal,
    handleAction, handleResolverOATC, handleDeleteOATC, openAgentModal
  };
}
