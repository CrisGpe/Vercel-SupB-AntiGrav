const { Client } = require('pg');

const connectionString = 'postgresql://postgres:%5B3Cn-B%2Fqd%3Fw%26A5tL%5D@db.qvitkasspjxrdfwtyydk.supabase.co:5432/postgres';

async function migrate() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('Connected to PostgreSQL database');

    // Create the catalogo table
    await client.query(`
      CREATE TABLE IF NOT EXISTS catalogo (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sku VARCHAR(50) UNIQUE,
        codigo_barras VARCHAR(50),
        nombre VARCHAR(255) NOT NULL,
        marca VARCHAR(100),
        linea VARCHAR(100),
        categoria VARCHAR(100),
        presentacion VARCHAR(100),
        stock_actual INTEGER DEFAULT 0,
        stock_minimo INTEGER DEFAULT 0,
        stock_maximo INTEGER DEFAULT 0,
        costo_compra NUMERIC(10, 2) DEFAULT 0,
        precio_venta NUMERIC(10, 2) DEFAULT 0,
        precio_venta_minimo NUMERIC(10, 2) DEFAULT 0,
        tags TEXT[] DEFAULT '{}',
        estado VARCHAR(20) DEFAULT 'Activo',
        creado_at TIMESTAMPTZ DEFAULT NOW(),
        actualizado_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    
    console.log('Created catalogo table successfully');

    // Create RLS policies (open for prototype)
    await client.query(`
      ALTER TABLE catalogo ENABLE ROW LEVEL SECURITY;
      
      DROP POLICY IF EXISTS "Public select for catalogo" ON catalogo;
      CREATE POLICY "Public select for catalogo" ON catalogo FOR SELECT USING (true);
      
      DROP POLICY IF EXISTS "Public insert for catalogo" ON catalogo;
      CREATE POLICY "Public insert for catalogo" ON catalogo FOR INSERT WITH CHECK (true);
      
      DROP POLICY IF EXISTS "Public update for catalogo" ON catalogo;
      CREATE POLICY "Public update for catalogo" ON catalogo FOR UPDATE USING (true);
      
      DROP POLICY IF EXISTS "Public delete for catalogo" ON catalogo;
      CREATE POLICY "Public delete for catalogo" ON catalogo FOR DELETE USING (true);
    `);
    console.log('RLS policies applied to catalogo table');

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await client.end();
  }
}

migrate();
