'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Swal from 'sweetalert2';
import AuthWrapper from '@/components/AuthWrapper';

export default function CatalogoPage() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Form State
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  
  const [formData, setFormData] = useState({
    sku: '',
    codigo_barras: '',
    nombre: '',
    marca: '',
    linea: '',
    categoria: '',
    presentacion: '',
    stock_actual: 0,
    stock_minimo: 0,
    costo_compra: 0,
    precio_venta: 0,
    precio_venta_minimo: 0,
    tags: '',
    estado: 'Activo'
  });

  useEffect(() => {
    fetchProductos();
  }, []);

  const fetchProductos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('catalogo')
      .select('*')
      .order('creado_at', { ascending: false });
    
    if (error) {
      console.error(error);
      Swal.fire('Error', 'No se pudo cargar el catálogo', 'error');
    } else {
      setProductos(data || []);
    }
    setLoading(false);
  };

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

  const openNewModal = () => {
    setEditId(null);
    setFormData({
      sku: '', codigo_barras: '', nombre: '', marca: '', linea: '', 
      categoria: '', presentacion: '', stock_actual: 0, stock_minimo: 0, 
      costo_compra: 0, precio_venta: 0, precio_venta_minimo: 0, 
      tags: '', estado: 'Activo'
    });
    setShowModal(true);
  };

  const openEditModal = (p) => {
    setEditId(p.id);
    setFormData({
      ...p,
      tags: p.tags ? p.tags.join(', ') : ''
    });
    setShowModal(true);
  };

  const saveProducto = async (e) => {
    e.preventDefault();
    if (!formData.nombre || !formData.precio_venta) {
      Swal.fire('Atención', 'Nombre y Precio de Venta son obligatorios', 'warning');
      return;
    }

    if (formData.precio_venta_minimo > formData.precio_venta) {
      Swal.fire('Atención', 'El precio de venta mínimo no puede ser mayor al precio de venta', 'warning');
      return;
    }
    
    if (formData.precio_venta_minimo < formData.costo_compra) {
      const confirm = await Swal.fire({
        title: 'Alerta de Rentabilidad',
        text: 'El precio mínimo de venta está por debajo del costo de compra. ¿Deseas continuar?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#eab308',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Sí, guardar'
      });
      if (!confirm.isConfirmed) return;
    }

    // Process tags
    const tagsArray = formData.tags
      .split(',')
      .map(t => t.trim().toLowerCase())
      .filter(t => t.length > 0);

    const payload = {
      ...formData,
      tags: tagsArray,
      actualizado_at: new Date().toISOString()
    };

    try {
      if (editId) {
        const { error } = await supabase.from('catalogo').update(payload).eq('id', editId);
        if (error) throw error;
        Swal.fire('Éxito', 'Producto actualizado', 'success');
      } else {
        const { error } = await supabase.from('catalogo').insert([payload]);
        if (error) throw error;
        Swal.fire('Éxito', 'Producto registrado', 'success');
      }
      setShowModal(false);
      fetchProductos();
    } catch (err) {
      Swal.fire('Error', err.message, 'error');
    }
  };

  const deleteProducto = async (id) => {
    const confirm = await Swal.fire({
      title: '¿Eliminar producto?',
      text: "Esta acción no se puede deshacer.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Sí, eliminar'
    });

    if (confirm.isConfirmed) {
      const { error } = await supabase.from('catalogo').delete().eq('id', id);
      if (error) {
        Swal.fire('Error', error.message, 'error');
      } else {
        Swal.fire('Eliminado', 'Producto borrado exitosamente.', 'success');
        fetchProductos();
      }
    }
  };

  const filtered = productos.filter(p => {
    const term = search.toLowerCase();
    const matchName = p.nombre.toLowerCase().includes(term);
    const matchSku = p.sku?.toLowerCase().includes(term);
    const matchMarca = p.marca?.toLowerCase().includes(term);
    const matchTags = p.tags?.some(t => t.includes(term));
    return matchName || matchSku || matchMarca || matchTags;
  });

  return (
    <AuthWrapper>
      <div className="flex-1 p-6 max-w-screen-2xl mx-auto w-full flex flex-col h-full">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
          
          {/* Header */}
          <div className="px-6 py-4 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #4f46e5, #9333ea)' }}>
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-bold text-white tracking-wider flex items-center gap-2">
                <svg className="w-6 h-6 text-purple-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                CATÁLOGO Y RETAIL
              </h3>
            </div>
            <button onClick={openNewModal} className="px-4 py-2 bg-white text-purple-700 hover:bg-slate-50 rounded-lg font-bold text-sm shadow-sm transition-colors flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Nuevo Producto
            </button>
          </div>

          {/* Tools & Search */}
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row items-center gap-4 justify-between">
            <div className="relative w-full md:w-96">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
              <input 
                type="text" 
                placeholder="Buscar por nombre, SKU, marca o #tag..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
              />
            </div>
            <div className="text-sm text-slate-500 font-medium">
              Mostrando {filtered.length} productos
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto bg-white p-6">
            {loading ? (
              <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div></div>
            ) : (
              <div className="border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 bg-slate-50 uppercase font-bold tracking-wider">
                    <tr>
                      <th className="px-4 py-3 border-b">SKU</th>
                      <th className="px-4 py-3 border-b">Producto</th>
                      <th className="px-4 py-3 border-b">Marca / Línea</th>
                      <th className="px-4 py-3 border-b text-center">Stock</th>
                      <th className="px-4 py-3 border-b text-right">Precio Venta</th>
                      <th className="px-4 py-3 border-b text-right">Mínimo</th>
                      <th className="px-4 py-3 border-b text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.length > 0 ? filtered.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-mono text-slate-500 text-xs">{p.sku || '---'}</td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-800">{p.nombre}</div>
                          <div className="text-xs text-slate-500">{p.presentacion || '---'}</div>
                          {p.tags && p.tags.length > 0 && (
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {p.tags.map(t => <span key={t} className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-[9px] font-bold uppercase">#{t}</span>)}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          <div className="font-bold">{p.marca || '---'}</div>
                          <div className="text-xs">{p.linea || '---'}</div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded font-bold ${p.stock_actual <= p.stock_minimo ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}`}>
                            {p.stock_actual}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">S/ {p.precio_venta.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-500 text-xs">S/ {p.precio_venta_minimo.toFixed(2)}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex justify-center gap-2">
                            <button onClick={() => openEditModal(p)} className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors" title="Editar">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            </button>
                            <button onClick={() => deleteProducto(p.id)} className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors" title="Eliminar">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="7" className="px-4 py-12 text-center text-slate-500">
                          <div className="flex flex-col items-center gap-2">
                            <svg className="w-12 h-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                            <p>No se encontraron productos en el catálogo.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Form Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-purple-50">
              <h3 className="text-lg font-bold text-purple-900">{editId ? 'Editar Producto' : 'Nuevo Producto'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <form id="catalogoForm" onSubmit={saveProducto} className="space-y-6">
                
                {/* Identificación */}
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 border-b pb-1">1. Identificación y Clasificación</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-600 mb-1">Nombre del Producto *</label>
                      <input required name="nombre" value={formData.nombre} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none" placeholder="Ej. Bain Densité Shampoo" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">SKU (Código Interno)</label>
                      <input name="sku" value={formData.sku} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none font-mono" placeholder="Ej. KER-SH-001" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Código de Barras</label>
                      <input name="codigo_barras" value={formData.codigo_barras} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none font-mono" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Marca</label>
                      <input name="marca" value={formData.marca} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none" placeholder="Ej. Kerastase" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Línea</label>
                      <input name="linea" value={formData.linea} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none" placeholder="Ej. Densifique" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Categoría</label>
                      <input name="categoria" value={formData.categoria} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none" placeholder="Ej. Shampoo" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Presentación</label>
                      <input name="presentacion" value={formData.presentacion} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none" placeholder="Ej. 250ml" />
                    </div>
                  </div>
                </div>

                {/* Inventario */}
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 border-b pb-1">2. Inventario (WMS)</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Stock Actual</label>
                      <input type="number" min="0" name="stock_actual" value={formData.stock_actual} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Stock Mínimo (Alerta)</label>
                      <input type="number" min="0" name="stock_minimo" value={formData.stock_minimo} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Stock Máximo</label>
                      <input type="number" min="0" name="stock_maximo" value={formData.stock_maximo} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
                    </div>
                  </div>
                </div>

                {/* Finanzas y Metadata */}
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 border-b pb-1">3. Finanzas y Metadata (ERP)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Costo Compra (S/)</label>
                      <input type="number" min="0" step="0.01" name="costo_compra" value={formData.costo_compra} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Precio Venta (S/) *</label>
                      <input type="number" min="0" step="0.01" required name="precio_venta" value={formData.precio_venta} onChange={handleInputChange} className="w-full px-3 py-2 border border-emerald-300 bg-emerald-50 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-emerald-800" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1" title="Límite máximo de descuento permitido">Precio Venta Mín. (S/)</label>
                      <input type="number" min="0" step="0.01" name="precio_venta_minimo" value={formData.precio_venta_minimo} onChange={handleInputChange} className="w-full px-3 py-2 border border-amber-300 bg-amber-50 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none font-bold text-amber-800" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Tags (separados por coma)</label>
                    <input name="tags" value={formData.tags} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none" placeholder="Ej. anticaspa, cabello graso, verano" />
                    <p className="text-[10px] text-slate-400 mt-1">Estos tags permitirán buscar y recomendar productos fácilmente (cross-selling).</p>
                  </div>
                </div>
              </form>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-bold transition-colors">Cancelar</button>
              <button type="submit" form="catalogoForm" className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-bold shadow-sm transition-colors">Guardar Producto</button>
            </div>
          </div>
        </div>
      )}
    </AuthWrapper>
  );
}
