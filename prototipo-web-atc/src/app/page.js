'use client';
import { useRecepcion } from '@/hooks/useRecepcion';
import PanelIngreso from '@/components/recepcion/PanelIngreso';
import PanelOrdenes from '@/components/recepcion/PanelOrdenes';
import TablaDisponibilidad from '@/components/recepcion/TablaDisponibilidad';
import TablaAtencion from '@/components/recepcion/TablaAtencion';
import ModalAgente from '@/components/recepcion/ModalAgente';

export default function RecepcionDashboard() {
  const {
    agentes, asistencias, oatcs, loading, nextOatcNumber,
    agenteAsistencia, setAgenteAsistencia,
    clienteOatc, setClienteOatc,
    demandaOatc, setDemandaOatc,
    agenteOatc, setAgenteOatc,
    atencionOatc, setAtencionOatc,
    selectedAgentData, showAgentModal, setShowAgentModal,
    handleAction, handleResolverOATC, handleComenzarAtencion, handleDeleteOATC, openAgentModal
  } = useRecepcion();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500"></div>
      </div>
    );
  }

  // Derived filtered state for the OATC creation
  const agentesDisponiblesParaOatc = agentes.filter(a => {
    const asis = asistencias.find(as => as.agente_id === a.id);
    return asis && asis.estado_texto !== 'Ausente';
  });

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 p-2 font-sans">
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-2 max-w-[1600px] mx-auto">
        
        {/* PANEL: CONTROL DE INGRESO */}
        <PanelIngreso 
          agentes={agentes}
          agenteAsistencia={agenteAsistencia}
          setAgenteAsistencia={setAgenteAsistencia}
          handleAction={handleAction}
        />

        {/* PANEL: ÓRDENES DE ATENCIÓN */}
        <PanelOrdenes 
          agentesDisponiblesParaOatc={agentesDisponiblesParaOatc}
          nextOatcNumber={nextOatcNumber}
          clienteOatc={clienteOatc} setClienteOatc={setClienteOatc}
          demandaOatc={demandaOatc} setDemandaOatc={setDemandaOatc}
          agenteOatc={agenteOatc} setAgenteOatc={setAgenteOatc}
          atencionOatc={atencionOatc} setAtencionOatc={setAtencionOatc}
          handleAction={handleAction}
        />

        {/* PANEL: AGENTES */}
        <div className="bg-white rounded shadow-sm border border-slate-200 overflow-hidden lg:col-span-5 h-full flex flex-col">
          <div className="bg-slate-800 text-white px-3 py-1.5 border-b border-slate-200">
            <h2 className="text-sm font-bold m-0 uppercase tracking-wide">Disponibilidad y Turnos</h2>
          </div>
          <div className="flex-1 overflow-x-auto">
            <TablaDisponibilidad 
              asistencias={asistencias} 
              agentes={agentes} 
              oatcs={oatcs.filter(o => o.resuelto_at !== null)} 
              openAgentModal={openAgentModal}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 mt-2">
        {/* TABLA: LISTADO DE ATENCIÓN */}
        <TablaAtencion 
          oatcs={oatcs.filter(o => o.resuelto_at === null)}
          asistencias={asistencias}
          handleResolverOATC={handleResolverOATC}
          handleComenzarAtencion={handleComenzarAtencion}
          handleDeleteOATC={handleDeleteOATC}
        />

      </div>

      {/* MODAL DETALLE DE AGENTE */}
      <ModalAgente 
        showAgentModal={showAgentModal}
        setShowAgentModal={setShowAgentModal}
        selectedAgentData={selectedAgentData}
      />
    </div>
  );
}
