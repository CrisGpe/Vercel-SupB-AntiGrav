'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import AuthWrapper from '@/components/AuthWrapper';

export default function DatosPage() {
  const [oatcs, setOatcs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    // Set today as default
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
    setDateFilter(today);
    fetchOatcs(today);
  }, []);

  const fetchOatcs = async (dateStr) => {
    setLoading(true);
    let query = supabase.from('oatc').select('*, agentes(nombre_completo), clientes(nombre, apellido)').order('correlativo', { ascending: false });
    if (dateStr) {
      const startOfDay = `${dateStr}T00:00:00-05:00`;
      const endOfDay = `${dateStr}T23:59:59-05:00`;
      query = query.gte('creado_at', startOfDay).lte('creado_at', endOfDay);
    }
    
    const { data } = await query;
    setOatcs(data || []);
    setLoading(false);
  };

  const handleDateChange = (e) => {
    setDateFilter(e.target.value);
    fetchOatcs(e.target.value);
  };

  return (
    <AuthWrapper>
      <div className="flex-1 p-6 max-w-screen-2xl mx-auto w-full flex flex-col h-full">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
          
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-600 rounded-lg shadow-sm">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800 leading-tight">Base de Datos OATC</h3>
                <p className="text-xs text-slate-500 font-medium">Historial completo de atenciones</p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="px-6 py-4 border-b border-slate-100 bg-white flex items-center gap-4">
            <div>
              <label htmlFor="datosFecha" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Filtrar por Fecha</label>
              <input id="datosFecha" name="datosFecha" type="date" 
                value={dateFilter}
                onChange={handleDateChange}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button onClick={() => fetchOatcs('')} className="mt-5 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors">
              Ver Todos (Histórico)
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto bg-slate-50/30 p-6">
            {loading ? (
              <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 bg-slate-50 uppercase font-bold tracking-wider">
                    <tr>
                      <th className="px-4 py-3 border-b border-slate-200">Correlativo</th>
                      <th className="px-4 py-3 border-b border-slate-200">Fecha</th>
                      <th className="px-4 py-3 border-b border-slate-200">Hora</th>
                      <th className="px-4 py-3 border-b border-slate-200">Cliente</th>
                      <th className="px-4 py-3 border-b border-slate-200">Agente</th>
                      <th className="px-4 py-3 border-b border-slate-200">Demanda</th>
                      <th className="px-4 py-3 border-b border-slate-200">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {oatcs.length > 0 ? oatcs.map(o => (
                      <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-slate-700">{o.correlativo}</td>
                        <td className="px-4 py-3 text-slate-600 font-mono">{o.creado_at ? new Date(o.creado_at).toLocaleDateString('en-CA', { timeZone: 'America/Lima' }) : '--'}</td>
                        <td className="px-4 py-3 text-slate-500">{o.creado_at ? new Date(o.creado_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '--'}</td>
                        <td className="px-4 py-3 font-bold text-slate-800">{o.clientes ? `${o.clientes.nombre} ${o.clientes.apellido}` : 'POR ASIGNAR'}</td>
                        <td className="px-4 py-3 text-slate-600">{o.agentes?.nombre_completo || '---'}</td>
                        <td className="px-4 py-3">
                          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase">{o.categoria_demanda}</span>
                        </td>
                        <td className="px-4 py-3">
                          {o.hora_resuelto ? 
                            <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold">Resuelto {o.hora_resuelto}</span> :
                            o.comentario_cancelacion ? 
                            <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded text-[10px] font-bold">Cancelado</span> :
                            <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-[10px] font-bold">En curso</span>
                          }
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan="7" className="px-4 py-8 text-center text-slate-500">No hay registros OATC para esta vista.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthWrapper>
  );
}
