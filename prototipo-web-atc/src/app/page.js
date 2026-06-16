'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Swal from 'sweetalert2';

export default function ReceptionDashboard() {
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

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: agentesData } = await supabase.from('agentes').select('*');
      if (agentesData) setAgentes(agentesData);

      // Mock current OATC number (in reality fetch max(correlativo) + 1 for today)
      setNextOatcNumber('42');
      
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleAction = async (actionName) => {
    Swal.fire({
      title: 'Operación Pendiente',
      text: `La lógica para "${actionName}" se conectará en el siguiente paso.`,
      icon: 'info',
      confirmButtonColor: '#4f46e5',
      confirmButtonText: 'Entendido',
      customClass: {
        popup: 'rounded-xl',
        confirmButton: 'rounded-lg px-4 py-2 font-bold'
      }
    });
  };

  const openAgentModal = (agente) => {
    setSelectedAgentData(agente);
    setShowAgentModal(true);
  };

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
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Agente</label>
              <input 
                list="agentes-list" 
                value={agenteAsistencia}
                onChange={(e) => setAgenteAsistencia(e.target.value)}
                className="w-full px-2 py-1.5 rounded border border-slate-300 focus:border-indigo-500 outline-none text-sm"
                placeholder="Agente"
              />
              <datalist id="agentes-list">
                {agentes.map(a => <option key={a.id} value={a.nombre_completo || a.apodo} />)}
              </datalist>
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
              <span>Fecha: {new Date().toLocaleDateString('es-PE')}</span>
            </div>
          </div>
          
          <div className="p-3 flex-1 flex flex-col gap-2">
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-8">
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Clientes</label>
                <input 
                  value={clienteOatc}
                  onChange={(e) => setClienteOatc(e.target.value)}
                  className="w-full px-2 py-1.5 rounded border border-slate-300 outline-none text-sm"
                  placeholder="Clientes"
                />
              </div>
              <div className="col-span-4">
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tipo de demanda</label>
                <select 
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
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Agente Disponible</label>
                <input 
                  list="agentes-list"
                  value={agenteOatc}
                  onChange={(e) => setAgenteOatc(e.target.value)}
                  className="w-full px-2 py-1.5 rounded border border-slate-300 outline-none text-sm"
                  placeholder="Agente"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tipo de atención</label>
                <select 
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
                {agentes.slice(0, 5).map(a => (
                  <tr key={a.id} className="hover:bg-indigo-50 transition-colors cursor-pointer group" onClick={() => openAgentModal(a)}>
                    <td className="px-2 py-2 text-center font-mono font-bold text-indigo-600">3</td>
                    <td className="px-2 py-2 text-center font-mono font-bold text-sky-600">1</td>
                    <td className="px-2 py-2 text-slate-500">09:00 AM</td>
                    <td className="px-2 py-2 text-slate-500">--:--</td>
                    <td className="px-2 py-2 font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{a.nombre_completo || a.apodo}</td>
                    <td className="px-2 py-2">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Disponible
                      </span>
                    </td>
                    <td className="px-2 py-2 text-right text-slate-400 font-mono text-[10px]">10:15 AM</td>
                  </tr>
                ))}
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
                <tr className="hover:bg-slate-50 transition-colors">
                  <td className="px-2 py-2 font-mono font-bold">14</td>
                  <td className="px-2 py-2 text-slate-500">10:05 AM</td>
                  <td className="px-2 py-2 font-bold text-slate-800">Maria Perez</td>
                  <td className="px-2 py-2"><span className="bg-sky-100 text-sky-800 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase">Color</span></td>
                  <td className="px-2 py-2 text-slate-600">Juan</td>
                  <td className="px-2 py-2 text-center">
                    <div className="flex justify-center gap-1">
                      <button className="px-2 py-1 bg-emerald-500 text-white rounded text-[10px] font-bold hover:bg-emerald-600">Resolver</button>
                      <button className="px-2 py-1 bg-amber-500 text-white rounded text-[10px] font-bold hover:bg-amber-600">Espera</button>
                      <button className="px-2 py-1 bg-red-500 text-white rounded text-[10px] font-bold hover:bg-red-600">X</button>
                    </div>
                  </td>
                </tr>
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
