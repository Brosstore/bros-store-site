'use strict';

const POSTAL_CODE = /^\d{8}$/;

class ShippingError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'ShippingError';
    this.code = code;
  }
}

function normalizePostalCode(value) {
  const postalCode = String(value || '').replace(/\D/g, '');
  if (!POSTAL_CODE.test(postalCode)) throw new ShippingError('Informe um CEP válido com 8 dígitos.', 'INVALID_ADDRESS');
  return postalCode;
}

function validateDestination(destination) {
  if (!destination || !String(destination.city || '').trim() || !/^[A-Za-z]{2}$/.test(String(destination.state || '').trim())) {
    throw new ShippingError('O endereço de entrega está incompleto.', 'INVALID_ADDRESS');
  }
  return { ...destination, postalCode: normalizePostalCode(destination.postalCode), state: destination.state.trim().toUpperCase() };
}

function createManualQuote(request, config) {
  validateDestination(request.destination);
  if (!Array.isArray(request.items) || !request.items.length || request.items.some((item) => !item.productId || !Number.isInteger(item.quantity) || item.quantity < 1)) {
    throw new ShippingError('Os itens do frete são inválidos.', 'INVALID_ITEMS');
  }
  if (!config || config.enabled !== true) throw new ShippingError('Nenhuma modalidade de entrega está disponível.', 'UNAVAILABLE');
  const amount = Number(config.amountCents);
  const subtotal = Number(request.subtotalCents);
  if (!Number.isSafeInteger(amount) || amount < 0 || !Number.isSafeInteger(subtotal) || subtotal < 0) {
    throw new ShippingError('A configuração do frete manual é inválida.', 'CONFIGURATION_ERROR');
  }
  const freeThreshold = config.freeThresholdCents == null ? null : Number(config.freeThresholdCents);
  const amountCents = Number.isSafeInteger(freeThreshold) && freeThreshold >= 0 && subtotal >= freeThreshold ? 0 : amount;
  return {
    provider: 'manual',
    service: 'manual-standard',
    serviceName: String(config.serviceName || 'Entrega padrão').trim().slice(0, 100) || 'Entrega padrão',
    amountCents,
    estimatedDaysMin: Number.isInteger(config.estimatedDaysMin) ? config.estimatedDaysMin : null,
    estimatedDaysMax: Number.isInteger(config.estimatedDaysMax) ? config.estimatedDaysMax : null,
    metadata: { version: 1, pricing: amountCents === 0 && freeThreshold != null ? 'free_threshold' : 'flat_rate' },
  };
}

module.exports = { ShippingError, normalizePostalCode, validateDestination, createManualQuote };
