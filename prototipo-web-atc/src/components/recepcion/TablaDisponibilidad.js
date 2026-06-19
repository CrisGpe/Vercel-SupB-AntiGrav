export default function TablaDisponibilidad({ asistencias, agentes, openAgentModal }) {
  return (
    <div className="bg-white rounded shadow-sm border border-slate-200 overflow-hidden lg:col-span-3">
      <div className="bg-slate-800 text-white px-3 py-1.5 border-b border-slate-200">
        <h2 className="text-sm font-bold m-0 uppercase tracking-wide">Disponibilidad y Turnos</h2>
      </div>
      <div className="overflow-x-auto max-h-[400px]">
        <table className="w-full text-left text-xs whitespace-nowrap">
          <thead className="bg-slate-100 text-slate-600 uppercase font-bold sticky top-0 border-b border-slate-200 z-10">
            <tr>
              <th className="px-2 py-2 text-center" title="Atenciones a Clientes">Q Cli</th>
              <th className="px-2 py-2 text-center" title="Atenciones a Turnos">Q Tur</th>
              <th className="px-2 py-2">Agente</th>
              <th className="px-2 py-2">Estado</th>
              <th className="px-2 py-2 text-right">Act.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {[...asistencias]
              .sort((a, b) => {
                const getPrio = (st) => {
                  const s = String(st || '').trim().toLowerCase();
                  if (s === 'disponible') return 1;
                  if (s === 'asesorando') return 2;
                  if (s === 'trabajando' || s === 'vendiendo') return 3;
                  if (s === 'ausente') return 5;
                  return 4;
                };
                const prioA = getPrio(a.estado_texto);
                const prioB = getPrio(b.estado_texto);
                if (prioA !== prioB) return prioA - prioB;
                
                const timeA = new Date(a.ultima_act || 0).getTime();
                const timeB = new Date(b.ultima_act || 0).getTime();
                return timeA - timeB;
              })
              .map(asist => {
              const a = agentes.find(ag => ag.id === asist.agente_id);
              if (!a) return null;
              return (
                <tr key={asist.id} className="hover:bg-indigo-50 transition-colors cursor-pointer group" onClick={() => openAgentModal(a, asist)}>
                  <td className="px-2 py-2 text-center font-mono font-bold text-indigo-600">-</td>
                  <td className="px-2 py-2 text-center font-mono font-bold text-sky-600">-</td>
                  <td className="px-2 py-2 group-hover:text-indigo-600 transition-colors">
                    <div className="font-bold text-slate-800">{a.apodo || a.nombre_completo}</div>
                    {a.especialidad && <div className="text-[9px] text-slate-500 font-medium uppercase tracking-tight leading-none mt-0.5">{a.especialidad}</div>}
                  </td>
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
              <tr><td colSpan="5" className="text-center py-4 text-slate-500">Ningún agente ha ingresado hoy.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
