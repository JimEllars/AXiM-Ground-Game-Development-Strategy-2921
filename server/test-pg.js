import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: 'postgres://postgres:postgres@localhost:5432/testdb' });

async function run() {
  try {
    const res = await pool.query(`SELECT 1 as result WHERE ($1::text IS NULL OR '2023-01-05' BETWEEN $1::text AND $2::text)`, [null, null]);
    console.log('Nulls:', res.rows);
    const res2 = await pool.query(`SELECT 1 as result WHERE ($1::text IS NULL OR '2023-01-05' BETWEEN $1::text AND $2::text)`, ['2023-01-01', '2023-01-10']);
    console.log('Dates:', res2.rows);
    const res3 = await pool.query(`SELECT 1 as result WHERE ($1::text IS NULL OR '2023-01-15' BETWEEN $1::text AND $2::text)`, ['2023-01-01', '2023-01-10']);
    console.log('Outside:', res3.rows);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
run();
