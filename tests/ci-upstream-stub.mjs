import http from 'node:http';

const HOST = '127.0.0.1';
const PORT = Number(process.env.SCD_CI_UPSTREAM_PORT || 18080);

const EMPTY_READ_PAYLOADS = Object.freeze({
  'public.feed': { items: [] },
  'public.calendar': { rows: [] },
  'public.club': {},
  'public.datafabric.contract': { sources: [] }
});

const PUBLIC_WRITE_ACTIONS = new Set([
  'public.register',
  'public.registration',
  'public.partnerLead',
  'public.communitySubmit',
  'public.ticketSubmit',
  'public.telemetry'
]);

function send(res, status, payload) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  });
  res.end(JSON.stringify(payload));
}

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    return send(res, 200, { ok: true, service: 'SCD deterministic CI upstream' });
  }

  if (req.method !== 'POST') {
    return send(res, 405, { ok: false, error: 'CI_STUB_METHOD_NOT_ALLOWED' });
  }

  let raw = '';
  req.on('data', chunk => {
    raw += chunk;
    if (raw.length > 1_000_000) req.destroy();
  });

  req.on('end', () => {
    try {
      const body = JSON.parse(raw || '{}');
      const action = String(body.action || '');

      if (Object.prototype.hasOwnProperty.call(EMPTY_READ_PAYLOADS, action)) {
        return send(res, 200, { ok: true, data: EMPTY_READ_PAYLOADS[action] });
      }

      if (action.startsWith('public.') && !PUBLIC_WRITE_ACTIONS.has(action)) {
        return send(res, 200, { ok: true, data: {} });
      }

      if (PUBLIC_WRITE_ACTIONS.has(action)) {
        return send(res, 200, { ok: false, error: 'CI_STUB_WRITE_DISABLED' });
      }

      if (/^(auth|private|direction)\./.test(action)) {
        return send(res, 200, { ok: false, error: 'CI_STUB_UNAUTHORIZED' });
      }

      return send(res, 200, { ok: false, error: 'CI_STUB_ACTION_DISABLED' });
    } catch {
      return send(res, 400, { ok: false, error: 'CI_STUB_INVALID_JSON' });
    }
  });
});

server.listen(PORT, HOST, () => {
  console.log(`SCD deterministic CI upstream listening on http://${HOST}:${PORT}`);
});

function shutdown() {
  server.close(() => process.exit(0));
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
