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