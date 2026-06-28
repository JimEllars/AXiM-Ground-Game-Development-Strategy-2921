import CryptoJS from 'crypto-js';

// Retrieve or generate a persistent local salt
const getDeviceSalt = () => {
  let salt = localStorage.getItem('axim_device_salt');
  if (!salt) {
    salt = CryptoJS.lib.WordArray.random(128 / 8).toString();
    localStorage.setItem('axim_device_salt', salt);
  }
  return salt;
};

// Derive key from token payload (session context) + local salt
const getEncryptionKey = () => {
  const token = localStorage.getItem('token');
  const sessionContext = token ? token.substring(token.length - 20) : 'offline_fallback';
  return CryptoJS.PBKDF2(sessionContext, getDeviceSalt(), { keySize: 256 / 32, iterations: 1000 }).toString();
};

export const encryptString = (text: string | null | undefined): string | null | undefined => {
  if (!text) return text;
  try {
    return CryptoJS.AES.encrypt(text, getEncryptionKey()).toString();
  } catch (e) {
    return text;
  }
};

export const decryptString = (cipherText: string | null | undefined): string | null | undefined => {
  if (!cipherText) return cipherText;
  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, getEncryptionKey());
    const originalText = bytes.toString(CryptoJS.enc.Utf8);
    // If decryption fails (e.g. wrong key, unencrypted data), it might return empty string
    return originalText || cipherText;
  } catch (e) {
    return cipherText; // Fallback to raw text if it wasn't encrypted
  }
};
