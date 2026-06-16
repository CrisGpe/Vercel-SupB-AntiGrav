const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '../.env' }); // or we can just run it using the env vars we read or hardcode if we must. Wait, let's just pass the vars

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(url, key);

async function inspectSchema() {
  try {
    const { data: agentes } = await supabase.from('agentes').select('*').limit(1);
    const { data: asistencia } = await supabase.from('control_asistencia').select('*').limit(1);
    const { data: oatc } = await supabase.from('oatc').select('*').limit(1);
    const { data: clientes } = await supabase.from('clientes').select('*').limit(1);
    const { data: usuarios } = await supabase.from('usuarios').select('*').limit(1);

    const schema = {
      agentes: agentes ? Object.keys(agentes[0] || {}) : null,
      control_asistencia: asistencia ? Object.keys(asistencia[0] || {}) : null,
      oatc: oatc ? Object.keys(oatc[0] || {}) : null,
      clientes: clientes ? Object.keys(clientes[0] || {}) : null,
      usuarios: usuarios ? Object.keys(usuarios[0] || {}) : null,
      sample_oatc: oatc ? oatc[0] : null,
      sample_asistencia: asistencia ? asistencia[0] : null
    };

    fs.writeFileSync('schema_inspection.json', JSON.stringify(schema, null, 2));
    console.log('Schema inspection saved to schema_inspection.json');
  } catch (err) {
    console.error(err);
  }
}

inspectSchema();
