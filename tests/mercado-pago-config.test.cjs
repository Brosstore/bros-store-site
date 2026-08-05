const test = require('node:test');
const assert = require('node:assert/strict');
const {
  getMercadoPagoConfig,
  resolveEnvironment,
  resolvePublicKey,
  resolveSiteUrl,
} = require('../lib/mercado-pago/config.cjs');

const testEnv = {
  MERCADO_PAGO_ACCESS_TOKEN: 'TEST-access-token',
  NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY: 'TEST-public-key',
  MERCADO_PAGO_WEBHOOK_SECRET: 'webhook-secret',
  MERCADO_PAGO_ENVIRONMENT: 'test',
  NEXT_PUBLIC_SITE_URL: 'https://example.com/ignored-path',
};

test('resolve a configuração de teste e centraliza URLs', () => {
  const config = getMercadoPagoConfig(testEnv, { requireWebhookSecret: true });
  assert.equal(config.environment, 'test');
  assert.equal(config.siteUrl, 'https://example.com');
  assert.equal(config.webhookUrl, 'https://example.com/api/mercado-pago/webhook');
  assert.deepEqual(config.getBackUrls('order-id'), {
    success: 'https://example.com/pedido-confirmado/order-id',
    failure: 'https://example.com/checkout?pagamento=falhou&pedido=order-id',
    pending: 'https://example.com/pedido-confirmado/order-id?pagamento=pendente',
  });
  assert.equal(config.getCheckoutUrl({ init_point: 'production', sandbox_init_point: 'sandbox' }), 'sandbox');
});

test('aceita temporariamente o nome legado da chave pública', () => {
  const env = { ...testEnv, NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY: '', NEXT_PUBLIC_MP_PUBLIC_KEY: 'TEST-legacy-key' };
  assert.equal(resolvePublicKey(env), 'TEST-legacy-key');
});

test('rejeita nomes atual e legado com valores diferentes', () => {
  const env = { ...testEnv, NEXT_PUBLIC_MP_PUBLIC_KEY: 'TEST-other-key' };
  assert.throws(() => resolvePublicKey(env), { code: 'CONFLICTING_PUBLIC_KEYS' });
});

test('infere o ambiente pelas credenciais quando a variável explícita ainda não existe', () => {
  const env = { ...testEnv, MERCADO_PAGO_ENVIRONMENT: '' };
  assert.equal(resolveEnvironment(env, env.MERCADO_PAGO_ACCESS_TOKEN, env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY), 'test');
});

test('rejeita mistura de token de teste e chave de produção', () => {
  const env = { ...testEnv, NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY: 'APP_USR-production-key' };
  assert.throws(() => getMercadoPagoConfig(env), { code: 'MIXED_CREDENTIAL_ENVIRONMENTS' });
});

test('rejeita ambiente explícito incompatível com as credenciais', () => {
  const env = { ...testEnv, MERCADO_PAGO_ENVIRONMENT: 'production' };
  assert.throws(() => getMercadoPagoConfig(env), { code: 'MIXED_CREDENTIAL_ENVIRONMENTS' });
});

test('rejeita credenciais ausentes sem incluir segredos no erro', () => {
  assert.throws(
    () => getMercadoPagoConfig({ NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY: 'TEST-public-key' }),
    (error) => error.code === 'MISSING_CONFIGURATION' && !error.message.includes('TEST-public-key'),
  );
});

test('normaliza uma URL válida e rejeita protocolos inseguros', () => {
  assert.equal(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: 'https://shop.example/path' }), 'https://shop.example');
  assert.throws(() => resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: 'javascript:alert(1)' }), { code: 'INVALID_SITE_URL' });
});
