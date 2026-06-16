'use client';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import DatosModal from './DatosModal';
import FidelizacionModal from './FidelizacionModal';
import AgendaModal from './AgendaModal';
import AgentesModal from './AgentesModal';
import Swal from 'sweetalert2';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [time, setTime] = useState(new Date());
  
  const [showDatos, setShowDatos] = useState(false);
  const [showFidelizacion, setShowFidelizacion] = useState(false);
  const [showAgenda, setShowAgenda] = useState(false);
  const [showAgentes, setShowAgentes] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (pathname === '/login') {
    return null;
  }

  const formatDate = (date) => {
    return date.toLocaleDateString('es-PE', { weekday: 'short', day: '2-digit', month: 'short' });
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const handleLogout = () => {
    Swal.fire({
      title: '¿Cerrar Sesión?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, salir',
      cancelButtonText: 'Cancelar'
    }).then((res) => {
      if (res.isConfirmed) {
        localStorage.removeItem('currentUser');
        router.push('/login');
      }
    });
  };

  return (
    <>
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
                <button 
                  onClick={() => Swal.fire('Módulo en desarrollo', 'La sección "Caja" estará disponible próximamente.', 'info')}
                  className="px-3 py-2 rounded-lg text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors">
                  Caja
                </button>
                <button 
                  onClick={() => Swal.fire('Módulo en desarrollo', 'La sección "Reportes" estará disponible próximamente.', 'info')}
                  className="px-3 py-2 rounded-lg text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors">
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
                <button onClick={() => setShowDatos(true)} className="hidden sm:flex px-3 py-1.5 bg-slate-600 text-white hover:bg-slate-700 rounded-lg text-xs font-medium transition-colors shadow-sm">
                  Datos
                </button>
                <button onClick={() => setShowFidelizacion(true)} className="flex px-3 py-1.5 bg-rose-500 text-white hover:bg-rose-600 rounded-lg text-xs font-medium transition-colors shadow-sm shadow-rose-500/20">
                  Fidelización
                </button>
                <button onClick={() => setShowAgenda(true)} className="flex px-3 py-1.5 bg-indigo-500 text-white hover:bg-indigo-600 rounded-lg text-xs font-medium transition-colors shadow-sm shadow-indigo-500/20">
                  Agenda
                </button>
                <button onClick={() => setShowAgentes(true)} className="hidden sm:flex px-3 py-1.5 bg-sky-500 text-white hover:bg-sky-600 rounded-lg text-xs font-medium transition-colors shadow-sm shadow-sky-500/20">
                  Agentes
                </button>
                <button onClick={handleLogout} className="flex px-3 py-1.5 bg-slate-200 text-slate-700 hover:bg-slate-300 rounded-lg text-xs font-bold transition-colors ml-2">
                  Salir
                </button>
              </div>
            </div>
            
          </div>
        </div>
      </nav>

      {/* Renderizado de Modales */}
      <DatosModal isOpen={showDatos} onClose={() => setShowDatos(false)} />
      <FidelizacionModal isOpen={showFidelizacion} onClose={() => setShowFidelizacion(false)} />
      <AgendaModal isOpen={showAgenda} onClose={() => setShowAgenda(false)} />
      <AgentesModal isOpen={showAgentes} onClose={() => setShowAgentes(false)} />
    </>
  );
}
