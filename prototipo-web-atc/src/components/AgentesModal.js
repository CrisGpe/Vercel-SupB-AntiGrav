'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Swal from 'sweetalert2';

export default function AgentesModal({ isOpen, onClose }) {
  const [agentes, setAgentes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [editId, setEditId] = useState(null);
  const [nombre, setNombre] = useState('');
  const [apodo, setApodo] = useState('');
  const [estado, setEstado] = useState('Activo');

  useEffect(() => {
    if (isOpen) fetchAgentes();
  }, [isOpen]);

  const fetchAgentes = async () => {
    setLoading(true);
    const { data } = await supabase.from('agentes').select('*').order('nombre_completo');
    setAgentes(data || []);
    setLoading(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!nombre || !apodo) {
      Swal.fire('Atención', 'Complete Nombre y Apodo', 'warning');
      return;
    }

    try {
      if (editId) {
        const { error } = await supabase.from('agentes').update({ nombre_completo: nombre, apodo, estado }).eq('id', editId);
        if (error) throw error;
        Swal.fire('Éxito', 'Agente actualizado', 'success');
      } else {
        const { error } = await supabase.from('agentes').insert({ nombre_completo: nombre, apodo, estado });
        if (error) throw error;
        Swal.fire('Éxito', 'Agente registrado', 'success');
      }
      resetForm();
      fetchAgentes();
    } catch (err) {
      Swal.fire('Error', err.message, 'error');
    }
  };

  const editAgente = (a) => {
    setEditId(a.id);
    setNombre(a.nombre_completo);
    setApodo(a.apodo);
    setEstado(a.estado);
  };

  const resetForm = () => {
    setEditId(null); setNombre(''); setApodo(''); setEstado('Activo');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-sky-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-500 rounded-lg shadow-sm">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 leading-tight">Gestión de Agentes</h3>
              <p className="text-xs text-slate-500 font-medium">Añadir, editar o dar de baja agentes</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 text-slate-500 rounded-full transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6 bg-slate-50 flex gap-6 flex-col md:flex-row">
          {/* Form */}
          <div className="md:w-1/3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm h-fit">
            <h4 className="font-bold text-slate-700 mb-4">{editId ? 'Editar Agente' : 'Nuevo Agente'}</h4>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Nombre Completo</label>
                <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 outline-none" placeholder="Ej. Juan Pérez" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Apodo (Pizarra)</label>
                <input type="text" value={apodo} onChange={e => setApodo(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 outline-none" placeholder="Ej. Juan" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Estado</label>
                <select value={estado} onChange={e => setEstado(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 outline-none">
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                </select>
              </div>
              <div className="pt-2 flex gap-2">
                <button type="submit" className="flex-1 bg-sky-500 hover:bg-sky-600 text-white py-2 rounded-lg text-sm font-bold shadow-sm transition-colors">{editId ? 'Actualizar' : 'Guardar'}</button>
                {editId && <button type="button" onClick={resetForm} className="px-3 bg-slate-200 hover:bg-slate-300 text-slate-700 py-2 rounded-lg text-sm font-bold transition-colors">X</button>}
              </div>
            </form>
          </div>

          {/* Table */}
          <div className="md:w-2/3 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div></div>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 bg-slate-50 uppercase font-bold tracking-wider">
                  <tr>
                    <th className="px-4 py-3 border-b border-slate-200">Nombre</th>
                    <th className="px-4 py-3 border-b border-slate-200">Apodo</th>
                    <th className="px-4 py-3 border-b border-slate-200 text-center">Estado</th>
                    <th className="px-4 py-3 border-b border-slate-200 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {agentes.map(a => (
                    <tr key={a.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800">{a.nombre_completo}</td>
                      <td className="px-4 py-3 text-slate-600 font-mono">{a.apodo}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${a.estado === 'Activo' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                          {a.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => editAgente(a)} className="text-sky-600 hover:text-sky-800 font-bold text-xs underline">Editar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
