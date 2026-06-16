'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function AgendaModal({ isOpen, onClose }) {
  const [citas, setCitas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchCitas();
    }
  }, [isOpen]);

  const fetchCitas = async () => {
    setLoading(true);
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
    
    const { data } = await supabase
      .from('registro_citas')
      .select('*, clientes(nombre, apellido), agentes(nombre_completo)')
      .eq('fecha_cita', today)
      .order('hora_cita', { ascending: true });
      
    setCitas(data || []);
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between bg-indigo-600">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-bold text-white tracking-wider"><i className="fas fa-calendar-day text-indigo-200 mr-2"></i> Agenda del Día</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 text-white rounded-full transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-slate-50 p-6">
          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 bg-slate-100 uppercase font-bold tracking-wider">
                  <tr>
                    <th className="px-4 py-3 border-b border-slate-200">Hora</th>
                    <th className="px-4 py-3 border-b border-slate-200">Cliente</th>
                    <th className="px-4 py-3 border-b border-slate-200">Especialista</th>
                    <th className="px-4 py-3 border-b border-slate-200">Servicio</th>
                    <th className="px-4 py-3 border-b border-slate-200 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {citas.length > 0 ? citas.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-indigo-600">{c.hora_cita}</td>
                      <td className="px-4 py-3 font-bold text-slate-800">{c.clientes ? `${c.clientes.nombre} ${c.clientes.apellido}` : '---'}</td>
                      <td className="px-4 py-3 text-slate-600">{c.agentes?.nombre_completo || '---'}</td>
                      <td className="px-4 py-3"><span className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded text-[10px] font-bold uppercase">{c.tipo_servicio}</span></td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${c.estado === 'Confirmada' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                          {c.estado || 'Pendiente'}
                        </span>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan="5" className="px-4 py-12 text-center text-slate-500 font-medium">No hay citas programadas para hoy.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
