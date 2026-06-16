'use client';

import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';

export default function Navbar() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDate = (date) => {
    return date.toLocaleDateString('es-PE', { weekday: 'short', day: '2-digit', month: 'short' });
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const handleNavAction = (actionName) => {
    Swal.fire({
      title: 'Módulo en desarrollo',
      text: `El módulo "${actionName}" estará disponible próximamente.`,
      icon: 'info',
      confirmButtonColor: '#4f46e5',
      customClass: { popup: 'rounded-xl' }
    });
  };

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-screen-2xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo & Main Nav */}
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent tracking-tight">
                GLOSS SALON
              </span>
            </div>
            
            <div className="hidden md:flex space-x-1">
              <button className="px-3 py-2 rounded-lg text-sm font-medium bg-slate-100 text-slate-900 transition-colors">
                Recepción
              </button>
              <button className="px-3 py-2 rounded-lg text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors">
                Caja
              </button>
              <button className="px-3 py-2 rounded-lg text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors">
                Reportes
              </button>
            </div>
          </div>

          {/* Clock & Action Buttons */}
          <div className="flex items-center gap-6">
            
            {/* Clock */}
            <div className="hidden lg:flex items-center gap-3 px-4 py-1.5 bg-slate-50 border border-slate-100 rounded-full text-sm font-medium text-slate-600 shadow-inner">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="font-mono tracking-tighter">{formatTime(time)}</span>
              </div>
              <div className="w-px h-4 bg-slate-200"></div>
              <span className="capitalize">{formatDate(time)}</span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button onClick={() => handleNavAction('Datos OATC')} className="hidden sm:flex px-3 py-1.5 bg-slate-600 text-white hover:bg-slate-700 rounded-lg text-xs font-medium transition-colors shadow-sm">
                Datos
              </button>
              <button onClick={() => handleNavAction('Módulo de Fidelización')} className="flex px-3 py-1.5 bg-rose-500 text-white hover:bg-rose-600 rounded-lg text-xs font-medium transition-colors shadow-sm shadow-rose-500/20">
                Fidelización
              </button>
              <button onClick={() => handleNavAction('Agenda del Día')} className="flex px-3 py-1.5 bg-indigo-500 text-white hover:bg-indigo-600 rounded-lg text-xs font-medium transition-colors shadow-sm shadow-indigo-500/20">
                Agenda
              </button>
              <button onClick={() => handleNavAction('Gestión de Agentes')} className="hidden sm:flex px-3 py-1.5 bg-sky-500 text-white hover:bg-sky-600 rounded-lg text-xs font-medium transition-colors shadow-sm shadow-sky-500/20">
                Agentes
              </button>
            </div>
          </div>
          
        </div>
      </div>
    </nav>
  );
}
