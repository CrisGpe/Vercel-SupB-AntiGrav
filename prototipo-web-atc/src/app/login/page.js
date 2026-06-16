'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Swal from 'sweetalert2';

export default function Login() {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // If already logged in, redirect to dashboard
    const user = localStorage.getItem('currentUser');
    if (user) {
      router.push('/');
    }
  }, [router]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!pin.trim()) {
      Swal.fire('Atención', 'Por favor ingresa un PIN.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('password_hash', pin.trim())
        .eq('estado', 'activo');

      if (error) throw error;

      if (!data || data.length === 0) {
        Swal.fire('Error', 'PIN incorrecto o usuario inactivo.', 'error');
        setPin('');
      } else {
        const usuario = data[0];
        localStorage.setItem('currentUser', JSON.stringify({
          id: usuario.id,
          nombre: usuario.nombre,
          rol: usuario.rol
        }));
        
        Swal.fire({
          title: '¡Bienvenido!',
          text: `Hola, ${usuario.nombre}.`,
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        }).then(() => {
          router.push('/');
        });
      }
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Fallo de conexión con el servidor.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900">
          Iniciar Sesión
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Ingresa tu PIN de acceso para continuar
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-slate-200">
          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label htmlFor="pin" className="block text-sm font-medium text-slate-700">
                PIN de Seguridad
              </label>
              <div className="mt-1">
                <input
                  id="pin"
                  name="pin"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-center text-2xl tracking-widest font-mono"
                  placeholder="••••"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Verificando...' : 'Entrar al Dashboard'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
