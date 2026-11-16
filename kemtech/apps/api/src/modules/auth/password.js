import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

export const MIN_PASSWORD = 6;
const KEYLEN = 64;
const derive = (password, salt) =>
  new Promise((resolve, reject) => scrypt(password, salt, KEYLEN, (err, key) => (err ? reject(err) : resolve(key))));

/** Hashes a password with scrypt and a random salt -> "scrypt$<saltHex>$<hashHex>". */
export async function hashPassword(password) {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString('hex')}$${(await derive(password, salt)).toString('hex')}`;
}

/** Constant-time check of a password against a stored hash; false for a missing or malformed hash. */
export async function verifyPassword(password, stored) {
  const [scheme, saltHex, hashHex] = String(stored ?? '').split('$');
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = await derive(String(password ?? ''), Buffer.from(saltHex, 'hex'));
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
