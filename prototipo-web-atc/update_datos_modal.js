const fs = require('fs');
const path = './src/components/DatosModal.js';

let content = fs.readFileSync(path, 'utf8');

// 1. Update query logic
content = content.replace(
  /if \(dateStr\) query = query\.eq\('fecha', dateStr\);/,
  `if (dateStr) {
      const startOfDay = \`\${dateStr}T00:00:00-05:00\`;
      const endOfDay = \`\${dateStr}T23:59:59-05:00\`;
      query = query.gte('creado_at', startOfDay).lte('creado_at', endOfDay);
    }`
);

// 2. Update render row for fecha and hora
content = content.replace(
  /<td className="px-4 py-3 text-slate-600 font-mono">\{o\.fecha\}<\/td>\s+<td className="px-4 py-3 text-slate-500">\{o\.hora\}<\/td>/,
  `<td className="px-4 py-3 text-slate-600 font-mono">{o.creado_at ? new Date(o.creado_at).toLocaleDateString('en-CA', { timeZone: 'America/Lima' }) : '--'}</td>
                      <td className="px-4 py-3 text-slate-500">{o.creado_at ? new Date(o.creado_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '--'}</td>`
);

fs.writeFileSync(path, content, 'utf8');
console.log('DatosModal.js updated successfully!');
