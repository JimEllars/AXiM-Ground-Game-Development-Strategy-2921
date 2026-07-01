import { jest } from '@jest/globals';
import crypto from 'crypto';

// Use a known key for testing
const testKey = '12345678901234567890123456789012';
process.env.WEBHOOK_SECRET_KEY = testKey;

// Mock Axios

jest.unstable_mockModule('axios-retry', () => {
  return {
    default: jest.fn(),
  };
});
jest.unstable_mockModule('axios', () => {
  return {
    default: {
      create: jest.fn(() => ({
        post: jest.fn().mockResolvedValue({ data: { success: true } } as never),
        get: jest.fn(),
      })),
    },
  };
});

const { dispatchLeadConversion } = await import('../aximService.js');
const { default: aximClient } = await import('../aximService.js');

describe('Universal Dispatcher Payload Verification', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should encrypt and dispatch the correct payload structure for AXiM Core', async () => {
    const mockLead = {
      id: 'lead-123',
      firstName: 'John',
      lastName: 'Doe',
      status: 'Completed',
    };

    const mockInteraction = {
      outcome: 'Completed',
      notes: 'Sold a package',
    };

    await dispatchLeadConversion(mockLead, mockInteraction);

    // Verify axios was called
    expect((aximClient.post as jest.Mock)).toHaveBeenCalledTimes(1);

    // Get the arguments passed to the mock
    const callArgs = (aximClient.post as jest.Mock).mock.calls[0];
    const url = callArgs[0];
    const payload: any = callArgs[1];

    // Verify URL
    expect(url).toBe('/webhook/universal-dispatcher');

    // Verify Payload Structure
    expect(payload).toHaveProperty('iv');
    expect(payload).toHaveProperty('encryptedData');
    expect(payload).toHaveProperty('authTag');

    // Decrypt the payload to verify contents
    const iv = Buffer.from(payload.iv, 'base64');
    const authTag = Buffer.from(payload.authTag, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(testKey), iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(payload.encryptedData, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    const decryptedObj = JSON.parse(decrypted);

    // Verify Decrypted Content Contains Required Structure
    expect(decryptedObj).toHaveProperty('contact');
    expect(decryptedObj).toHaveProperty('event_timestamp');
    expect(decryptedObj).toHaveProperty('trigger_event');
    expect(decryptedObj.contact.custom_fields.ground_game_lead_id).toBe('lead-123');
    expect(decryptedObj.contact.custom_fields.last_interaction_outcome).toBe('Completed');
  });
});
