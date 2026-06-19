import { useState, useEffect } from 'react';
import CascadingServiceSelect from '../CascadingServiceSelect';

export default function PanelOrdenes({ 
  agentesDisponiblesParaOatc, 
  nextOatcNumber, 
  clienteOatc, setClienteOatc, 
  demandaOatc, setDemandaOatc, 
  agenteOatc, setAgenteOatc, 
  atencionOatc, setAtencionOatc, 
  handleAction 
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="bg-white rounded shadow-sm border border-slate-200 flex flex-col lg:col-span-5">
      <div className="bg-slate-800 text-white px-3 py-1.5 flex justify-between items-center rounded-t">
        <h2 className="text-sm font-bold m-0 uppercase tracking-wide">Órdenes de atención</h2>
        <div className="flex gap-3 text-xs font-mono bg-slate-700 px-2 py-0.5 rounded">
          <span>N°: <span className="text-amber-400 font-bold">{nextOatcNumber}</span></span>
          <span className="capitalize">{mounted ? `Fecha: ${new Date().toLocaleDateString('es-PE')}` : 'Fecha: ...'}</span>
        </div>
      </div>
      
      <div className="p-3 flex-1 flex flex-col gap-2">
        <div className="grid grid-cols-12 gap-2">
          <div className="col-span-8">
            <label htmlFor="clienteOatc" className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Clientes</label>
            <input 
              id="clienteOatc" name="clienteOatc"
              value={clienteOatc}
              onChange={(e) => setClienteOatc(e.target.value)}
              className="w-full px-2 py-1.5 rounded border border-slate-300 outline-none text-sm"
              placeholder="Clientes"
            />
          </div>
          <div className="col-span-4">
            <label htmlFor="demandaOatc" className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tipo de demanda</label>
            <select 
              id="demandaOatc" name="demandaOatc"
              value={demandaOatc}
              onChange={(e) => setDemandaOatc(e.target.value)}
              className="w-full px-2 py-1.5 rounded border border-slate-300 outline-none text-sm bg-white"
            >
              <option value="">Seleccionar...</option>
              <option value="turno">Turno</option>
              <option value="cliente">Cliente</option>
              <option value="correccion">Corrección</option>
              <option value="turno_nino">Turno niño</option>
              <option value="turno_caballero">Turno caballero</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-2">
          <div>
            <label htmlFor="agenteOatc" className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Agente Disponible</label>
            <select 
              id="agenteOatc" name="agenteOatc"
              value={agenteOatc}
              onChange={(e) => setAgenteOatc(e.target.value)}
              className="w-full px-2 py-1.5 rounded border border-slate-300 focus:border-indigo-500 outline-none text-sm"
            >
              <option value="">Seleccionar agente...</option>
              {agentesDisponiblesParaOatc.map(a => <option key={a.id} value={a.apodo || a.nombre_completo}>{a.apodo || a.nombre_completo}</option>)}
            </select>
          </div>
          <div className="relative">
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tipo de atención (Servicio)</label>
            <CascadingServiceSelect 
              value={atencionOatc}
              onSelectValue={(val) => setAtencionOatc(val)} 
              onClear={() => setAtencionOatc('')} 
            />
          </div>
        </div>

        <div className="mt-auto grid grid-cols-4 gap-1.5 pt-2">
          <button onClick={() => handleAction('Registrar OATC')} className="py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded font-bold text-xs shadow-sm">Registrar Orden</button>
          <button onClick={() => handleAction('Registrar Cita')} className="py-2 bg-slate-100 border border-slate-300 text-slate-800 hover:bg-slate-200 rounded font-bold text-xs shadow-sm">Registrar Cita</button>
          <button onClick={() => handleAction('Registrar Cliente')} className="py-2 bg-amber-400 text-amber-950 hover:bg-amber-500 rounded font-bold text-xs shadow-sm">Registrar Cliente</button>
          <button onClick={() => handleAction('Venta de Producto')} className="py-2 bg-purple-600 text-white hover:bg-purple-700 rounded font-bold text-xs shadow-sm">Venta Producto</button>
        </div>
      </div>
    </div>
  );
}
