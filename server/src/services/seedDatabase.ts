import { pool } from '../config/database.js';

async function verifySeedData() {
  try {
    console.log('🌱 Verifying database seed data...');

    const usersResult = await pool.query(
      `SELECT COUNT(*) FROM users WHERE email IN ('admin@axim.com', 'manager@axim.com', 'rep@axim.com')`
    );

    const userCount = parseInt(usersResult.rows[0].count, 10);

    if (userCount < 3) {
      console.warn('⚠️  Warning: Demo users are missing. The schema might not have been applied correctly.');
    } else {
      console.log('✅ Demo user accounts are present.');
    }

    const leadsResult = await pool.query(
      `SELECT COUNT(*) FROM leads WHERE organization_id = '550e8400-e29b-41d4-a716-446655440000'`
    );

    const leadCount = parseInt(leadsResult.rows[0].count, 10);

    if (leadCount > 0) {
      console.log(`✅ Found ${leadCount} sample leads for the demo organization.`);
    }

    console.log('✅ Database verification completed successfully!');
    
  } catch (error) {
    console.error('❌ Database verification failed:', error);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  verifySeedData();
}

export default verifySeedData;
