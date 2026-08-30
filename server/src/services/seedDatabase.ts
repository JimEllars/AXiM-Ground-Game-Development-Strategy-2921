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


    const orgId = '550e8400-e29b-41d4-a716-446655440000';
    const repId = '550e8400-e29b-41d4-a716-446655440003';

    // Insert mock rep_shifts if not present
    const shiftsResult = await pool.query("SELECT COUNT(*) FROM rep_shifts WHERE organization_id = $1", [orgId]);
    if (parseInt(shiftsResult.rows[0].count, 10) === 0) {
        console.log('Inserting mock rep_shifts...');
        await pool.query(`
            INSERT INTO rep_shifts (user_id, organization_id, start_time, distance_meters, pins_knocked)
            VALUES
            ($1, $2, NOW() - INTERVAL '4 hours', 1500, 24),
            ($1, $2, NOW() - INTERVAL '1 day', 4200, 48)
        `, [repId, orgId]);
    }

    // Check interactions
    const interactionsResult = await pool.query("SELECT COUNT(*) FROM interactions");
    if (parseInt(interactionsResult.rows[0].count, 10) === 0) {
        console.log('Inserting mock interactions...');
        const lead = await pool.query("SELECT id FROM leads LIMIT 1");
        if (lead.rows.length > 0) {
            await pool.query(`
                INSERT INTO interactions (lead_id, user_id, outcome, notes, survey_data)
                VALUES
                ($1, $2, 'Not Home', 'Left a flyer', '{"was_home": false, "left_material": true}'::jsonb),
                ($1, $2, 'Interested', 'Great conversation', '{"was_home": true, "interest_level": "high"}'::jsonb)
            `, [lead.rows[0].id, repId]);
        }
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
