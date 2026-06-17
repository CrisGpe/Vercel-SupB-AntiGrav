import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Swal from 'sweetalert2';

export default function POSModal({ oatc, onClose, onSaleComplete }) {
  const [catalogo, setCatalogo] = useState([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);

  // Focus ref for search
  const searchInputRef = useRef(null);

  useEffect(() => {
    const fetchCatalogo = async () => {
      setLoading(true);
      const { data, error } = await supabase.from('catalogo').select('*').eq('estado', 'Activo');
      if (data) setCatalogo(data);
      setLoading(false);
      // focus input
      if (searchInputRef.current) searchInputRef.current.focus();
    };
    fetchCatalogo();
  }, []);

  const filteredCatalogo = catalogo.filter(p => {
    if (!search) return false;
    const term = search.toLowerCase();
    const matchName = p.nombre.toLowerCase().includes(term);
    const matchSku = p.sku?.toLowerCase().includes(term);
    const matchMarca = p.marca?.toLowerCase().includes(term);
    const matchTags = p.tags?.some(t => t.includes(term));
    return matchName || matchSku || matchMarca || matchTags;
  });

  const addToCart = (prod) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === prod.id);
      if (existing) {
        return prev.map(item => item.id === prod.id ? { ...item, cantidad: item.cantidad + 1 } : item);
      }
      return [...prev, { ...prod, cantidad: 1, precio_final: prod.precio_venta }];
    });
    setSearch('');
    if (searchInputRef.current) searchInputRef.current.focus();
  };

  const removeFromCart = (id) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const updateQuantity = (id, cant) => {
    if (cant < 1) return;
    setCart(prev => prev.map(item => item.id === id ? { ...item, cantidad: cant } : item));
  };

  const updatePrice = (id, newPrice) => {
    setCart(prev => prev.map(item => item.id === id ? { ...item, precio_final: parseFloat(newPrice) || 0 } : item));
  };

  const procesarVenta = async () => {
    if (cart.length === 0) {
      Swal.fire('Atención', 'El carrito está vacío', 'warning');
      return;
    }

    // Validar precio mínimo
    for (let item of cart) {
      if (item.precio_final < item.precio_venta_minimo) {
        Swal.fire('Alerta de Precio', `El producto ${item.nombre} tiene un precio menor a su límite mínimo permitido (S/ ${item.precio_venta_minimo}).`, 'error');
        return;
      }
      if (item.cantidad > item.stock_actual) {
        const confirm = await Swal.fire({
          title: 'Stock Insuficiente',
          text: `Estás vendiendo ${item.cantidad} de ${item.nombre}, pero solo hay ${item.stock_actual} en sistema. ¿Continuar y dejar stock en negativo?`,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#eab308'
        });
        if (!confirm.isConfirmed) return;
      }
    }

    const total = cart.reduce((acc, item) => acc + (item.precio_final * item.cantidad), 0);
    const ticketId = 'RET-' + Date.now().toString().slice(-6);

    try {
      const { data: venta, error: vErr } = await supabase.from('ventas_retail').insert({
        ticket_id: ticketId,
        oatc_id: oatc.id,
        cliente_id: oatc.cliente_id,
        agente_id: oatc.agente_id,
        monto_total: total
      }).select().single();

      if (vErr) throw vErr;

      const itemsToInsert = cart.map(item => ({
        venta_id: venta.id,
        producto_id: item.id,
        cantidad: item.cantidad,
        precio_unitario: item.precio_venta,
        descuento: item.precio_venta - item.precio_final,
        subtotal: item.precio_final * item.cantidad
      }));

      const { error: iErr } = await supabase.from('ventas_retail_items').insert(itemsToInsert);
      if (iErr) throw iErr;

      // Descontar stock
      for (let item of cart) {
        await supabase.from('catalogo').update({ stock_actual: item.stock_actual - item.cantidad }).eq('id', item.id);
      }

      onSaleComplete(oatc);
      
    } catch (err) {
      Swal.fire('Error', err.message, 'error');
    }
  };

  const totalCart = cart.reduce((acc, item) => acc + (item.precio_final * item.cantidad), 0);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-slate-50 rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #4f46e5, #9333ea)' }}>
          <div className="flex items-center gap-4">
            <h3 className="text-xl font-bold text-white tracking-wider flex items-center gap-2">
              <svg className="w-6 h-6 text-purple-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
              PUNTO DE VENTA (RETAIL)
            </h3>
            <div className="bg-black/20 text-white px-3 py-1 rounded text-xs font-mono font-bold">
              Agente: {oatc.agentes?.nombre_completo || oatc.agentes?.apodo || '---'}
            </div>
            <div className="bg-black/20 text-white px-3 py-1 rounded text-xs font-mono font-bold">
              Cliente: {oatc.clientes ? `${oatc.clientes.nombre} ${oatc.clientes.apellido}` : 'Mostrador'}
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Lado Izquierdo: Buscador y Catálogo */}
          <div className="w-1/2 flex flex-col border-r border-slate-200 bg-white">
            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
                <input 
                  ref={searchInputRef}
                  type="text" 
                  placeholder="Buscar producto por nombre, SKU o #tag..." 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border-2 border-purple-100 focus:border-purple-500 rounded-xl text-sm font-bold text-slate-700 outline-none transition-colors shadow-inner"
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
              {search === '' ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <svg className="w-16 h-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
                  <p className="text-sm font-medium">Usa el buscador o escanea el código de barras</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {filteredCatalogo.map(p => (
                    <button 
                      key={p.id} 
                      onClick={() => addToCart(p)}
                      className="text-left bg-white border border-slate-200 hover:border-purple-400 p-3 rounded-xl shadow-sm hover:shadow-md transition-all flex items-center justify-between group"
                    >
                      <div>
                        <div className="font-bold text-slate-800 text-sm">{p.nombre}</div>
                        <div className="text-xs text-slate-500">{p.presentacion || p.marca || 'Sin detalle'} | SKU: {p.sku || '--'}</div>
                        <div className="text-[10px] mt-1 font-bold">
                          Stock: <span className={p.stock_actual > 0 ? 'text-emerald-600' : 'text-red-500'}>{p.stock_actual}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-black text-lg text-purple-700">S/ {p.precio_venta.toFixed(2)}</div>
                        <div className="text-[10px] text-slate-400 group-hover:text-purple-500 transition-colors">Añadir +</div>
                      </div>
                    </button>
                  ))}
                  {filteredCatalogo.length === 0 && !loading && (
                    <div className="text-center p-8 text-slate-500 text-sm">No se encontraron productos.</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Lado Derecho: Carrito */}
          <div className="w-1/2 flex flex-col bg-white">
            <div className="flex-1 p-4 overflow-y-auto">
              <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 border-b pb-2">Carrito de Compras</h4>
              
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-slate-300">
                  <svg className="w-12 h-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                  <p className="text-sm font-medium">No hay productos seleccionados</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map(item => (
                    <div key={item.id} className="bg-slate-50 border border-slate-200 rounded-lg p-3 relative">
                      <button onClick={() => removeFromCart(item.id)} className="absolute -top-2 -right-2 bg-red-100 text-red-600 hover:bg-red-500 hover:text-white rounded-full p-1 shadow transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                      <div className="flex justify-between items-start mb-2">
                        <div className="pr-6">
                          <div className="font-bold text-sm text-slate-800 leading-tight">{item.nombre}</div>
                          <div className="text-xs text-slate-500">Mínimo: S/ {item.precio_venta_minimo?.toFixed(2)}</div>
                        </div>
                        <div className="text-right whitespace-nowrap">
                          <div className="font-black text-slate-800">S/ {(item.precio_final * item.cantidad).toFixed(2)}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 mt-3">
                        <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg p-1">
                          <button onClick={() => updateQuantity(item.id, item.cantidad - 1)} className="w-6 h-6 flex items-center justify-center bg-slate-100 rounded hover:bg-slate-200 font-bold">-</button>
                          <input type="number" min="1" value={item.cantidad} onChange={e => updateQuantity(item.id, parseInt(e.target.value) || 1)} className="w-10 text-center text-sm font-bold outline-none" />
                          <button onClick={() => updateQuantity(item.id, item.cantidad + 1)} className="w-6 h-6 flex items-center justify-center bg-slate-100 rounded hover:bg-slate-200 font-bold">+</button>
                        </div>
                        <div className="flex-1 flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-400 uppercase">Precio:</span>
                          <input type="number" step="0.01" value={item.precio_final} onChange={e => updatePrice(item.id, e.target.value)} className={`w-24 px-2 py-1 border rounded text-sm font-bold outline-none ${item.precio_final < item.precio_venta_minimo ? 'border-red-400 bg-red-50 text-red-700' : 'border-slate-300 bg-white'}`} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer / Resumen */}
            <div className="bg-slate-100 p-6 border-t border-slate-200">
              <div className="flex justify-between items-end mb-4">
                <div className="text-slate-500 font-bold uppercase text-sm">Total a cobrar</div>
                <div className="text-4xl font-black text-slate-900 tracking-tight">S/ {totalCart.toFixed(2)}</div>
              </div>
              <button 
                onClick={procesarVenta}
                disabled={cart.length === 0}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl font-black text-lg shadow-lg hover:shadow-xl transition-all disabled:shadow-none flex justify-center items-center gap-2"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                COBRAR Y GENERAR TICKET
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
