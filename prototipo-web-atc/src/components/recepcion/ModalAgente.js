export default function ModalAgente({ showAgentModal, setShowAgentModal, selectedAgentData }) {
  if (!showAgentModal || !selectedAgentData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
        
        {/* Header Modal */}
        <div className="bg-slate-800 px-4 py-3 flex justify-between items-center text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-lg font-bold shadow-inner">
              {(selectedAgentData.apodo || selectedAgentData.nombre_completo || 'A')[0].toUpperCase()}
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">{selectedAgentData.apodo || selectedAgentData.nombre_completo}</h3>
              <p className="text-xs text-slate-300 font-medium">FICHA: {selectedAgentData.ficha_id} | DNI: {selectedAgentData.dni}</p>
            </div>
          </div>
          <button onClick={() => setShowAgentModal(false)} className="text-slate-400 hover:text-white transition-colors bg-slate-700/50 hover:bg-slate-700 rounded-full p-1.5">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Body Modal */}
        <div className="p-5 flex flex-col gap-4">
          
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
              <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Estado Actual</span>
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${selectedAgentData.asistencia?.estado_texto === 'Disponible' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                <span className="font-bold text-slate-700 text-sm">{selectedAgentData.asistencia?.estado_texto || 'Desconocido'}</span>
              </div>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
              <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Última Actividad</span>
              <span className="font-mono font-bold text-slate-700 text-sm">
                {selectedAgentData.asistencia?.ultima_act ? new Date(selectedAgentData.asistencia.ultima_act).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
              </span>
            </div>
          </div>

          <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 mt-1">
            <span className="block text-[10px] font-bold text-indigo-400 uppercase mb-2">Rendimiento del Día</span>
            <div className="grid grid-cols-2 gap-2 text-center divide-x divide-indigo-200">
              <div>
                <span className="block text-2xl font-black text-indigo-700">{selectedAgentData.qClientes}</span>
                <span className="text-[10px] font-bold text-indigo-500 uppercase">Clientes Atendidos</span>
              </div>
              <div>
                <span className="block text-2xl font-black text-indigo-700">{selectedAgentData.qTurnos}</span>
                <span className="text-[10px] font-bold text-indigo-500 uppercase">Turnos Realizados</span>
              </div>
            </div>
          </div>

          <div className="text-xs text-slate-500 space-y-1.5 mt-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
            <div className="flex justify-between border-b border-slate-200 pb-1.5">
              <span className="font-medium">Hora de Entrada:</span>
              <span className="font-mono font-bold text-slate-700">{selectedAgentData.asistencia?.entrada_at ? new Date(selectedAgentData.asistencia.entrada_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-1.5">
              <span className="font-medium">Hora de Salida:</span>
              <span className="font-mono font-bold text-slate-700">{selectedAgentData.asistencia?.salida_at ? new Date(selectedAgentData.asistencia.salida_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-1.5">
              <span className="font-medium">Inicio Refrigerio:</span>
              <span className="font-mono font-bold text-slate-700">{selectedAgentData.asistencia?.ref_inicio_at ? new Date(selectedAgentData.asistencia.ref_inicio_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Fin Refrigerio:</span>
              <span className="font-mono font-bold text-slate-700">{selectedAgentData.asistencia?.ref_termino_at ? new Date(selectedAgentData.asistencia.ref_termino_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
