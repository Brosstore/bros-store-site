const test = require('node:test');
const assert = require('node:assert/strict');
const { buildOrderRequest, normalizeOrderPayment } = require('../lib/mercado-pago/orders.cjs');

test('monta uma order Pix sem confiar em preço do navegador', () => {
  const body = buildOrderRequest({
    amount: '129.90', externalReference: 'order-id', payerEmail: 'buyer@example.com',
    paymentMethod: { id: 'pix', type: 'bank_transfer' },
  });
  assert.equal(body.total_amount, '129.90');
  assert.equal(body.transactions.payments[0].amount, '129.90');
  assert.equal(body.transactions.payments[0].payment_method.id, 'pix');
});

test('normaliza uma order aprovada para o contrato existente', () => {
  const normalized = normalizeOrderPayment({
    id: 'ORD123', external_reference: 'order-id', status: 'processed', status_detail: 'accredited',
    transactions: { payments: [{ id: 'PAY123', status: 'processed', status_detail: 'accredited', payment_method: { id: 'master', installments: 2 } }] },
  });
  assert.deepEqual(normalized, {
    orderId: 'ORD123', externalReference: 'order-id', paymentId: 'PAY123', status: 'approved',
    statusDetail: 'accredited', paymentMethod: 'master', installments: 2,
    qrCode: null, qrCodeBase64: null, ticketUrl: null,
  });
});

test('extrai dados seguros do Pix pendente', () => {
  const normalized = normalizeOrderPayment({
    id: 'ORDPIX', external_reference: 'order-id', status: 'action_required',
    transactions: { payments: [{ id: 'PAYPIX', status: 'action_required', status_detail: 'waiting_transfer', payment_method: { id: 'pix', qr_code: 'copy-code', qr_code_base64: 'image', ticket_url: 'https://example.com' } }] },
  });
  assert.equal(normalized.status, 'pending');
  assert.equal(normalized.qrCode, 'copy-code');
  assert.equal(normalized.qrCodeBase64, 'image');
});
