import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') }); // Fallback

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'axim_ground_game',
  user: process.env.DB_USER || 'postgres',
  password: String(process.env.DB_PASSWORD || 'postgres'),
});

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

async function seedTestAccount() {
  const email = 'jrellars@gmail.com';
  const rawPassword = crypto.randomBytes(6).toString('hex'); // 12 chars
  const contactNumber = '903-933-2672';

  try {
    console.log('🌱 Starting seed test account...');

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(rawPassword, saltRounds);

    // Find organization to link to (assume first one)
    const orgResult = await pool.query('SELECT id FROM organizations LIMIT 1');
    if (orgResult.rows.length === 0) {
      throw new Error('No organizations found. Run general seed first.');
    }
    const organizationId = orgResult.rows[0].id;

    // Create or update user in PostgreSQL
    let userResult = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    let userId;

    if (userResult.rows.length > 0) {
      userId = userResult.rows[0].id;
      await pool.query(
        `UPDATE users
         SET password_hash = $1, first_name = 'JR', last_name = 'Ellars', role = 'REP'
         WHERE id = $2`,
        [passwordHash, userId]
      );
      console.log(`✅ Updated existing user ${email} in local DB`);
    } else {
      userResult = await pool.query(
        `INSERT INTO users (organization_id, email, password_hash, first_name, last_name, role)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [organizationId, email, passwordHash, 'JR', 'Ellars', 'REP']
      );
      userId = userResult.rows[0].id;
      console.log(`✅ Created new user ${email} in local DB`);
    }

    // Attempt to seed in Supabase Auth if credentials exist
    if (supabase) {
      console.log('🌱 Provisioning user in Supabase Authentication layer...');
      const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers();
      if (listError) {
        console.warn('⚠️ Could not list Supabase users:', listError.message);
      } else {
        const existingUser = authUsers.users.find((u) => u.email === email);
        if (existingUser) {
           const { error: updateError } = await supabase.auth.admin.updateUserById(existingUser.id, {
             password: rawPassword,
             user_metadata: {
               contact_number: contactNumber,
               first_name: 'JR',
               last_name: 'Ellars',
             }
           });
           if (updateError) {
             console.warn('⚠️ Could not update existing user in Supabase Auth:', updateError.message);
           } else {
             console.log(`✅ Updated existing user in Supabase Auth`);
           }
        } else {
           const { error: createError } = await supabase.auth.admin.createUser({
             email,
             password: rawPassword,
             email_confirm: true,
             user_metadata: {
               contact_number: contactNumber,
               first_name: 'JR',
               last_name: 'Ellars',
             }
           });
           if (createError) {
             console.warn('⚠️ Could not create user in Supabase Auth:', createError.message);
           } else {
             console.log(`✅ Created new user in Supabase Auth`);
           }
        }
      }
    } else {
      console.log('ℹ️ Supabase credentials not found, skipping Supabase Auth provisioning.');
    }

    console.log(`\n========================================`);
    console.log(`🔐 TEST ACCOUNT CREDENTIALS`);
    console.log(`Email: ${email}`);
    console.log(`Password: ${rawPassword}`);
    console.log(`Phone: ${contactNumber}`);
    console.log(`========================================\n`);

    // Create Longview, TX territory block
    // Bounding Box for Longview, TX approx (32.4, -94.8) to (32.6, -94.6)
    const territoryName = 'Longview, TX Block';
    let territoryId;
    let terrResult = await pool.query('SELECT id FROM territories WHERE name = $1 AND organization_id = $2', [territoryName, organizationId]);

    if (terrResult.rows.length > 0) {
      territoryId = terrResult.rows[0].id;
      console.log(`✅ Territory '${territoryName}' already exists.`);
    } else {
      terrResult = await pool.query(
        `INSERT INTO territories (organization_id, name, description, boundary, created_by)
         VALUES ($1, $2, $3, ST_GeomFromText('POLYGON((-94.8 32.4, -94.6 32.4, -94.6 32.6, -94.8 32.6, -94.8 32.4))', 4326), $4)
         RETURNING id`,
        [organizationId, territoryName, 'Test block for mobile map mechanics.', userId]
      );
      territoryId = terrResult.rows[0].id;
      console.log(`✅ Created territory '${territoryName}'.`);
    }

    // Assign territory to user
    await pool.query(
      `INSERT INTO territory_assignments (user_id, territory_id, assigned_by)
       VALUES ($1, $2, $1)
       ON CONFLICT (user_id, territory_id) DO NOTHING`,
      [userId, territoryId]
    );
    console.log(`✅ Assigned territory to user.`);

    // Seed local map with dense mock leads (75654, 75667, 75633)
    const zipCodes = ['75654', '75667', '75633'];
    let leadsInserted = 0;

    // Generate some random coordinates roughly in Longview area for the leads
    const generateLat = () => 32.45 + Math.random() * 0.1; // ~32.45 to 32.55
    const generateLng = () => -94.75 + Math.random() * 0.1; // ~-94.75 to -94.65

    for (let i = 0; i < 50; i++) {
      const lat = generateLat();
      const lng = generateLng();
      const zip = zipCodes[i % zipCodes.length];

      const leadRes = await pool.query(
        `INSERT INTO leads (organization_id, status, notes, location)
         VALUES ($1, 'New', 'Test lead generated by seedTestAccount script.', ST_SetSRID(ST_MakePoint($2, $3), 4326))
         RETURNING id`,
        [organizationId, lng, lat]
      );

      const leadId = leadRes.rows[0].id;

      await pool.query(
        `INSERT INTO lead_pii (lead_id, first_name, last_name, street_address, city, state, zip, phone)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          leadId,
          `TestFirstName${i}`,
          `TestLastName${i}`,
          `${1000+i} Main St`,
          'Longview',
          'TX',
          zip,
          contactNumber // Assign the requested contact number
        ]
      );
      leadsInserted++;
    }
    console.log(`✅ Seeded ${leadsInserted} mock leads in Longview, TX zip codes.`);

  } catch (error) {
    console.error('❌ Failed to seed test account:', error);
  } finally {
    await pool.end();
  }
}

seedTestAccount();
