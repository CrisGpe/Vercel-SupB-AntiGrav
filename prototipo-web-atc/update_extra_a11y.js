const fs = require('fs');

function patchFile(path, replacements) {
  let content = fs.readFileSync(path, 'utf8');
  for (const { regex, replacement } of replacements) {
    content = content.replace(regex, replacement);
  }
  fs.writeFileSync(path, content, 'utf8');
}

patchFile('./src/components/AgentesModal.js', [
  {
    regex: /<label className="block text-xs font-bold text-slate-500 mb-1">Nombre Completo<\/label>\s+<input type="text"/,
    replacement: `<label htmlFor="agenteNombre" className="block text-xs font-bold text-slate-500 mb-1">Nombre Completo</label>
                <input id="agenteNombre" name="agenteNombre" type="text"`
  },
  {
    regex: /<label className="block text-xs font-bold text-slate-500 mb-1">Apodo \(Pizarra\)<\/label>\s+<input type="text"/,
    replacement: `<label htmlFor="agenteApodo" className="block text-xs font-bold text-slate-500 mb-1">Apodo (Pizarra)</label>
                <input id="agenteApodo" name="agenteApodo" type="text"`
  },
  {
    regex: /<label className="block text-xs font-bold text-slate-500 mb-1">Estado<\/label>\s+<select/,
    replacement: `<label htmlFor="agenteEstado" className="block text-xs font-bold text-slate-500 mb-1">Estado</label>
                <select id="agenteEstado" name="agenteEstado"`
  }
]);

patchFile('./src/components/DatosModal.js', [
  {
    regex: /<label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Filtrar por Fecha<\/label>\s+<input \s+type="date"/,
    replacement: `<label htmlFor="datosFecha" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Filtrar por Fecha</label>
            <input id="datosFecha" name="datosFecha" type="date"`
  }
]);

patchFile('./src/components/FidelizacionModal.js', [
  {
    regex: /<input type="text" placeholder="Buscar por Nombre, DNI o Celular..."/,
    replacement: `<input id="searchCliente" name="searchCliente" type="text" placeholder="Buscar por Nombre, DNI o Celular..."`
  }
]);

console.log('Extra a11y fields updated successfully!');
