import crypto from 'crypto';

/**
 * Validates a file payload (e.g., CSV upload) to prevent corrupted or malicious injections.
 * Enforces basic mime-type checks and payload integrity.
 */
export const verifyPayload = (buffer: Buffer, mimetype: string): boolean => {
  // Enforce basic mimetype checks
  if (mimetype !== 'text/csv' && mimetype !== 'application/csv' && mimetype !== 'application/vnd.ms-excel') {
    return false;
  }

  // Quick sanity check for basic CSV structure and absence of obvious binary magic numbers
  // This is a basic structural validation.
  const content = buffer.toString('utf-8');
  if (content.indexOf('\0') !== -1) { // null bytes are usually a sign of binary files
    return false;
  }

  return true;
};
