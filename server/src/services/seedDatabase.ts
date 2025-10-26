import bcrypt from 'bcrypt';
import { pool } from '../config/database.js';

const DEMO_PASSWORD = 'demo123';

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');

    // Hash demo password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, saltRounds);

    // Update existing users with proper password hash
    const updateUsersQuery = `
      UPDATE users 
      SET password_hash = $1 
      WHERE email IN ('admin@axim.com', 'manager@axim.com', 'rep@axim.com')
    `;
    
    await pool.query(updateUsersQuery, [passwordHash]);

    // Seed leads for the demo organization
    const orgId = '550e8400-e29b-41d4-a716-446655440000';
    const leads = [
      {
        first_name: 'John',
        last_name: 'Doe',
        street_address: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zip: '12345',
        status: 'New',
      },
      {
        first_name: 'Jane',
        last_name: 'Smith',
        street_address: '456 Oak Ave',
        city: 'Someville',
        state: 'TX',
        zip: '67890',
        status: 'Contacted',
      },
    ];

    for (const lead of leads) {
      await pool.query(
        `INSERT INTO leads (organization_id, first_name, last_name, street_address, city, state, zip, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [orgId, lead.first_name, lead.last_name, lead.street_address, lead.city, lead.state, lead.zip, lead.status]
      );
    }
    console.log('🌱 Seeded 2 sample leads');

    console.log('✅ Database seeding completed successfully!');
    console.log(`📝 Demo accounts updated with password: "${DEMO_PASSWORD}"`);
    
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase();
}

export default seedDatabase;