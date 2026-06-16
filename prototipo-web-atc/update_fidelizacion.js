const fs = require('fs');
const path = './src/components/FidelizacionModal.js';

let content = fs.readFileSync(path, 'utf8');

// Update select query: oatc(fecha) -> oatc(creado_at)
content = content.replace(
  /oatc\(fecha\)/g,
  'oatc(creado_at)'
);

// Update sorting of oatc
content = content.replace(
  /const sorted = c\.oatc\.sort\(\(a, b\) => new Date\(b\.fecha\) - new Date\(a\.fecha\)\);/g,
  `const sorted = c.oatc.sort((a, b) => new Date(b.creado_at) - new Date(a.creado_at));`
);

// Update extraction of ultimaFecha
content = content.replace(
  /ultimaFecha = sorted\[0\]\.fecha;/g,
  `ultimaFecha = new Date(sorted[0].creado_at).toLocaleDateString('es-PE');`
);

// Update historial query
content = content.replace(
  /supabase\.from\('oatc'\)\.select\('id, fecha, categoria_demanda, agentes\(nombre_completo\)'\)\.eq\('cliente_id', cliente\.id\)\.order\('fecha', \{ ascending: false \}\);/g,
  `supabase.from('oatc').select('id, creado_at, categoria_demanda, agentes(nombre_completo)').eq('cliente_id', cliente.id).order('creado_at', { ascending: false });`
);

// Update template string in historial rendering
content = content.replace(
  /\$\{h\.fecha\}/g,
  `\${h.creado_at ? new Date(h.creado_at).toLocaleDateString('es-PE') : '--'}`
);

fs.writeFileSync(path, content, 'utf8');
console.log('FidelizacionModal.js updated successfully!');
