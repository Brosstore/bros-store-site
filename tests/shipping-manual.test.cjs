const test = require('node:test');
const assert = require('node:assert/strict');
const { createManualQuote, normalizePostalCode } = require('../lib/shipping/manual.cjs');

const request = { destination: { postalCode: '65000-000', city: 'São Luís', state: 'MA' }, items: [{ productId: 'p1', quantity: 2 }], subtotalCents: 10000 };
const config = { enabled: true, serviceName: 'Entrega local', amountCents: 1500, freeThresholdCents: 20000, estimatedDaysMin: 2, estimatedDaysMax: 5 };

test('normaliza CEP e rejeita CEP inválido', () => {
  assert.equal(normalizePostalCode('65000-000'), '65000000');
  assert.throws(() => normalizePostalCode('123'), { code: 'INVALID_ADDRESS' });
});

test('calcula tarifa manual configurada e prazo', () => {
  assert.deepEqual(createManualQuote(request, config), { provider: 'manual', service: 'manual-standard', serviceName: 'Entrega local', amountCents: 1500, estimatedDaysMin: 2, estimatedDaysMax: 5, metadata: { version: 1, pricing: 'flat_rate' } });
});

test('aplica frete grátis somente no limite configurado', () => {
  const quote = createManualQuote({ ...request, subtotalCents: 20000 }, config);
  assert.equal(quote.amountCents, 0);
  assert.equal(quote.metadata.pricing, 'free_threshold');
});

test('não inventa cotação quando o fallback está desabilitado', () => {
  assert.throws(() => createManualQuote(request, { ...config, enabled: false }), { code: 'UNAVAILABLE' });
});

test('rejeita endereço incompleto e itens inválidos', () => {
  assert.throws(() => createManualQuote({ ...request, destination: { postalCode: '65000000', city: '', state: 'MA' } }, config), { code: 'INVALID_ADDRESS' });
  assert.throws(() => createManualQuote({ ...request, items: [] }, config), { code: 'INVALID_ITEMS' });
});
