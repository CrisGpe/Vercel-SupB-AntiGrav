'use client';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Swal from 'sweetalert2';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [time, setTime] = useState(new Date());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
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

  const NavLink = ({ href, children }) => {
    const isActive = pathname === href;
    return (
      <Link href={href} className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
        {children}
      </Link>
    );
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
            
            <div className="hidden md:flex space-x-1 flex-wrap">
              <NavLink href="/">Recepción</NavLink>
              <NavLink href="/caja">Caja</NavLink>
              <NavLink href="/reportes">Reportes</NavLink>
              <NavLink href="/despacho">Despacho de insumos</NavLink>
              <NavLink href="/almacen">Almacén</NavLink>
              <NavLink href="/catalogo">Catálogo</NavLink>
              <NavLink href="/datos">Datos</NavLink>
              <NavLink href="/crm">CRM</NavLink>
              <NavLink href="/agenda">Agenda</NavLink>
              <NavLink href="/agentes">Agentes</NavLink>
            </div>
          </div>

          {/* Clock & Action Buttons */}
          <div className="flex items-center gap-6">
            
            {/* Clock */}
            <div className="hidden lg:flex items-center gap-3 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-full shadow-inner">
              {mounted && <span className="text-emerald-500 font-mono tracking-widest">{formatTime(time)}</span>}
            </div>
            <div className="flex gap-2 text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
              <div className="flex items-center text-slate-400">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </div>
              <div className="w-px h-4 bg-slate-200"></div>
              <span className="capitalize">{mounted ? formatDate(time) : '...'}</span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button onClick={handleLogout} className="flex px-3 py-1.5 bg-slate-200 text-slate-700 hover:bg-slate-300 rounded-lg text-xs font-bold transition-colors ml-2">
                Salir
              </button>
            </div>
          </div>
          
        </div>
      </div>
    </nav>
  );
}
