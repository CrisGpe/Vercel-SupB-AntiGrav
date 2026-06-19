export default function TablaAtencion({ oatcs, handleResolverOATC }) {
  return (
    <div className="bg-white rounded shadow-sm border border-slate-200 overflow-hidden lg:col-span-7">
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
                <td className="px-2 py-2 font-bold text-slate-800">{o.correlativo}</td>
                <td className="px-2 py-2 text-slate-500 font-mono">
                  {new Date(o.creado_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                </td>
                <td className="px-2 py-2 font-bold text-slate-800">
                  {o.clientes ? `${o.clientes.nombre} ${o.clientes.apellido}`.toUpperCase() : 'POR ASIGNAR'}
                </td>
                <td className="px-2 py-2">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-sky-100 text-sky-700">
                    {o.categoria_demanda}
                  </span>
                </td>
                <td className="px-2 py-2">
                  <div className="text-slate-600 font-bold">{o.agentes ? (o.agentes.apodo || o.agentes.nombre_completo) : '--'}</div>
                  {o.agentes?.especialidad && <div className="text-[9px] text-slate-400 font-medium uppercase tracking-tight leading-none mt-0.5">{o.agentes.especialidad}</div>}
                </td>
                <td className="px-2 py-2 text-center">
                  <div className="flex justify-center gap-1">
                    <button 
                      onClick={() => handleResolverOATC(o.id, o.agente_id)} 
                      className="px-2 py-1 bg-emerald-500 text-white rounded font-bold text-[10px] hover:bg-emerald-600 transition-colors shadow-sm"
                    >
                      Resolver
                    </button>
                    <button className="px-2 py-1 bg-red-500 text-white rounded font-bold text-[10px] hover:bg-red-600 transition-colors shadow-sm">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr><td colSpan="6" className="text-center py-8 text-slate-400 font-medium">No hay órdenes activas en este momento</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
