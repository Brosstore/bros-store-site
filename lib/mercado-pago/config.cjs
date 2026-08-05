'use strict';

const DEFAULT_SITE_URL = 'https://bros-store-site.vercel.app';
const ENVIRONMENTS = new Set(['test', 'production']);

class MercadoPagoConfigurationError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'MercadoPagoConfigurationError';
    this.code = code;
  }
}

function required(env, name) {
  const value = typeof env[name] === 'string' ? env[name].trim() : '';
  if (!value) {
    throw new MercadoPagoConfigurationError(`Configuração do Mercado Pago ausente: ${name}.`, 'MISSING_CONFIGURATION');
  }
  return value;
}

function validateCredentialFormat(value, name) {
  if (value.startsWith('TEST-') || value.startsWith('APP_USR-')) return;
  throw new MercadoPagoConfigurationError(`Formato inválido para ${name}.`, 'INVALID_CREDENTIAL_FORMAT');
}

function resolvePublicKey(env) {
  const current = typeof env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY === 'string'
    ? env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY.trim()
    : '';
  const legacy = typeof env.NEXT_PUBLIC_MP_PUBLIC_KEY === 'string'
    ? env.NEXT_PUBLIC_MP_PUBLIC_KEY.trim()
    : '';

  if (!current && !legacy) {
    throw new MercadoPagoConfigurationError(
      'Configuração do Mercado Pago ausente: NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY.',
      'MISSING_CONFIGURATION',
    );
  }
  return current || legacy;
}

function resolveEnvironment(env, accessToken, publicKey) {
  validateCredentialFormat(accessToken, 'MERCADO_PAGO_ACCESS_TOKEN');
  validateCredentialFormat(publicKey, 'NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY');

  const configured = typeof env.MERCADO_PAGO_ENVIRONMENT === 'string'
    ? env.MERCADO_PAGO_ENVIRONMENT.trim().toLowerCase()
    : '';
  if (configured && !ENVIRONMENTS.has(configured)) {
    throw new MercadoPagoConfigurationError(
      'MERCADO_PAGO_ENVIRONMENT deve ser test ou production.',
      'INVALID_ENVIRONMENT',
    );
  }
  if (!configured) {
    throw new MercadoPagoConfigurationError(
      'MERCADO_PAGO_ENVIRONMENT deve ser informado explicitamente.',
      'MISSING_ENVIRONMENT',
    );
  }
  if (configured === 'production' && (accessToken.startsWith('TEST-') || publicKey.startsWith('TEST-'))) {
    throw new MercadoPagoConfigurationError(
      'Credenciais TEST-* não podem ser usadas no ambiente de produção.',
      'MIXED_CREDENTIAL_ENVIRONMENTS',
    );
  }
  return configured;
}

function resolveSiteUrl(env) {
  const configured = env.NEXT_PUBLIC_SITE_URL || env.SITE_URL;
  const candidate = configured || (env.VERCEL_URL ? `https://${env.VERCEL_URL}` : DEFAULT_SITE_URL);
  try {
    const url = new URL(candidate);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('invalid');
    return url.origin;
  } catch {
    throw new MercadoPagoConfigurationError(
      'NEXT_PUBLIC_SITE_URL deve ser uma origem HTTP(S) válida.',
      'INVALID_SITE_URL',
    );
  }
}

function getMercadoPagoConfig(env = process.env, options = {}) {
  const accessToken = required(env, 'MERCADO_PAGO_ACCESS_TOKEN');
  const publicKey = resolvePublicKey(env);
  const environment = resolveEnvironment(env, accessToken, publicKey);
  const siteUrl = resolveSiteUrl(env);
  const webhookSecret = options.requireWebhookSecret
    ? required(env, 'MERCADO_PAGO_WEBHOOK_SECRET')
    : undefined;

  return Object.freeze({
    accessToken,
    publicKey,
    webhookSecret,
    environment,
    checkoutMode: env.MERCADO_PAGO_CHECKOUT_MODE === 'transparent' ? 'transparent' : 'pro',
    siteUrl,
    webhookUrl: `${siteUrl}/api/mercado-pago/webhook`,
    getBackUrls(orderId) {
      return Object.freeze({
        success: `${siteUrl}/pedido-confirmado/${orderId}`,
        failure: `${siteUrl}/checkout?pagamento=falhou&pedido=${orderId}`,
        pending: `${siteUrl}/pedido-confirmado/${orderId}?pagamento=pendente`,
      });
    },
    getCheckoutUrl(preference) {
      return environment === 'test' ? preference.sandbox_init_point : preference.init_point;
    },
  });
}

module.exports = {
  MercadoPagoConfigurationError,
  getMercadoPagoConfig,
  resolveEnvironment,
  resolvePublicKey,
  resolveSiteUrl,
};
