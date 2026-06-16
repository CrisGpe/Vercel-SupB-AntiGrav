'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

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

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      // Fetch agentes for datalist
      const { data: agentesData } = await supabase.from('agentes').select('*');
      if (agentesData) setAgentes(agentesData);

      // In a real app, we would fetch OATCs for today and Asistencias
      // For now, we'll just mock it or leave it empty until the logic is fully ported
      setLoading(false);
    };

    fetchData();
  }, []);

  const handleAction = async (actionName) => {
    alert(`Acción: ${actionName} en construcción...`);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-8 font-sans selection:bg-indigo-500 selection:text-white">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div>
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent">
              Recepción Dashboard
            </h1>
            <p className="text-slate-500 text-sm mt-1">Gestión de agentes y órdenes de atención</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-slate-500">{new Date().toLocaleDateString('es-PE')}</p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Panel de Asistencia */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
            <div className="bg-slate-50/50 p-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Control de Ingreso
              </h2>
            </div>
            <div className="p-6 flex-1 flex flex-col gap-6">
              
              <div className="relative">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Agente</label>
                <input 
                  list="agentes-list" 
                  value={agenteAsistencia}
                  onChange={(e) => setAgenteAsistencia(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  placeholder="Seleccionar o buscar agente..."
                />
                <datalist id="agentes-list">
                  {agentes.map(a => <option key={a.id} value={a.nombre_completo || a.apodo} />)}
                </datalist>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => handleAction('Registrar Entrada')} className="px-4 py-2.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 rounded-xl font-medium text-sm transition-colors">Entrada</button>
                  <button onClick={() => handleAction('Registrar Salida')} className="px-4 py-2.5 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 rounded-xl font-medium text-sm transition-colors">Salida</button>
                  <button onClick={() => handleAction('Refrigerio')} className="px-4 py-2.5 bg-amber-50 text-amber-600 hover:bg-amber-100 hover:text-amber-700 rounded-xl font-medium text-sm transition-colors">Refrigerio</button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => handleAction('Psicólogo')} className="px-4 py-2.5 bg-purple-50 text-purple-600 hover:bg-purple-100 hover:text-purple-700 rounded-xl font-medium text-sm transition-colors">Psicólogo</button>
                  <button onClick={() => handleAction('Pasar la voz')} className="px-4 py-2.5 bg-sky-50 text-sky-600 hover:bg-sky-100 hover:text-sky-700 rounded-xl font-medium text-sm transition-colors">Pásale la voz</button>
                  <button onClick={() => handleAction('Salió del salón')} className="px-4 py-2.5 bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-700 rounded-xl font-medium text-sm transition-colors">Salió salón</button>
                </div>
                <button onClick={() => handleAction('Pasar a otro salón')} className="w-full px-4 py-2.5 border-2 border-dashed border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-600 rounded-xl font-medium text-sm transition-colors">
                  Pasar a otro salón
                </button>
              </div>
            </div>
          </div>

          {/* Panel de Órdenes de Atención */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
            <div className="bg-slate-50/50 p-4 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                Órdenes de Atención
              </h2>
              <div className="text-xs font-mono bg-white px-2 py-1 rounded border border-slate-200 text-slate-500">
                OATC #---
              </div>
            </div>
            
            <div className="p-6 flex-1 flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 relative">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Cliente</label>
                  <input 
                    value={clienteOatc}
                    onChange={(e) => setClienteOatc(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm"
                    placeholder="Nombre o DNI..."
                  />
                </div>
                <div className="relative">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Demanda</label>
                  <select 
                    value={demandaOatc}
                    onChange={(e) => setDemandaOatc(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm bg-white"
                  >
                    <option value="">Seleccionar...</option>
                    <option value="turno">Turno</option>
                    <option value="cliente">Cliente</option>
                    <option value="correccion">Corrección</option>
                    <option value="producto">Producto</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Agente Asignado</label>
                  <input 
                    list="agentes-list"
                    value={agenteOatc}
                    onChange={(e) => setAgenteOatc(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm"
                    placeholder="Agente..."
                  />
                </div>
                <div className="relative">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Tipo de Atención</label>
                  <select 
                    value={atencionOatc}
                    onChange={(e) => setAtencionOatc(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm bg-white"
                  >
                    <option value="">Seleccionar...</option>
                    <option value="Corte">Corte</option>
                    <option value="Color">Color</option>
                    <option value="Peinados">Peinados</option>
                    <option value="Manos y pies">Manos y pies</option>
                  </select>
                </div>
              </div>

              <div className="mt-auto pt-4 grid grid-cols-3 gap-3">
                <button onClick={() => handleAction('Registrar OATC')} className="col-span-3 md:col-span-1 px-4 py-3 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl font-medium text-sm transition-all shadow-sm shadow-indigo-600/20">Registrar Orden</button>
                <button onClick={() => handleAction('Registrar Cita')} className="col-span-3 md:col-span-1 px-4 py-3 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-medium text-sm transition-all shadow-sm">Registrar Cita</button>
                <button onClick={() => handleAction('Registrar Cliente')} className="col-span-3 md:col-span-1 px-4 py-3 bg-amber-500 text-white hover:bg-amber-600 rounded-xl font-medium text-sm transition-all shadow-sm shadow-amber-500/20">Registrar Cliente</button>
              </div>
            </div>
          </div>
        </div>

        {/* Tablas Inferiores */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-1 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="bg-slate-50/50 p-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-800">Disponibilidad y Turnos</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50/50 text-slate-500 text-xs uppercase font-semibold">
                  <tr>
                    <th className="px-4 py-3 border-b border-slate-100">Agente</th>
                    <th className="px-4 py-3 border-b border-slate-100">Estado</th>
                    <th className="px-4 py-3 border-b border-slate-100 text-right">Actualizado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {agentes.slice(0, 5).map(a => (
                    <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-700">{a.nombre_completo || a.apodo}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Disponible
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-400 text-xs">Hace 2m</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="bg-slate-50/50 p-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-800">Listado de Atención Activa</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50/50 text-slate-500 text-xs uppercase font-semibold">
                  <tr>
                    <th className="px-4 py-3 border-b border-slate-100">Orden</th>
                    <th className="px-4 py-3 border-b border-slate-100">Hora</th>
                    <th className="px-4 py-3 border-b border-slate-100">Cliente</th>
                    <th className="px-4 py-3 border-b border-slate-100">Agente</th>
                    <th className="px-4 py-3 border-b border-slate-100">Demanda</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="hover:bg-slate-50/50 transition-colors">
                    <td colSpan="5" className="px-4 py-8 text-center text-slate-500">
                      No hay órdenes activas en este momento
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
