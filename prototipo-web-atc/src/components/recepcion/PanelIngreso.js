export default function PanelIngreso({ agentes, agenteAsistencia, setAgenteAsistencia, handleAction }) {
  return (
    <div className="bg-white rounded shadow-sm border border-slate-200 flex flex-col lg:col-span-5">
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
            {agentes.map(a => <option key={a.id} value={a.apodo || a.nombre_completo}>{a.apodo || a.nombre_completo}</option>)}
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
  );
}
