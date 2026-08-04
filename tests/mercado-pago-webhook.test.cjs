const assert = require('node:assert/strict');
const { createHmac } = require('node:crypto');
const test = require('node:test');
const {
  InvalidWebhookSignatureError,
  fetchPayment,
  getWebhookPaymentId,
  isPaymentNotification,
  validateWebhookSignature,
} = require('../lib/mercado-pago/webhook.cjs');

const SECRET = 'test-only-webhook-secret';

function signedRequest({ dataId = '123456', signatureDataId = dataId, valid = true } = {}) {
  const requestId = 'request-test-1';
  const timestamp = '1742505638683';
  const manifest = `id:${signatureDataId};request-id:${requestId};ts:${timestamp};`;
  const hash = createHmac('sha256', valid ? SECRET : 'wrong-secret').update(manifest).digest('hex');
  const url = new URL(`https://example.test/webhook?data.id=${dataId}&type=payment`);

  return {
    nextUrl: { searchParams: url.searchParams },
    headers: new Headers({
      'x-request-id': requestId,
      'x-signature': `ts=${timestamp},v1=${hash}`,
    }),
  };
}

test('accepts a valid Mercado Pago signature', () => {
  assert.doesNotThrow(() => validateWebhookSignature(signedRequest(), SECRET));
});

test('rejects an invalid Mercado Pago signature', () => {
  assert.throws(
    () => validateWebhookSignature(signedRequest({ valid: false }), SECRET),
    InvalidWebhookSignatureError,
  );
});

test('extracts payment notifications and rejects conflicting signed/body IDs', () => {
  const request = signedRequest();
  const payload = { type: 'payment', action: 'payment.updated', data: { id: '123456' } };

  assert.equal(isPaymentNotification(payload, request.nextUrl.searchParams), true);
  assert.equal(getWebhookPaymentId(payload, request.nextUrl.searchParams), '123456');
  assert.equal(
    getWebhookPaymentId({ ...payload, data: { id: '999999' } }, request.nextUrl.searchParams),
    '',
  );
});

test('acknowledges a signed simulator ID only when the API returns not found', async () => {
  let calls = 0;
  const payment = await fetchPayment({
    async get({ id }) {
      calls += 1;
      assert.equal(id, '123456');
      throw { message: 'Payment not found', error: 'not_found', status: 404 };
    },
  }, '123456');

  assert.equal(payment, null);
  assert.equal(calls, 1);
});

test('returns a real consultable payment to the synchronization layer', async () => {
  const expected = {
    id: 987654321,
    external_reference: '8f8bf489-b0f5-4f76-9fb8-d44d2753f371',
    status: 'approved',
  };
  const payment = await fetchPayment({ async get() { return expected; } }, String(expected.id));

  assert.deepEqual(payment, expected);
});

test('does not mask real Mercado Pago API failures', async () => {
  const unavailable = { message: 'Service unavailable', error: 'service_unavailable', status: 503 };

  await assert.rejects(
    fetchPayment({ async get() { throw unavailable; } }, '987654321'),
    (error) => error === unavailable,
  );
});

test('repeated notifications remain idempotent for the RPC contract', async () => {
  const rpcState = new Map();
  const sync = async (payment) => {
    const key = String(payment.id);
    const changed = rpcState.get(key) !== payment.status;
    rpcState.set(key, payment.status);
    return { changed };
  };
  const paymentClient = {
    async get() {
      return { id: 987654321, external_reference: 'order-1', status: 'approved' };
    },
  };

  const first = await sync(await fetchPayment(paymentClient, '987654321'));
  const repeated = await sync(await fetchPayment(paymentClient, '987654321'));

  assert.equal(first.changed, true);
  assert.equal(repeated.changed, false);
  assert.equal(rpcState.size, 1);
});
