'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Swal from 'sweetalert2';
import Navbar from '@/components/Navbar'; // Asumo que se usa aquí si se necesita, si no, se deja igual.

export default function ReceptionDashboard() {
  const router = useRouter();
  
  const [agentes, setAgentes] = useState([]);
  const [oatcs, setOatcs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [agenteAsistencia, setAgenteAsistencia] = useState('');
  const [clienteOatc, setClienteOatc] = useState('');
  const [demandaOatc, setDemandaOatc] = useState('');
  const [agenteOatc, setAgenteOatc] = useState('');
  const [atencionOatc, setAtencionOatc] = useState('');
  const [nextOatcNumber, setNextOatcNumber] = useState('1');

  // Modal State
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [selectedAgentData, setSelectedAgentData] = useState(null);

  const [asistencias, setAsistencias] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const user = localStorage.getItem('currentUser');
    if (!user) {
      router.push('/login');
    } else {
      setIsAuthorized(true);
    }
  }, [router]);

  useEffect(() => {
    if (!isAuthorized) return;
    const fetchData = async () => {
      setLoading(true);
      // Robust date formatting for America/Lima
      const now = new Date();
      const options = { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' };
      const formatter = new Intl.DateTimeFormat('en-CA', options);
      const parts = formatter.formatToParts(now);
      const year = parts.find(p => p.type === 'year').value;
      const month = parts.find(p => p.type === 'month').value;
      const day = parts.find(p => p.type === 'day').value;
      const fechaLima = `${year}-${month}-${day}`;
      
      const startOfDay = `${fechaLima}T00:00:00-05:00`;
      const endOfDay = `${fechaLima}T23:59:59-05:00`;
      
      console.log("🚀 FETCH_DATA INICIADO", { startOfDay, endOfDay });
      
      // Fetch data
      const [
        { data: rawAgentesData, error: errAgentes }, 
        { data: asistData, error: errAsist }, 
        { data: oatcsData, error: errOatc },
        { data: clientesData, error: errClientes }
      ] = await Promise.all([
        supabase.from('agentes').select('*'),
        supabase.from('control_asistencia').select('*').gte('created_at', startOfDay).lte('created_at', endOfDay),
        supabase.from('oatc').select('*, agentes(nombre_completo, apodo), clientes(nombre, apellido)').gte('creado_at', startOfDay).lte('creado_at', endOfDay).order('correlativo', { ascending: false }),
        supabase.from('clientes').select('id, nombre, apellido, dni')
      ]);

      console.log("📦 RESPUESTA SUPABASE:", {
        rawAgentesData,
        asistData,
        oatcsData,
        clientesData,
        errAgentes,
        errAsist,
        errOatc,
        errClientes
      });

      if (errAgentes || errAsist || errOatc || errClientes) {
        console.error("❌ ERRORES DE SUPABASE:", { errAgentes, errAsist, errOatc, errClientes });
        import('sweetalert2').then(Swal => {
          Swal.default.fire('Error de Conexión', 'Hubo un error cargando datos de Supabase', 'error');
        });
      }

      if (rawAgentesData) {
        setAgentes(rawAgentesData);
      }
      if (asistData) setAsistencias(asistData);
      if (oatcsData) {
        setOatcs(oatcsData);
        setNextOatcNumber(oatcsData.length > 0 ? (oatcsData[0].correlativo + 1).toString() : '1');
      }
      if (clientesData) setClientes(clientesData);
      
      setLoading(false);

      // FORCED DEBUG ALERT
      setTimeout(() => {
        Swal.fire({
          title: '🔍 Reporte de Depuración',
          html: `<b>Agentes descargados:</b> ${rawAgentesData ? rawAgentesData.length : 'NULL'}<br>` +
                `<b>Asistencias hoy:</b> ${asistData ? asistData.length : 'NULL'}<br>` +
                `<b>URL Supabase:</b> ${process.env.NEXT_PUBLIC_SUPABASE_URL || 'NO CONFIGURADA'}`
        });
      }, 1000);
    };
    fetchData();
  }, []);

  const getLimaDate = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
  const getLimaTime = () => new Date().toLocaleTimeString('en-US', { timeZone: 'America/Lima', hour12: true, hour: 'numeric', minute: '2-digit' }).toLowerCase();

  const handleAction = async (actionName) => {
    if (!agenteAsistencia) {
      Swal.fire('Atención', 'Por favor selecciona un agente primero.', 'warning');
      return;
    }

    const agente = agentes.find(a => a.nombre_completo === agenteAsistencia || a.apodo === agenteAsistencia);
    if (!agente) {
      Swal.fire('Error', 'Agente no encontrado en la base de datos.', 'error');
      return;
    }

    const nowIso = new Date().toISOString();
    const asistenciaActual = asistencias.find(a => a.agente_id === agente.id);

    try {
      if (actionName === 'Registrar Entrada') {
        if (asistenciaActual) {
          Swal.fire('Información', 'El agente ya registró su entrada hoy.', 'info');
          return;
        }
        const { error } = await supabase.from('control_asistencia').insert({
          agente_id: agente.id, entrada_at: nowIso, estado_texto: 'Disponible', ultima_act: nowIso
        });
        if (error) throw error;
        Swal.fire('¡Éxito!', 'Entrada registrada correctamente.', 'success');
      } 
      else if (actionName === 'Registrar Salida') {
        if (!asistenciaActual) {
          Swal.fire('Error', 'No hay entrada registrada para hoy.', 'error');
          return;
        }
        const { error } = await supabase.from('control_asistencia').update({
          salida_at: nowIso, estado_texto: 'Ausente', ultima_act: nowIso
        }).eq('id', asistenciaActual.id);
        if (error) throw error;
        Swal.fire('¡Éxito!', 'Salida registrada correctamente.', 'success');
      }
      else if (actionName === 'Refrigerio') {
        if (!asistenciaActual) {
          Swal.fire('Error', 'No hay entrada registrada.', 'error');
          return;
        }
        if (!asistenciaActual.ref_inicio_at && !asistenciaActual.ref_termino_at) {
          const { error } = await supabase.from('control_asistencia').update({
            ref_inicio_at: nowIso, estado_texto: 'En refrigerio', ultima_act: nowIso
          }).eq('id', asistenciaActual.id);
          if (error) throw error;
          Swal.fire('¡Éxito!', 'Inicio de refrigerio registrado.', 'success');
        } else if (asistenciaActual.ref_inicio_at && !asistenciaActual.ref_termino_at) {
          const { error } = await supabase.from('control_asistencia').update({
            ref_termino_at: nowIso, estado_texto: 'Disponible', ultima_act: nowIso
          }).eq('id', asistenciaActual.id);
          if (error) throw error;
          Swal.fire('¡Éxito!', 'Término de refrigerio registrado.', 'success');
        } else {
          Swal.fire('Información', 'El refrigerio ya fue completado hoy.', 'info');
          return;
        }
      }
      else if (actionName === 'Registrar OATC') {
        if (!demandaOatc || !agenteOatc || !atencionOatc) {
          Swal.fire('Atención', 'Complete Demanda, Agente Disponible y Tipo de atención.', 'warning');
          return;
        }

        const agenteOatcObj = agentes.find(a => a.nombre_completo === agenteOatc || a.apodo === agenteOatc);
        if (!agenteOatcObj) {
          Swal.fire('Error', 'Agente seleccionado para la OATC no existe.', 'error');
          return;
        }

        let clienteId = null;
        if (clienteOatc) {
          const cli = clientes.find(c => `${c.nombre} ${c.apellido}`.toLowerCase().includes(clienteOatc.toLowerCase()) || c.dni === clienteOatc);
          if (cli) clienteId = cli.id;
        }

        const payload = {
          correlativo: parseInt(nextOatcNumber, 10),
          creado_at: nowIso,
          cliente_id: clienteId,
          tipo_oatc: atencionOatc,
          categoria_demanda: demandaOatc,
          agente_id: agenteOatcObj.id
        };

        const { error } = await supabase.from('oatc').insert(payload);
        if (error) throw error;
        
        Swal.fire('¡Éxito!', `OATC N° ${nextOatcNumber} registrada.`, 'success');
        setClienteOatc(''); setDemandaOatc(''); setAgenteOatc(''); setAtencionOatc('');
      }
      else {
        Swal.fire({
          title: 'Operación Pendiente',
          text: `La lógica para "${actionName}" se conectará en el siguiente paso.`,
          icon: 'info',
          confirmButtonColor: '#4f46e5',
        });
      }

      // Refetch data after success
      const fechaLima = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
      const startOfDay = `${fechaLima}T00:00:00-05:00`;
      const endOfDay = `${fechaLima}T23:59:59-05:00`;

      const [ { data: newAsist }, { data: newOatcs } ] = await Promise.all([
        supabase.from('control_asistencia').select('*').gte('created_at', startOfDay).lte('created_at', endOfDay),
        supabase.from('oatc').select('*, agentes(nombre_completo, apodo), clientes(nombre, apellido)').gte('creado_at', startOfDay).lte('creado_at', endOfDay).order('correlativo', { ascending: false })
      ]);
      if (newAsist) setAsistencias(newAsist);
      if (newOatcs) {
        setOatcs(newOatcs);
        setNextOatcNumber(newOatcs.length > 0 ? (newOatcs[0].correlativo + 1).toString() : '1');
      }
      setAgenteAsistencia(''); // clear input
      
    } catch (e) {
      Swal.fire('Error', `Fallo al registrar: ${e.message}`, 'error');
    }
  };

  const openAgentModal = (agente) => {
    setSelectedAgentData(agente);
    setShowAgentModal(true);
  };

  if (!isAuthorized) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><p className="text-slate-500">Verificando sesión...</p></div>;
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 p-2 font-sans">
      
      {/* 
        Grid Principal: 2 columnas superiores (Formularios) y 2 inferiores (Tablas). 
        Todo muy compacto (gap-2) para aprovechar la "pizarra" 
      */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 max-w-[1600px] mx-auto">
        
        {/* PANEL: CONTROL DE INGRESO */}
        <div className="bg-white rounded shadow-sm border border-slate-200 flex flex-col">
          <div className="bg-slate-800 text-white px-3 py-1.5 flex justify-between items-center rounded-t">
            <h2 className="text-sm font-bold m-0 uppercase tracking-wide">Ingreso</h2>
          </div>
          <div className="p-3 flex-1 flex flex-col gap-3">
            <div className="relative">
              <label htmlFor="agenteIngreso" className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Agente</label>
              <select 
                id="agenteIngreso" name="agenteIngreso"
                value={agenteAsistencia}
                onChange={(e) => setAgenteAsistencia(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-sky-500 outline-none transition-all" 
              >
                <option value="">Seleccionar agente...</option>
                {agentes.map(a => <option key={a.id} value={a.nombre_completo || a.apodo}>{a.nombre_completo || a.apodo}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              <button onClick={() => handleAction('Registrar Entrada')} className="py-1.5 bg-amber-400 hover:bg-amber-500 text-amber-950 rounded font-bold text-xs transition-colors shadow-sm">Registrar entrada</button>
              <button onClick={() => handleAction('Registrar Salida')} className="py-1.5 bg-red-600 hover:bg-red-700 text-white rounded font-bold text-xs transition-colors shadow-sm">Registrar salida</button>
              <button onClick={() => handleAction('Refrigerio')} className="py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded font-bold text-xs transition-colors shadow-sm">Refrigerio</button>
              
              <button onClick={() => handleAction('Psicólogo')} className="py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded font-bold text-xs transition-colors shadow-sm mt-1">Psicólogo</button>
              <button onClick={() => handleAction('Pasar la voz')} className="py-1.5 bg-teal-500 hover:bg-teal-600 text-white rounded font-bold text-xs transition-colors shadow-sm mt-1">Pásale la voz</button>
              <button onClick={() => handleAction('Salió del salón')} className="py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded font-bold text-xs transition-colors shadow-sm mt-1">Salió del salón</button>
            </div>
            <button onClick={() => handleAction('Pasar a otro salón')} className="w-full py-1.5 mt-auto border border-emerald-500 text-emerald-600 hover:bg-emerald-50 rounded font-bold text-xs transition-colors">
              Pasar a otro salón
            </button>
          </div>
        </div>

        {/* PANEL: ÓRDENES DE ATENCIÓN */}
        <div className="bg-white rounded shadow-sm border border-slate-200 flex flex-col">
          <div className="bg-slate-800 text-white px-3 py-1.5 flex justify-between items-center rounded-t">
            <h2 className="text-sm font-bold m-0 uppercase tracking-wide">Órdenes de atención</h2>
            <div className="flex gap-3 text-xs font-mono bg-slate-700 px-2 py-0.5 rounded">
              <span>N°: <span className="text-amber-400 font-bold">{nextOatcNumber}</span></span>
              <span className="capitalize">{mounted ? `Fecha: ${new Date().toLocaleDateString('es-PE')}` : 'Fecha: ...'}</span>
            </div>
          </div>
          
          <div className="p-3 flex-1 flex flex-col gap-2">
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-8">
                <label htmlFor="clienteOatc" className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Clientes</label>
                <input 
                  id="clienteOatc" name="clienteOatc"
                  value={clienteOatc}
                  onChange={(e) => setClienteOatc(e.target.value)}
                  className="w-full px-2 py-1.5 rounded border border-slate-300 outline-none text-sm"
                  placeholder="Clientes"
                />
              </div>
              <div className="col-span-4">
                <label htmlFor="demandaOatc" className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tipo de demanda</label>
                <select 
                  id="demandaOatc" name="demandaOatc"
                  value={demandaOatc}
                  onChange={(e) => setDemandaOatc(e.target.value)}
                  className="w-full px-2 py-1.5 rounded border border-slate-300 outline-none text-sm bg-white"
                >
                  <option value="">Seleccionar...</option>
                  <option value="turno">Turno</option>
                  <option value="cliente">Cliente</option>
                  <option value="correccion">Corrección</option>
                  <option value="turno_nino">Turno niño</option>
                  <option value="turno_caballero">Turno caballero</option>
                  <option value="producto">Producto</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="agenteOatc" className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Agente Disponible</label>
                <select 
                  id="agenteOatc" name="agenteOatc"
                  value={agenteOatc}
                  onChange={(e) => setAgenteOatc(e.target.value)}
                  className="w-full px-2 py-1.5 rounded border border-slate-300 focus:border-indigo-500 outline-none text-sm"
                >
                  <option value="">Seleccionar agente...</option>
                  {agentes.map(a => <option key={a.id} value={a.nombre_completo || a.apodo}>{a.nombre_completo || a.apodo}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="atencionOatc" className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tipo de atención</label>
                <select 
                  id="atencionOatc" name="atencionOatc"
                  value={atencionOatc}
                  onChange={(e) => setAtencionOatc(e.target.value)}
                  className="w-full px-2 py-1.5 rounded border border-slate-300 outline-none text-sm bg-white"
                >
                  <option value="">Seleccionar...</option>
                  <option value="Corte">Corte, corte con diseño</option>
                  <option value="Peinados">Cepillado, planchado, peinados</option>
                  <option value="Color">Color</option>
                  <option value="Alisados">Alisados, laceados y botox</option>
                  <option value="Manos">Manos y pies</option>
                </select>
              </div>
            </div>

            <div className="mt-auto grid grid-cols-3 gap-1.5 pt-2">
              <button onClick={() => handleAction('Registrar OATC')} className="py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded font-bold text-xs shadow-sm">Registrar Orden</button>
              <button onClick={() => handleAction('Registrar Cita')} className="py-2 bg-slate-100 border border-slate-300 text-slate-800 hover:bg-slate-200 rounded font-bold text-xs shadow-sm">Registrar Cita</button>
              <button onClick={() => handleAction('Registrar Cliente')} className="py-2 bg-amber-400 text-amber-950 hover:bg-amber-500 rounded font-bold text-xs shadow-sm">Registrar Cliente</button>
            </div>
          </div>
        </div>

        {/* TABLA: DISPONIBILIDAD Y TURNOS */}
        <div className="bg-white rounded shadow-sm border border-slate-200 overflow-hidden lg:col-span-1">
          <div className="bg-slate-800 text-white px-3 py-1.5 border-b border-slate-200">
            <h2 className="text-sm font-bold m-0 uppercase tracking-wide">Disponibilidad y Turnos</h2>
          </div>
          <div className="overflow-x-auto max-h-[400px]">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-100 text-slate-600 uppercase font-bold sticky top-0 border-b border-slate-200 z-10">
                <tr>
                  <th className="px-2 py-2 text-center" title="Atenciones a Clientes">Q Cli</th>
                  <th className="px-2 py-2 text-center" title="Atenciones a Turnos">Q Tur</th>
                  <th className="px-2 py-2">Ingreso</th>
                  <th className="px-2 py-2">Salida</th>
                  <th className="px-2 py-2">Agente</th>
                  <th className="px-2 py-2">Estado</th>
                  <th className="px-2 py-2 text-right">Act.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {asistencias.map(asist => {
                  const a = agentes.find(ag => ag.id === asist.agente_id);
                  if (!a) return null;
                  return (
                    <tr key={asist.id} className="hover:bg-indigo-50 transition-colors cursor-pointer group" onClick={() => openAgentModal(a)}>
                      <td className="px-2 py-2 text-center font-mono font-bold text-indigo-600">-</td>
                      <td className="px-2 py-2 text-center font-mono font-bold text-sky-600">-</td>
                      <td className="px-2 py-2 text-slate-500">{asist.entrada_at ? new Date(asist.entrada_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</td>
                      <td className="px-2 py-2 text-slate-500">{asist.salida_at ? new Date(asist.salida_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</td>
                      <td className="px-2 py-2 font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{a.nombre_completo || a.apodo}</td>
                      <td className="px-2 py-2">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${asist.estado_texto === 'Disponible' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-amber-100 text-amber-800 border border-amber-200'}`}>
                          {asist.estado_texto}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-right text-slate-400 font-mono text-[10px]">
                        {asist.ultima_act ? new Date(asist.ultima_act).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                      </td>
                    </tr>
                  );
                })}
                {asistencias.length === 0 && (
                  <tr><td colSpan="7" className="text-center py-4 text-slate-500">Ningún agente ha ingresado hoy.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* TABLA: LISTADO DE ATENCIÓN */}
        <div className="bg-white rounded shadow-sm border border-slate-200 overflow-hidden lg:col-span-1">
          <div className="bg-slate-800 text-white px-3 py-1.5 border-b border-slate-200">
            <h2 className="text-sm font-bold m-0 uppercase tracking-wide">Listado de Atención</h2>
          </div>
          <div className="overflow-x-auto max-h-[400px]">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-100 text-slate-600 uppercase font-bold sticky top-0 border-b border-slate-200 z-10">
                <tr>
                  <th className="px-2 py-2">Ord.</th>
                  <th className="px-2 py-2">Hora</th>
                  <th className="px-2 py-2">Cliente</th>
                  <th className="px-2 py-2">Categoría</th>
                  <th className="px-2 py-2">Agente</th>
                  <th className="px-2 py-2 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {oatcs.length > 0 ? oatcs.map(o => (
                  <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-2 py-2 font-mono font-bold">{o.correlativo}</td>
                    <td className="px-2 py-2 text-slate-500">{o.creado_at ? new Date(o.creado_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</td>
                    <td className="px-2 py-2 font-bold text-slate-800">
                      {o.clientes ? `${o.clientes.nombre} ${o.clientes.apellido}` : 'POR ASIGNAR'}
                    </td>
                    <td className="px-2 py-2">
                      <span className="bg-sky-100 text-sky-800 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase">
                        {o.categoria_demanda}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-slate-600">
                      {o.agentes ? (o.agentes.nombre_completo || o.agentes.apodo) : '--'}
                    </td>
                    <td className="px-2 py-2 text-center">
                      <div className="flex justify-center gap-1">
                        <button className="px-2 py-1 bg-emerald-500 text-white rounded text-[10px] font-bold hover:bg-emerald-600">Resolver</button>
                        <button className="px-2 py-1 bg-amber-500 text-white rounded text-[10px] font-bold hover:bg-amber-600">Espera</button>
                        <button className="px-2 py-1 bg-red-500 text-white rounded text-[10px] font-bold hover:bg-red-600">X</button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td colSpan="6" className="px-4 py-8 text-center text-slate-500">
                      No hay órdenes activas en este momento
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* MODAL: RESUMEN DEL AGENTE */}
      {showAgentModal && selectedAgentData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-800 text-white p-4 flex justify-between items-center">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <span className="text-amber-400">👤</span> 
                Desglose de Horas
              </h3>
              <button onClick={() => setShowAgentModal(false)} className="text-slate-300 hover:text-white text-xl leading-none">&times;</button>
            </div>
            
            <div className="p-5">
              <div className="text-center mb-5">
                <h4 className="text-2xl font-black text-indigo-600">{selectedAgentData.nombre_completo || selectedAgentData.apodo}</h4>
                <span className="inline-block mt-1 px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-bold uppercase tracking-wide">
                  Disponible
                </span>
              </div>
              
              <div className="border rounded-lg overflow-hidden divide-y divide-slate-100">
                <div className="flex justify-between p-3 bg-slate-50">
                  <span className="font-bold text-slate-600 text-sm">Entrada:</span>
                  <span className="font-mono text-slate-800 text-sm bg-white px-2 py-0.5 rounded border shadow-sm">09:00 AM</span>
                </div>
                <div className="flex justify-between p-3 bg-slate-50">
                  <span className="font-bold text-slate-600 text-sm">Inicio Refrigerio:</span>
                  <span className="font-mono text-slate-800 text-sm bg-white px-2 py-0.5 rounded border shadow-sm">--:--</span>
                </div>
                <div className="flex justify-between p-3 bg-slate-50">
                  <span className="font-bold text-slate-600 text-sm">Fin Refrigerio:</span>
                  <span className="font-mono text-slate-800 text-sm bg-white px-2 py-0.5 rounded border shadow-sm">--:--</span>
                </div>
                <div className="flex justify-between p-3 bg-slate-50">
                  <span className="font-bold text-slate-600 text-sm">Salida:</span>
                  <span className="font-mono text-slate-800 text-sm bg-white px-2 py-0.5 rounded border shadow-sm">--:--</span>
                </div>
              </div>

              <div className="mt-5 border-t pt-4">
                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Resumen de Atenciones</h5>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-lg text-center">
                    <div className="text-2xl font-black text-indigo-600">3</div>
                    <div className="text-[10px] font-bold text-indigo-800 uppercase mt-1">Clientes</div>
                  </div>
                  <div className="bg-sky-50 border border-sky-100 p-3 rounded-lg text-center">
                    <div className="text-2xl font-black text-sky-600">1</div>
                    <div className="text-[10px] font-bold text-sky-800 uppercase mt-1">Turnos</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-3 bg-slate-50 border-t flex justify-end">
              <button onClick={() => setShowAgentModal(false)} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-sm font-bold rounded transition-colors">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
