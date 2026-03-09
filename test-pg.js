import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: 'postgres://postgres:postgres@localhost:5432/postgres' });

async function run() {
  try {
    const res = await pool.query(`SELECT 1 WHERE ($1::timestamp IS NULL OR $2::timestamp IS NULL OR NOW() BETWEEN $1::timestamp AND $2::timestamp)`, [null, null]);
    console.log(res.rows);
    const res2 = await pool.query(`SELECT 1 WHERE ($1::timestamp IS NULL OR $2::timestamp IS NULL OR NOW() BETWEEN $1::timestamp AND $2::timestamp)`, ['2020-01-01', '2030-01-01']);
    console.log(res2.rows);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
run();
