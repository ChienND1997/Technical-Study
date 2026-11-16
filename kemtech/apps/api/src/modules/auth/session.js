import { createHmac, timingSafeEqual } from 'node:crypto';

export const COOKIE_NAME = 'kt_session';

const mac = (secret, body) => createHmac('sha256', secret).update(body).digest('base64url');

/** Signs {uid, exp} (exp in epoch seconds) into "<payload>.<hmac>". */
export function signToken(secret, payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${mac(secret, body)}`;
}

/** Returns the payload of a valid, unexpired token, otherwise null. */
export function verifyToken(secret, token, now = Date.now()) {
  const [body, sig] = String(token ?? '').split('.');
  if (!body || !sig) return null;
  const want = Buffer.from(mac(secret, body));
  const got = Buffer.from(sig);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    return payload.uid && payload.exp * 1000 > now ? payload : null;
  } catch {
    return null;
  }
}

/** Reads one cookie value from a raw Cookie header. */
export function readCookie(header, name = COOKIE_NAME) {
  for (const part of String(header ?? '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}

/** Builds the Set-Cookie value; maxAgeSec = 0 clears it. */
export function sessionCookie(token, maxAgeSec, secure = false) {
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}${secure ? '; Secure' : ''}`;
}
