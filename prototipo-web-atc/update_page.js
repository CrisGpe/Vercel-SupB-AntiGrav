const fs = require('fs');
const path = './src/app/page.js';

let content = fs.readFileSync(path, 'utf8');

// 1. Update fetchData
content = content.replace(
  /const fechaHoy = new Date\(\)\.toLocaleDateString\('en-CA', \{ timeZone: 'America\/Lima' \}\);\s+\/\/ Fetch data\s+const \[\s+\{ data: agentesData \},\s+\{ data: asistData \},\s+\{ data: oatcsData \},\s+\{ data: clientesData \}\s+\] = await Promise\.all\(\[\s+supabase\.from\('agentes'\)\.select\('\*'\)\.ilike\('estado', 'activo'\),\s+supabase\.from\('control_asistencia'\)\.select\('\*'\)\.eq\('fecha', fechaHoy\),\s+supabase\.from\('oatc'\)\.select\('\*, agentes\(nombre_completo, apodo\), clientes\(nombre, apellido\)'\)\.eq\('fecha', fechaHoy\)\.order\('correlativo', \{ ascending: false \}\),\s+supabase\.from\('clientes'\)\.select\('id, nombre, apellido, dni'\)\s+\]\);/,
  `const fechaLima = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
      const startOfDay = \`\${fechaLima}T00:00:00-05:00\`;
      const endOfDay = \`\${fechaLima}T23:59:59-05:00\`;
      
      // Fetch data
      const [
        { data: agentesData }, 
        { data: asistData }, 
        { data: oatcsData },
        { data: clientesData }
      ] = await Promise.all([
        supabase.from('agentes').select('*').ilike('estado', 'activo'),
        supabase.from('control_asistencia').select('*').gte('created_at', startOfDay).lte('created_at', endOfDay),
        supabase.from('oatc').select('*, agentes(nombre_completo, apodo), clientes(nombre, apellido)').gte('creado_at', startOfDay).lte('creado_at', endOfDay).order('correlativo', { ascending: false }),
        supabase.from('clientes').select('id, nombre, apellido, dni')
      ]);`
);

// 2. Update handleAction
content = content.replace(
  /const fechaHoy = getLimaDate\(\);\s+const horaAhora = getLimaTime\(\);/,
  `const nowIso = new Date().toISOString();`
);

content = content.replace(
  /agente_id: agente\.id, fecha: fechaHoy, entrada: horaAhora, estado_texto: 'Disponible', ultima_act: new Date\(\)\.toISOString\(\)/,
  `agente_id: agente.id, entrada_at: nowIso, estado_texto: 'Disponible', ultima_act: nowIso`
);

content = content.replace(
  /salida: horaAhora, estado_texto: 'Ausente', ultima_act: new Date\(\)\.toISOString\(\)/,
  `salida_at: nowIso, estado_texto: 'Ausente', ultima_act: nowIso`
);

content = content.replace(
  /if \(!asistenciaActual\.ref_inicio && !asistenciaActual\.ref_termino\) \{/,
  `if (!asistenciaActual.ref_inicio_at && !asistenciaActual.ref_termino_at) {`
);

content = content.replace(
  /ref_inicio: horaAhora, estado_texto: 'En refrigerio'/,
  `ref_inicio_at: nowIso, estado_texto: 'En refrigerio', ultima_act: nowIso`
);

content = content.replace(
  /\} else if \(asistenciaActual\.ref_inicio && !asistenciaActual\.ref_termino\) \{/,
  `} else if (asistenciaActual.ref_inicio_at && !asistenciaActual.ref_termino_at) {`
);

content = content.replace(
  /ref_termino: horaAhora, estado_texto: 'Disponible'/,
  `ref_termino_at: nowIso, estado_texto: 'Disponible', ultima_act: nowIso`
);

content = content.replace(
  /fecha: fechaHoy,\s+hora: horaAhora,\s+cliente_id: clienteId,\s+tipo_atencion: atencionOatc,\s+categoria_demanda: demandaOatc,\s+agente_id: agenteOatcObj\.id,\s+hora_resuelto: ''/,
  `creado_at: nowIso,
          cliente_id: clienteId,
          tipo_oatc: atencionOatc,
          categoria_demanda: demandaOatc,
          agente_id: agenteOatcObj.id`
);

// 3. Update Refetch
content = content.replace(
  /const \[ \{ data: newAsist \}, \{ data: newOatcs \} \] = await Promise\.all\(\[\s+supabase\.from\('control_asistencia'\)\.select\('\*'\)\.eq\('fecha', fechaHoy\),\s+supabase\.from\('oatc'\)\.select\('\*, agentes\(nombre_completo, apodo\), clientes\(nombre, apellido\)'\)\.eq\('fecha', fechaHoy\)\.order\('correlativo', \{ ascending: false \}\)\s+\]\);/,
  `const fechaLima = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
      const startOfDay = \`\${fechaLima}T00:00:00-05:00\`;
      const endOfDay = \`\${fechaLima}T23:59:59-05:00\`;

      const [ { data: newAsist }, { data: newOatcs } ] = await Promise.all([
        supabase.from('control_asistencia').select('*').gte('created_at', startOfDay).lte('created_at', endOfDay),
        supabase.from('oatc').select('*, agentes(nombre_completo, apodo), clientes(nombre, apellido)').gte('creado_at', startOfDay).lte('creado_at', endOfDay).order('correlativo', { ascending: false })
      ]);`
);

// 4. Update asistencias table mapping
content = content.replace(
  /<td className="px-2 py-2 text-slate-500">\{asist\.entrada \|\| '--:--'\}<\/td>\s+<td className="px-2 py-2 text-slate-500">\{asist\.salida \|\| '--:--'\}<\/td>/,
  `<td className="px-2 py-2 text-slate-500">{asist.entrada_at ? new Date(asist.entrada_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</td>
                      <td className="px-2 py-2 text-slate-500">{asist.salida_at ? new Date(asist.salida_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</td>`
);

// 5. Update oatcs table mapping
content = content.replace(
  /<td className="px-2 py-2 text-slate-500">\{o\.hora\}<\/td>/,
  `<td className="px-2 py-2 text-slate-500">{o.creado_at ? new Date(o.creado_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</td>`
);

fs.writeFileSync(path, content, 'utf8');
console.log('page.js updated successfully!');
