'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function CascadingServiceSelect({ onSelectValue, onClear, value }) {
  const [servicios, setServicios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  
  // path will store the chain of selected services by id
  const [selectedPath, setSelectedPath] = useState([]);

  useEffect(() => {
    async function loadServicios() {
      try {
        const { data, error } = await supabase.from('servicios').select('*');
        if (error) throw error;
        setServicios(data || []);
      } catch (err) {
        console.error("Error cargando servicios:", err.message);
      } finally {
        setLoading(false);
      }
    }
    loadServicios();
  }, []);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // When selectedPath changes, we bubble up the deepest selected name
  useEffect(() => {
    if (selectedPath.length > 0) {
      const deepestId = selectedPath[selectedPath.length - 1];
      const selectedSvc = servicios.find(s => s.id === deepestId);
      if (selectedSvc) {
        onSelectValue(selectedSvc.nombre);
      }
    } else {
      if (onClear) onClear();
    }
  }, [selectedPath, servicios, onSelectValue, onClear]);

  const handleSelect = (nivelIndex, id) => {
    // Cut the path up to the current level, and push the new selection
    const newPath = [...selectedPath.slice(0, nivelIndex), id];
    setSelectedPath(newPath);
  };

  const clearSelection = (e) => {
    e.stopPropagation();
    setSelectedPath([]);
    if (onClear) onClear();
    setIsOpen(false);
  };

  if (loading) return <div className="text-xs text-slate-400 p-2 border border-dashed border-slate-200 rounded w-full">Cargando...</div>;

  // Build the levels to render based on the selected path
  const levelsToRender = [];
  
  // Level 1: Root items (parent_id is null)
  levelsToRender.push({
    levelIndex: 0,
    items: servicios.filter(s => !s.parent_id)
  });

  // For each selection in the path, see if it has children. If so, add a new level.
  selectedPath.forEach((selectedId, index) => {
    const children = servicios.filter(s => s.parent_id === selectedId);
    if (children.length > 0) {
      levelsToRender.push({
        levelIndex: index + 1,
        items: children
      });
    }
  });

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-2 py-1.5 rounded border border-slate-300 bg-white text-left text-sm text-slate-700 outline-none focus:border-indigo-500 flex justify-between items-center shadow-sm"
      >
        <span className="truncate">{value || 'Seleccionar...'}</span>
        <svg className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-[100] mt-1 w-[450px] max-w-[90vw] right-0 sm:right-auto sm:left-0 bg-white border border-slate-200 rounded-lg shadow-2xl p-2 flex flex-col gap-2">
          {levelsToRender.map((levelDef) => (
            <div key={`level-${levelDef.levelIndex}`} className="flex flex-wrap gap-1.5 p-1.5 bg-slate-50 border border-slate-200 rounded shadow-inner">
              {levelDef.items.map(svc => {
                const isSelected = selectedPath[levelDef.levelIndex] === svc.id;
                return (
                  <button
                    key={svc.id}
                    type="button"
                    onClick={() => handleSelect(levelDef.levelIndex, svc.id)}
                    className={`px-2 py-1 text-[10px] font-bold uppercase rounded transition-all ${
                      isSelected 
                        ? 'bg-indigo-600 text-white shadow ring-1 ring-indigo-300 ring-offset-1' 
                        : 'bg-white text-slate-600 border border-slate-300 hover:bg-indigo-50 hover:border-indigo-300'
                    }`}
                  >
                    {svc.nombre}
                  </button>
                );
              })}
            </div>
          ))}
          <div className="flex justify-between items-center mt-1 px-1">
            <button 
              type="button" 
              onClick={clearSelection}
              className="text-[10px] font-bold text-red-500 hover:text-red-700 uppercase tracking-wide"
            >
              &times; Limpiar
            </button>
            <button 
              type="button" 
              onClick={() => setIsOpen(false)}
              className="text-[10px] font-bold text-slate-500 hover:text-slate-700 uppercase bg-slate-100 px-2 py-1 rounded"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
