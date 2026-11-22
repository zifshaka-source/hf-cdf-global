import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveApiUrl, safeParseJsonResponse } from './api';

test('safeParseJsonResponse parses valid JSON cleanly', async () => {
  const res = new Response(JSON.stringify({ ok: true, count: 3 }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
  const data = await safeParseJsonResponse<{ ok: boolean; count: number }>(res);
  assert.equal(data.ok, true);
  assert.equal(data.count, 3);
});

test('safeParseJsonResponse replaces Vercel plain-text 404 parse crash with actionable error', async () => {
  const res = new Response('The page could not be found', {
    status: 404,
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
  await assert.rejects(
    () => safeParseJsonResponse(res),
    (err: Error) =>
      err.message.includes('HTTP 404') &&
      err.message.includes('The page could not be found') &&
      !err.message.includes('Unexpected token')
  );
});

test('resolveApiUrl preserves relative paths when VITE_API_BASE_URL is unset', () => {
  assert.equal(resolveApiUrl('/api/v1/auth/status'), '/api/v1/auth/status');
  assert.equal(resolveApiUrl('https://example.com/api/health'), 'https://example.com/api/health');
});
