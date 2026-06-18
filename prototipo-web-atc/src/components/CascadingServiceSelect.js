'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function CascadingServiceSelect({ onSelectValue, onClear }) {
  const [servicios, setServicios] = useState([]);
  const [loading, setLoading] = useState(true);
  
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

  const clearSelection = () => {
    setSelectedPath([]);
    if (onClear) onClear();
  };

  if (loading) return <div className="text-xs text-slate-400 p-2 border border-dashed border-slate-200 rounded">Cargando servicios...</div>;

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
    <div className="flex flex-col gap-2">
      {levelsToRender.map((levelDef) => (
        <div key={`level-${levelDef.levelIndex}`} className="flex flex-wrap gap-1.5 p-1.5 bg-slate-50 border border-slate-200 rounded-lg shadow-inner">
          {levelDef.items.map(svc => {
            const isSelected = selectedPath[levelDef.levelIndex] === svc.id;
            return (
              <button
                key={svc.id}
                type="button"
                onClick={() => handleSelect(levelDef.levelIndex, svc.id)}
                className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded transition-all ${
                  isSelected 
                    ? 'bg-indigo-600 text-white shadow ring-2 ring-indigo-300 ring-offset-1' 
                    : 'bg-white text-slate-600 border border-slate-300 hover:bg-indigo-50 hover:border-indigo-300'
                }`}
              >
                {svc.nombre}
              </button>
            );
          })}
        </div>
      ))}
      {selectedPath.length > 0 && (
        <button 
          type="button" 
          onClick={clearSelection}
          className="text-[10px] font-bold text-red-500 hover:text-red-700 uppercase tracking-wide self-start mt-1"
        >
          &times; Limpiar selección
        </button>
      )}
    </div>
  );
}
