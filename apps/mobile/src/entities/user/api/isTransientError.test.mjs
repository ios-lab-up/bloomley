import assert from 'node:assert/strict';
import { test } from 'node:test';

import { isTransientError } from './isTransientError.ts';

test('network failure (no HTTP response) is retried', () => {
  assert.equal(isTransientError(new TypeError('Network request failed')), true);
});

test('5xx is retried', () => {
  assert.equal(isTransientError({ status: 500 }), true);
  assert.equal(isTransientError({ status: 503 }), true);
});

test('4xx and our own timeout (status 0) are not retried', () => {
  assert.equal(isTransientError({ status: 401 }), false);
  assert.equal(isTransientError({ status: 404 }), false);
  assert.equal(isTransientError({ status: 0 }), false);
});
