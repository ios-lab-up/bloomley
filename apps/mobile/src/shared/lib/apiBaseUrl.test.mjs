import assert from 'node:assert/strict';
import { test } from 'node:test';

import { resolveApiBaseUrl } from './apiBaseUrl.ts';

test('explicit env URL wins over the Metro host', () => {
  assert.equal(
    resolveApiBaseUrl({ envUrl: 'https://staging.bloomley.app/', hostUri: '172.25.223.47:8081' }),
    'https://staging.bloomley.app',
  );
});

test('blank env URL falls back to the Metro host', () => {
  assert.equal(
    resolveApiBaseUrl({ envUrl: '  ', hostUri: '172.25.223.47:8081' }),
    'http://172.25.223.47:8000',
  );
});

test('follows the Mac when the network changes', () => {
  assert.equal(resolveApiBaseUrl({ hostUri: '192.168.1.16:8081' }), 'http://192.168.1.16:8000');
  assert.equal(resolveApiBaseUrl({ hostUri: 'localhost:8081' }), 'http://localhost:8000');
});

test('tunnel host is not reused for the API', () => {
  assert.equal(resolveApiBaseUrl({ hostUri: 'abc-anonymous-8081.exp.direct' }), 'http://localhost:8000');
});

test('no host at all (production build) -> localhost', () => {
  assert.equal(resolveApiBaseUrl({ hostUri: null }), 'http://localhost:8000');
  assert.equal(resolveApiBaseUrl({}), 'http://localhost:8000');
});

test('custom API port', () => {
  assert.equal(resolveApiBaseUrl({ hostUri: '10.0.0.5:8081', apiPort: 9000 }), 'http://10.0.0.5:9000');
});
