/** Every failure becomes `{ error: message }` (the frontend shows `.error`); unknown failures are a plain 500. */
export function setErrorHandler(app) {
  app.setErrorHandler((err, req, reply) => {
    if (err.name === 'ZodError' || Array.isArray(err.issues)) {
      return reply.code(400).send({ error: err.issues?.[0]?.message || 'Dữ liệu không hợp lệ' });
    }
    const status = err.statusCode && err.statusCode < 500 ? err.statusCode : 500;
    if (status === 500) console.error(`[api] ${req.method} ${req.url} -> 500:`, err.message, err.code ? `(pg ${err.code})` : '', err.position ? `at SQL position ${err.position}` : '', '\n', err.stack);
    return reply.code(status).send({ error: status === 500 ? 'Internal Server Error' : err.message });
  });
  app.setNotFoundHandler((req, reply) => reply.code(404).send({ error: 'Not Found' }));
}
