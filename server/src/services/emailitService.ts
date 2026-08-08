import logger from '../utils/logger.js';

interface EmailItPayload {
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  organization_id: string;
}

export const enrollInEmailItNurture = async (payload: EmailItPayload) => {
  try {
    const apiKey = process.env.EMAILIT_API_KEY;
    const listId = process.env.EMAILIT_SUBSCRIBER_LIST_ID;

    if (!apiKey || !listId) {
      logger.warn('EmailIt credentials missing. Skipping nurture enrollment.');
      return;
    }

    // Fire-and-forget API call to EmailIt (Mock endpoint as this is a wrapper)
    // Using fetch
    const response = await fetch(`https://api.emailit.com/v1/subscribers`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        list_id: listId,
        email: payload.email,
        name: [payload.first_name, payload.last_name].filter(Boolean).join(' '),
        custom_fields: {
          phone: payload.phone,
          organization_id: payload.organization_id
        }
      })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`EmailIt API error: ${response.status} ${errorText}`);
    }

    logger.info(`Successfully enrolled ${payload.email} in EmailIt nurture campaign.`);
  } catch (error) {
    logger.error('Failed to enroll lead in EmailIt', {
      error: error instanceof Error ? error.message : String(error),
      payload: { ...payload, email: 'REDACTED' } // Redact PII in error logs
    });
  }
};
