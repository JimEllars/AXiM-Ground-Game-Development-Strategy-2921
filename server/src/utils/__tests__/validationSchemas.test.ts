import { leadSchema } from '../validationSchemas.js';

describe('validationSchemas', () => {
  describe('leadSchema', () => {
    const validLead = {
      first_name: 'John',
      last_name: 'Doe',
      street_address: '123 Main St',
      city: 'Anytown',
      state: 'CA',
      zip: '12345',
      phone: '555-123-4567',
      email: 'john.doe@example.com',
      status: 'New',
      notes: 'Some notes'
    };

    it('should validate a valid lead', () => {
      const result = leadSchema.safeParse(validLead);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.first_name).toBe('John');
        expect(result.data.state).toBe('CA');
      }
    });

    it('should transform names and city to capitalized format', () => {
      const leadToTransform = {
        ...validLead,
        first_name: 'jOHN',
        last_name: 'dOE',
        city: 'aNYTOWN',
        state: 'ca'
      };
      const result = leadSchema.safeParse(leadToTransform);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.first_name).toBe('John');
        expect(result.data.last_name).toBe('Doe');
        expect(result.data.city).toBe('Anytown');
        expect(result.data.state).toBe('CA');
      }
    });

    it('should handle optional fields and convert empty strings to null', () => {
      const leadWithEmptyOptionals = {
        ...validLead,
        phone: '',
        email: '',
        notes: ''
      };
      const result = leadSchema.safeParse(leadWithEmptyOptionals);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.phone).toBeNull();
        expect(result.data.email).toBeNull();
        expect(result.data.notes).toBeNull();
      }
    });

    it('should fail if required fields are missing', () => {
      const { first_name, ...invalidLead } = validLead as any;
      const result = leadSchema.safeParse(invalidLead);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('first_name');
      }
    });

    it('should fail if names are too short', () => {
      const result = leadSchema.safeParse({ ...validLead, first_name: 'J' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.first_name).toContain('First name must be at least 2 characters');
      }
    });

    it('should fail if street address is too short', () => {
      const result = leadSchema.safeParse({ ...validLead, street_address: '12' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.street_address).toContain('Street address is required');
      }
    });

    it('should fail if city is too short', () => {
      const result = leadSchema.safeParse({ ...validLead, city: 'A' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.city).toContain('City is required');
      }
    });

    it('should fail if state is too short', () => {
      const result = leadSchema.safeParse({ ...validLead, state: 'C' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.state).toContain('State is required');
      }
    });

    it('should fail if zip code format is invalid', () => {
      const result = leadSchema.safeParse({ ...validLead, zip: '1234' });
      expect(result.success).toBe(false);

      const result2 = leadSchema.safeParse({ ...validLead, zip: '123456' });
      expect(result2.success).toBe(false);

      const result3 = leadSchema.safeParse({ ...validLead, zip: 'abcde' });
      expect(result3.success).toBe(false);
    });

    it('should validate 9-digit zip code', () => {
      const result = leadSchema.safeParse({ ...validLead, zip: '12345-6789' });
      expect(result.success).toBe(true);
    });

    it('should fail if phone format is invalid', () => {
      const result = leadSchema.safeParse({ ...validLead, phone: '123' });
      expect(result.success).toBe(false);
    });

    it('should validate various phone formats', () => {
      const formats = [
        '5551234567',
        '555-123-4567',
        '(555) 123-4567',
        '+1 555-123-4567',
        '+15551234567'
      ];
      formats.forEach(phone => {
        const result = leadSchema.safeParse({ ...validLead, phone });
        expect(result.success).toBe(true);
      });
    });

    it('should fail if email format is invalid', () => {
      const result = leadSchema.safeParse({ ...validLead, email: 'not-an-email' });
      expect(result.success).toBe(false);
    });

    it('should fail if status is invalid', () => {
      const result = leadSchema.safeParse({ ...validLead, status: 'InvalidStatus' });
      expect(result.success).toBe(false);
    });

    it('should use default status if not provided', () => {
      const { status, ...leadWithoutStatus } = validLead as any;
      const result = leadSchema.safeParse(leadWithoutStatus);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('New');
      }
    });

    it('should trim whitespace from strings', () => {
      const leadWithWhitespace = {
        ...validLead,
        first_name: '  John  ',
        last_name: '  Doe  ',
        street_address: '  123 Main St  '
      };
      const result = leadSchema.safeParse(leadWithWhitespace);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.first_name).toBe('John');
        expect(result.data.last_name).toBe('Doe');
        expect(result.data.street_address).toBe('123 Main St');
      }
    });
  });
});
