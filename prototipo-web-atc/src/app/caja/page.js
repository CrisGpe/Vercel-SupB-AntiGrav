'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Swal from 'sweetalert2';
import Navbar from '@/components/Navbar';

export default function CajaDashboard() {
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Data states
  const [pendingOatcs, setPendingOatcs] = useState([]);
  const [pendingRetail, setPendingRetail] = useState([]);

  // Selection states (IDs of selected items)
  const [selectedItems, setSelectedItems] = useState([]); // array of objects { type: 'oatc' | 'retail', id: string, item: object }

  // Checkout states
  const [paymentMethod, setPaymentMethod] = useState('Efectivo');
  const [discount, setDiscount] = useState(0);

  useEffect(() => {
    setMounted(true);
    const user = localStorage.getItem('currentUser');
    if (!user) {
      router.push('/login');
    } else {
      setIsAuthorized(true);
    }
  }, [router]);

  useEffect(() => {
    if (!isAuthorized) return;
    fetchPendingAccounts();
  }, [isAuthorized]);

  const fetchPendingAccounts = async () => {
    setLoading(true);
    try {
      const fechaLima = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
      const startOfDay = `${fechaLima}T00:00:00-05:00`;
      
      const [ { data: oatcs }, { data: retails } ] = await Promise.all([
        supabase.from('oatc').select('*, agentes(nombre_completo, apodo), clientes(nombre, apellido)').not('resuelto_at', 'is', null).eq('estado_caja', 'Pendiente').order('resuelto_at', { ascending: true }),
        supabase.from('ventas_retail').select('*, agentes(nombre_completo, apodo), clientes(nombre, apellido), ventas_retail_items(*, catalogo(nombre))').eq('estado', 'Pendiente de Pago').order('fecha', { ascending: true })
      ]);

      setPendingOatcs(oatcs || []);
      setPendingRetail(retails || []);
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'No se pudieron cargar las cuentas por cobrar.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (type, item) => {
    const existingIndex = selectedItems.findIndex(i => i.type === type && i.id === item.id);
    if (existingIndex >= 0) {
      setSelectedItems(prev => prev.filter((_, idx) => idx !== existingIndex));
    } else {
      // For OATC, we need a price to sum. Let's add a default property if not exists.
      const newItem = { ...item };
      if (type === 'oatc' && !newItem.precio_final) {
        newItem.precio_final = 0; // Default until cashier edits it
      }
      setSelectedItems(prev => [...prev, { type, id: item.id, item: newItem }]);
    }
  };

  const updateItemPrice = (type, id, newPrice) => {
    setSelectedItems(prev => prev.map(i => {
      if (i.type === type && i.id === id) {
        return { ...i, item: { ...i.item, precio_final: parseFloat(newPrice) || 0 } };
      }
      return i;
    }));
  };

  const calculateSubtotal = () => {
    return selectedItems.reduce((acc, curr) => {
      if (curr.type === 'oatc') return acc + (curr.item.precio_final || 0);
      if (curr.type === 'retail') return acc + (curr.item.monto_total || 0);
      return acc;
    }, 0);
  };

  const subtotal = calculateSubtotal();
  const total = Math.max(0, subtotal - discount);

  const handleCobrar = async () => {
    if (selectedItems.length === 0) return;

    // Validation: Ensure all OATCs have a price set > 0
    const invalidOatcs = selectedItems.filter(i => i.type === 'oatc' && (!i.item.precio_final || i.item.precio_final <= 0));
    if (invalidOatcs.length > 0) {
      Swal.fire('Atención', 'Hay servicios (OATC) sin precio asignado. Por favor, edita los precios antes de cobrar.', 'warning');
      return;
    }

    const confirm = await Swal.fire({
      title: '¿Confirmar Cobranza?',
      text: `Total a cobrar: S/ ${total.toFixed(2)} en ${paymentMethod}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Sí, cobrar'
    });

    if (!confirm.isConfirmed) return;

    try {
      const ticketId = 'TKT-' + Date.now().toString().slice(-6);
      const nowIso = new Date().toISOString();

      // We process each selected item
      for (const sel of selectedItems) {
        if (sel.type === 'oatc') {
          // Insert into ventas_caja
          await supabase.from('ventas_caja').insert({
            ticket_id: ticketId,
            oatc_id: sel.item.id,
            cliente_id: sel.item.cliente_id,
            agente_id: sel.item.agente_id,
            servicio_final: sel.item.tipo_oatc,
            servicio_categoria: sel.item.categoria_demanda,
            monto_final: sel.item.precio_final,
            estado: 'Pagado',
            boleta: paymentMethod // Usamos la columna boleta para guardar el método de pago por ahora, o podríamos agregar metodo_pago
          });
          // Mark OATC as cobrado
          await supabase.from('oatc').update({ estado_caja: 'Cobrado' }).eq('id', sel.item.id);
        } else if (sel.type === 'retail') {
          // It's a retail cart. Update its status.
          await supabase.from('ventas_retail').update({ estado: 'Pagado', ticket_id: ticketId }).eq('id', sel.item.id);
        }
      }

      Swal.fire('¡Cobro Exitoso!', `Ticket ${ticketId} generado.`, 'success');
      setSelectedItems([]);
      setDiscount(0);
      fetchPendingAccounts();

    } catch (e) {
      console.error(e);
      Swal.fire('Error', 'Hubo un error al procesar el cobro', 'error');
    }
  };

  if (!mounted || !isAuthorized) return null;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      <Navbar currentModule="Caja" />
      
      <main className="flex-1 p-4 max-w-[1600px] w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* PANEL IZQUIERDO: Cuentas por Cobrar */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-4">
          
          <div className="bg-white rounded shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-amber-500 text-white px-4 py-3 border-b border-amber-600 flex justify-between items-center">
              <h2 className="text-lg font-black uppercase tracking-wide flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Cuentas Pendientes (Servicios)
              </h2>
              <span className="bg-white/20 px-2 py-1 rounded text-xs font-bold">{pendingOatcs.length} por cobrar</span>
            </div>
            
            <div className="overflow-x-auto max-h-[300px]">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-600 uppercase font-bold sticky top-0 border-b border-slate-200 shadow-sm z-10 text-[10px]">
                  <tr>
                    <th className="px-4 py-3 w-10 text-center">Sel</th>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Servicio</th>
                    <th className="px-4 py-3">Agente</th>
                    <th className="px-4 py-3">Fin Atención</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan="5" className="px-4 py-8 text-center text-slate-500 font-bold">Cargando...</td></tr>
                  ) : pendingOatcs.length > 0 ? (
                    pendingOatcs.map(o => {
                      const isSelected = selectedItems.some(i => i.type === 'oatc' && i.id === o.id);
                      return (
                        <tr key={o.id} className={`transition-colors cursor-pointer ${isSelected ? 'bg-amber-50' : 'hover:bg-slate-50'}`} onClick={() => toggleSelection('oatc', o)}>
                          <td className="px-4 py-3 text-center">
                            <input type="checkbox" checked={isSelected} readOnly className="w-4 h-4 text-amber-500 rounded focus:ring-amber-500 cursor-pointer pointer-events-none" />
                          </td>
                          <td className="px-4 py-3 font-bold text-slate-800">
                            {o.clientes ? `${o.clientes.nombre} ${o.clientes.apellido}` : 'POR ASIGNAR'}
                          </td>
                          <td className="px-4 py-3 font-bold text-sky-700 uppercase text-xs">{o.tipo_oatc}</td>
                          <td className="px-4 py-3 text-slate-600 text-xs">{o.agentes ? (o.agentes.apodo || o.agentes.nombre_completo) : '--'}</td>
                          <td className="px-4 py-3 text-slate-500 font-mono text-xs">{o.resuelto_at ? new Date(o.resuelto_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr><td colSpan="5" className="px-4 py-8 text-center text-slate-400">No hay servicios pendientes de cobro</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-purple-600 text-white px-4 py-3 border-b border-purple-700 flex justify-between items-center">
              <h2 className="text-lg font-black uppercase tracking-wide flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                Carritos Retail (Productos)
              </h2>
              <span className="bg-white/20 px-2 py-1 rounded text-xs font-bold">{pendingRetail.length} carritos</span>
            </div>
            
            <div className="overflow-x-auto max-h-[300px]">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-600 uppercase font-bold sticky top-0 border-b border-slate-200 shadow-sm z-10 text-[10px]">
                  <tr>
                    <th className="px-4 py-3 w-10 text-center">Sel</th>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Items</th>
                    <th className="px-4 py-3">Agente Vendedor</th>
                    <th className="px-4 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan="5" className="px-4 py-8 text-center text-slate-500 font-bold">Cargando...</td></tr>
                  ) : pendingRetail.length > 0 ? (
                    pendingRetail.map(r => {
                      const isSelected = selectedItems.some(i => i.type === 'retail' && i.id === r.id);
                      return (
                        <tr key={r.id} className={`transition-colors cursor-pointer ${isSelected ? 'bg-purple-50' : 'hover:bg-slate-50'}`} onClick={() => toggleSelection('retail', r)}>
                          <td className="px-4 py-3 text-center">
                            <input type="checkbox" checked={isSelected} readOnly className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 cursor-pointer pointer-events-none" />
                          </td>
                          <td className="px-4 py-3 font-bold text-slate-800">
                            {r.clientes ? `${r.clientes.nombre} ${r.clientes.apellido}` : 'MOSTRADOR'}
                          </td>
                          <td className="px-4 py-3 text-slate-600 text-xs">
                            {r.ventas_retail_items?.length || 0} prod(s)
                          </td>
                          <td className="px-4 py-3 text-slate-600 text-xs">{r.agentes ? (r.agentes.apodo || r.agentes.nombre_completo) : '--'}</td>
                          <td className="px-4 py-3 text-right font-black text-purple-700">S/ {(r.monto_total || 0).toFixed(2)}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr><td colSpan="5" className="px-4 py-8 text-center text-slate-400">No hay carritos pendientes de cobro</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* PANEL DERECHO: Caja / Checkout */}
        <div className="lg:col-span-5 xl:col-span-4">
          <div className="bg-slate-800 text-white rounded-xl shadow-xl overflow-hidden sticky top-4 border border-slate-700 flex flex-col h-[calc(100vh-2rem)]">
            <div className="px-5 py-4 border-b border-slate-700 bg-slate-900 flex justify-between items-center">
              <h2 className="text-xl font-black tracking-widest uppercase">Punto de Cobro</h2>
              <span className="text-xs bg-slate-700 px-2 py-1 rounded text-slate-300 font-bold">{selectedItems.length} ítems</span>
            </div>

            <div className="flex-1 p-5 overflow-y-auto bg-slate-800 flex flex-col gap-3">
              {selectedItems.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 opacity-50">
                  <svg className="w-16 h-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                  <p className="font-bold text-center">Selecciona órdenes en el panel<br/>izquierdo para agruparlas</p>
                </div>
              ) : (
                selectedItems.map((sel, index) => (
                  <div key={`${sel.type}-${sel.id}`} className="bg-slate-700/50 border border-slate-600 rounded-lg p-3 relative group">
                    <button onClick={() => toggleSelection(sel.type, sel.item)} className="absolute -top-2 -right-2 bg-slate-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                    
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-black uppercase mb-1 ${sel.type === 'oatc' ? 'bg-amber-500 text-amber-950' : 'bg-purple-500 text-purple-100'}`}>
                          {sel.type === 'oatc' ? 'SERVICIO' : 'RETAIL'}
                        </span>
                        <div className="font-bold text-sm leading-tight text-slate-200">
                          {sel.type === 'oatc' ? sel.item.tipo_oatc : 'Cesta de Productos'}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 uppercase">
                          Cliente: {sel.item.clientes ? `${sel.item.clientes.nombre} ${sel.item.clientes.apellido}` : (sel.type === 'oatc' ? 'POR ASIGNAR' : 'MOSTRADOR')}
                        </div>
                        <div className="text-[10px] text-slate-400 uppercase">
                          Agente: {sel.item.agentes ? (sel.item.agentes.apodo || sel.item.agentes.nombre_completo) : '--'}
                        </div>
                      </div>
                      
                      <div className="text-right">
                        {sel.type === 'oatc' ? (
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-[10px] text-slate-400 font-bold uppercase">Monto S/</span>
                            <input 
                              type="number" 
                              step="0.01" 
                              value={sel.item.precio_final === 0 ? '' : sel.item.precio_final} 
                              onChange={(e) => updateItemPrice(sel.type, sel.item.id, e.target.value)}
                              placeholder="0.00"
                              className="w-20 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-right text-sm font-black text-amber-400 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        ) : (
                          <div className="font-black text-purple-400 text-lg">S/ {sel.item.monto_total?.toFixed(2)}</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="bg-slate-900 p-5 border-t border-slate-700">
              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-slate-400 text-sm font-bold">
                  <span>Subtotal</span>
                  <span>S/ {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-400 text-sm font-bold">
                  <span>Descuento Manual</span>
                  <div className="flex items-center gap-1">
                    <span>- S/</span>
                    <input 
                      type="number" 
                      min="0" 
                      step="0.01" 
                      value={discount === 0 ? '' : discount}
                      onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-16 bg-slate-800 border border-slate-600 rounded px-1 py-0.5 text-right text-slate-200 outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
                <div className="flex justify-between items-end border-t border-slate-700 pt-3">
                  <span className="text-slate-300 font-black uppercase tracking-wide">Total a Pagar</span>
                  <span className="text-4xl font-black text-emerald-400 tracking-tighter">S/ {total.toFixed(2)}</span>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Método de Pago</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Efectivo', 'Tarjeta', 'Yape', 'Plin'].map(m => (
                    <button 
                      key={m} 
                      onClick={() => setPaymentMethod(m)}
                      className={`py-2 px-2 text-xs font-bold rounded-lg transition-colors border ${paymentMethod === m ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-slate-200'}`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                onClick={handleCobrar}
                disabled={selectedItems.length === 0}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl font-black text-lg shadow-lg uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                Generar Cobranza
              </button>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
