/** An API failure. `status` is 0 when the server could not be reached at all. */
export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** Shown for any server-side problem (5xx, proxy errors, network down) instead of raw technical text. */
export const SERVER_DOWN_MESSAGE = 'Máy chủ đang gặp sự cố hoặc chưa sẵn sàng. Bạn thử lại sau ít phút nhé.';

/** Calls the API. Content-Type is sent only when there is a body (Fastify rejects an empty JSON body). */
export async function api(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(SERVER_DOWN_MESSAGE, 0);
  }
  if (res.status === 401 && !path.startsWith('/auth/')) window.dispatchEvent(new Event('kt-unauthorized'));
  if (!res.ok) {
    if (res.status >= 500) throw new ApiError(SERVER_DOWN_MESSAGE, res.status);
    let msg = res.statusText;
    try {
      msg = (await res.json()).error || msg;
    } catch {
      /* body is not JSON; keep the status text */
    }
    throw new ApiError(msg, res.status);
  }
  return res.json();
}
