import { jest } from '@jest/globals';

jest.unstable_mockModule('../../services/aximService.js', () => ({
  dispatchAgentViewTask: jest.fn().mockResolvedValue(true as never),
  getLeadEnrichment: jest.fn().mockResolvedValue({} as never),
  syncLeadToCore: jest.fn().mockResolvedValue({} as never),
  getOrganizationFromCore: jest.fn().mockResolvedValue({} as never),
  dispatchLeadConversion: jest.fn().mockResolvedValue(true as never),
  default: { post: jest.fn(), get: jest.fn() }
}));

import request from 'supertest';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;

const { default: app } = await import('../../app.js');
const { pool } = await import('../../config/database.js');

describe('Appointments Controller', () => {
  let token: string;
  let organizationId: string;
  let userId: string;
  let leadId: string;
  let appointmentId: string;

  beforeAll(async () => {
    // Setup test data
    const orgResult = await pool.query(
      `INSERT INTO organizations (name) VALUES ($1) RETURNING id`,
      ['Test Appointments Org']
    );
    organizationId = orgResult.rows[0].id;

    const userResult = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, organization_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, role`,
      ['test_appointments@example.com', 'hashedpassword', 'Test', 'User', 'REP', organizationId]
    );
    userId = userResult.rows[0].id;
    const role = userResult.rows[0].role;

    token = jwt.sign(
      { userId, email: 'test_appointments@example.com', role, organizationId },
      JWT_SECRET
    );

    const leadResult = await pool.query(
      `INSERT INTO leads (organization_id, status) VALUES ($1, $2) RETURNING id`,
      [organizationId, 'New']
    );
    leadId = leadResult.rows[0].id;

    await pool.query(
      `INSERT INTO lead_pii (lead_id, first_name, last_name, street_address) VALUES ($1, $2, $3, $4)`,
      [leadId, 'John', 'Doe', '123 Test St']
    );
  });

  afterAll(async () => {
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    await pool.query('DELETE FROM leads WHERE id = $1', [leadId]);
    await pool.query('DELETE FROM organizations WHERE id = $1', [organizationId]);
    await pool.end();
  });

  describe('createAppointment', () => {
    it('should create a new appointment', async () => {
      const scheduledAt = new Date().toISOString();
      const res = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${token}`)
        .send({
          leadId,
          userId,
          scheduledAt,
          notes: 'Test appointment notes'
        });

      expect(res.status).toBe(201);
      expect(res.body.appointment).toBeDefined();
      expect(res.body.appointment.lead_id).toBe(leadId);
      expect(res.body.appointment.notes).toBe('Test appointment notes');
      appointmentId = res.body.appointment.id;
    });

    it('should fail if missing required fields', async () => {
      const res = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${token}`)
        .send({
          leadId,
          // userId missing
          notes: 'Test appointment notes'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Missing required fields');
    });
  });

  describe('getAppointments', () => {
    it('should retrieve appointments', async () => {
      const res = await request(app)
        .get('/api/appointments')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.appointments)).toBe(true);
      expect(res.body.appointments.length).toBeGreaterThan(0);
      expect(res.body.appointments[0].notes).toBe('Test appointment notes');
      expect(res.body.appointments[0].lead.firstName).toBe('John');
    });
  });

  describe('updateAppointment', () => {
    it('should update an appointment', async () => {
      const res = await request(app)
        .put(`/api/appointments/${appointmentId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          status: 'Completed',
          notes: 'Updated notes'
        });

      expect(res.status).toBe(200);
      expect(res.body.appointment.status).toBe('Completed');
      expect(res.body.appointment.notes).toBe('Updated notes');
    });
  });

  describe('deleteAppointment', () => {
    it('should delete an appointment', async () => {
      const res = await request(app)
        .delete(`/api/appointments/${appointmentId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Appointment deleted successfully');

      const getRes = await request(app)
        .get('/api/appointments')
        .set('Authorization', `Bearer ${token}`);

      expect(getRes.body.appointments.find((a: any) => a.id === appointmentId)).toBeUndefined();
    });
  });
});
