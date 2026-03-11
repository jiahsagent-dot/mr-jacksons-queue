const { Pool } = require('pg');
const fs = require('fs');

async function main() {
  const pool = new Pool({
    host: 'db.qducoenvjaotympjedrl.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'nnln1rIpuBFghmpp',
    ssl: { rejectUnauthorized: false },
  });

  try {
    const client = await pool.connect();
    console.log('Connected to Supabase DB');

    const sql = fs.readFileSync('./supabase-migration.sql', 'utf8');
    await client.query(sql);
    console.log('Migration complete!');

    const tables = await client.query("SELECT table_number, seats, label, status FROM tables ORDER BY table_number");
    console.log(`Tables created: ${tables.rows.length}`);
    tables.rows.forEach(t => console.log(`  Table ${t.table_number}: ${t.seats} seats (${t.label}) - ${t.status}`));

    const bookings = await client.query("SELECT count(*) FROM bookings");
    console.log(`Bookings table ready (${bookings.rows[0].count} rows)`);

    const orders = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'orders' AND column_name IN ('table_number', 'order_context')");
    console.log(`Orders table updated with columns: ${orders.rows.map(r => r.column_name).join(', ')}`);

    client.release();
  } catch (err) {
    console.error('Migration failed:', err.message);
  }

  await pool.end();
}

main();
