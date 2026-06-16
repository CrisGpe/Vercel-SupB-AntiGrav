'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Swal from 'sweetalert2';

export default function FidelizacionModal({ isOpen, onClose }) {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroCampana, setFiltroCampana] = useState('Todas');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (isOpen) fetchClientes(filtroCampana);
  }, [isOpen, filtroCampana]);

  const fetchClientes = async (campana) => {
    setLoading(true);
    let query = supabase.from('clientes').select('id, dni, nombre, apellido, celular, oatc(creado_at), camp_tratamientos(tipo)');
    
    const { data, error } = await query;
    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    // Procesar datos para la tabla
    let processed = data.map(c => {
      const campanas = c.camp_tratamientos.map(ct => ct.tipo);
      const esCampana = campanas.length > 0;
      
      // Obtener última fecha OATC
      let ultimaFecha = '---';
      if (c.oatc && c.oatc.length > 0) {
        const sorted = c.oatc.sort((a, b) => new Date(b.creado_at) - new Date(a.creado_at));
        ultimaFecha = new Date(sorted[0].creado_at).toLocaleDateString('es-PE');
      }

      return {
        ...c,
        nombre_completo: `${c.nombre} ${c.apellido}`,
        ultimaFecha,
        esCampana,
        campanas
      };
    });

    if (campana !== 'Todas') {
      processed = processed.filter(c => c.campanas.includes(campana));
    }

    setClientes(processed);
    setLoading(false);
  };

  const filteredClientes = clientes.filter(c => 
    c.nombre_completo.toLowerCase().includes(search.toLowerCase()) || 
    (c.dni && c.dni.includes(search)) || 
    (c.celular && c.celular.includes(search))
  );

  const verHistorial = async (cliente) => {
    Swal.fire({
      title: 'Cargando historial...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    const { data: historial } = await supabase.from('oatc').select('id, creado_at, categoria_demanda, agentes(nombre_completo)').eq('cliente_id', cliente.id).order('creado_at', { ascending: false });
    
    if (!historial || historial.length === 0) {
      Swal.fire('Historial', 'Sin atenciones registradas.', 'info');
      return;
    }

    const html = `
      <div class="text-left max-h-60 overflow-auto text-sm">
        <table class="w-full text-left border-collapse">
          <thead><tr class="bg-slate-100"><th class="p-2 border">Fecha</th><th class="p-2 border">Servicio</th><th class="p-2 border">Agente</th></tr></thead>
          <tbody>
            ${historial.map(h => `<tr><td class="p-2 border">${h.creado_at ? new Date(h.creado_at).toLocaleDateString('es-PE') : '--'}</td><td class="p-2 border uppercase">${h.categoria_demanda}</td><td class="p-2 border">${h.agentes?.nombre_completo}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
    `;

    Swal.fire({
      title: `Historial de ${cliente.nombre_completo}`,
      html: html,
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: 'Campaña Células Madre',
      denyButtonText: 'Campaña Kerastase',
      cancelButtonText: 'Cerrar',
      confirmButtonColor: '#10b981', // emerald-500
      denyButtonColor: '#0ea5e9', // sky-500
      width: '600px'
    }).then(async (result) => {
      if (result.isConfirmed || result.isDenied) {
        const tipoCampana = result.isConfirmed ? 'Células Madre' : 'Kerastase';
        const { error } = await supabase.from('camp_tratamientos').insert({
          cliente_id: cliente.id,
          tipo: tipoCampana
        });
        if (error) {
          Swal.fire('Error', error.message, 'error');
        } else {
          Swal.fire('Éxito', `Campaña ${tipoCampana} registrada`, 'success');
          fetchClientes(filtroCampana);
        }
      }
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-6xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #f77062, #fe5196)' }}>
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-bold text-white uppercase tracking-wider"><i className="fas fa-heart text-yellow-300 mr-2"></i> Fidelización de Clientes</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 text-white rounded-full transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Filters */}
        <div className="px-6 py-4 border-b border-slate-100 bg-white flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex rounded-lg shadow-sm">
            <button onClick={() => setFiltroCampana('Todas')} className={`px-4 py-2 text-sm font-bold border border-slate-300 rounded-l-lg ${filtroCampana === 'Todas' ? 'bg-slate-700 text-white border-slate-700' : 'bg-white text-slate-700 hover:bg-slate-50'}`}>Todos</button>
            <button onClick={() => setFiltroCampana('Células Madre')} className={`px-4 py-2 text-sm font-bold border-t border-b border-r border-slate-300 ${filtroCampana === 'Células Madre' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-slate-700 hover:bg-slate-50'}`}>C. Células Madre</button>
            <button onClick={() => setFiltroCampana('Kerastase')} className={`px-4 py-2 text-sm font-bold border-t border-b border-r border-slate-300 rounded-r-lg ${filtroCampana === 'Kerastase' ? 'bg-sky-500 text-white border-sky-500' : 'bg-white text-slate-700 hover:bg-slate-50'}`}>C. Kerastase</button>
          </div>
          <div className="w-full md:w-1/3">
            <input id="searchCliente" name="searchCliente" type="text" placeholder="Buscar por Nombre, DNI o Celular..." value={search} onChange={e => setSearch(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-pink-500 outline-none" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-slate-50 p-6">
          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div></div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-white bg-slate-800 uppercase font-bold tracking-wider">
                  <tr>
                    <th className="px-4 py-3">DNI</th>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Celular</th>
                    <th className="px-4 py-3">Última Atención</th>
                    <th className="px-4 py-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredClientes.length > 0 ? filteredClientes.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-slate-600">{c.dni || '---'}</td>
                      <td className="px-4 py-3 font-bold text-slate-800">{c.nombre_completo}</td>
                      <td className="px-4 py-3 text-slate-600">{c.celular || '---'}</td>
                      <td className="px-4 py-3 text-slate-600">{c.ultimaFecha}</td>
                      <td className="px-4 py-3 text-center">
                        {c.esCampana ? (
                          <span className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded-md text-[10px] font-bold uppercase">En Campaña</span>
                        ) : (
                          <button onClick={() => verHistorial(c)} className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors border border-slate-300 shadow-sm" title="Ver Historial">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          </button>
                        )}
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan="5" className="px-4 py-8 text-center text-slate-500">No se encontraron clientes.</td></tr>
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
