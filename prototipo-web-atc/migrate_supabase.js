const { Client } = require('pg');

const connectionString = 'postgresql://postgres:%5B3Cn-B%2Fqd%3Fw%26A5tL%5D@db.qvitkasspjxrdfwtyydk.supabase.co:5432/postgres';

async function migrate() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('Connected to PostgreSQL database');

    // 1. Create Enums
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE estado_agente AS ENUM ('Activo', 'Inactivo');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE estado_asistencia AS ENUM ('Disponible', 'En refrigerio', 'Ausente');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    console.log('Created ENUMs successfully');

    // 2. Refactor agentes table
    await client.query(`
      -- Capitalize the first letter of estado if it's 'activo' or 'inactivo'
      UPDATE agentes SET estado = INITCAP(estado) WHERE estado IN ('activo', 'inactivo');
      
      ALTER TABLE agentes 
      ALTER COLUMN estado TYPE estado_agente 
      USING estado::estado_agente;
    `);
    console.log('Altered agentes table');

    // 3. Refactor control_asistencia table
    // Parse fecha+entrada into entrada_at
    await client.query(`
      ALTER TABLE control_asistencia 
      ADD COLUMN IF NOT EXISTS entrada_at timestamptz,
      ADD COLUMN IF NOT EXISTS salida_at timestamptz,
      ADD COLUMN IF NOT EXISTS ref_inicio_at timestamptz,
      ADD COLUMN IF NOT EXISTS ref_termino_at timestamptz;
      
      -- Update existing data
      UPDATE control_asistencia 
      SET 
        entrada_at = CASE WHEN entrada IS NOT NULL AND entrada != '' THEN (fecha || ' ' || entrada)::timestamptz ELSE NULL END,
        salida_at = CASE WHEN salida IS NOT NULL AND salida != '' THEN (fecha || ' ' || salida)::timestamptz ELSE NULL END,
        ref_inicio_at = CASE WHEN ref_inicio IS NOT NULL AND ref_inicio != '' THEN (fecha || ' ' || ref_inicio)::timestamptz ELSE NULL END,
        ref_termino_at = CASE WHEN ref_termino IS NOT NULL AND ref_termino != '' THEN (fecha || ' ' || ref_termino)::timestamptz ELSE NULL END;
    `);
    
    // Convert estado_texto to Enum
    await client.query(`
      UPDATE control_asistencia SET estado_texto = 'Disponible' WHERE estado_texto IS NULL OR estado_texto = '';
      
      ALTER TABLE control_asistencia 
      ALTER COLUMN estado_texto TYPE estado_asistencia 
      USING estado_texto::estado_asistencia;
    `);
    console.log('Altered control_asistencia table');

    // 4. Refactor oatc table
    await client.query(`
      ALTER TABLE oatc 
      ADD COLUMN IF NOT EXISTS creado_at timestamptz,
      ADD COLUMN IF NOT EXISTS resuelto_at timestamptz;
      
      UPDATE oatc 
      SET 
        creado_at = CASE WHEN hora IS NOT NULL AND hora != '' THEN (fecha || ' ' || hora)::timestamptz ELSE fecha::date::timestamptz END,
        resuelto_at = CASE WHEN hora_resuelto IS NOT NULL AND hora_resuelto != '' THEN (fecha || ' ' || hora_resuelto)::timestamptz ELSE NULL END;
    `);
    console.log('Altered oatc table');

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await client.end();
  }
}

migrate();
