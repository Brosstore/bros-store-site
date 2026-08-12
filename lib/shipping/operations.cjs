'use strict';

const PROVIDER_STATUS_MAP = Object.freeze({
  pending: 'confirmado',
  released: 'pronto_para_envio',
  posted: 'enviado',
  delivered: 'entregue',
  undelivered: 'enviado',
  suspended: 'em_preparacao',
  canceled: 'cancelado',
  cancelled: 'cancelado',
});

function digits(value) { return String(value || '').replace(/\D/g, ''); }
function text(value, max = 200) { return typeof value === 'string' ? value.trim().slice(0, max) : ''; }

function buildCartPayload(input) {
  const { order, address, customer, customerEmail, settings } = input;
  const metadata = order.shipping_quote_metadata || {};
  const service = Number(metadata.external_service_id);
  const companyDocument = digits(settings.shipping_sender_company_document);
  const document = digits(settings.shipping_sender_document);
  if (!Number.isSafeInteger(service) || service <= 0) throw Object.assign(new Error('Serviço da cotação indisponível.'), { code: 'INVALID_SERVICE' });
  if (!settings.shipping_sender_name || !settings.shipping_sender_address || !settings.shipping_sender_number || !settings.shipping_sender_district || !settings.shipping_sender_city || !settings.shipping_sender_state) throw Object.assign(new Error('Complete os dados do remetente nas configurações.'), { code: 'SENDER_INCOMPLETE' });
  if (!document && !companyDocument) throw Object.assign(new Error('Informe o CPF ou CNPJ do remetente nas configurações.'), { code: 'SENDER_DOCUMENT_MISSING' });
  if (settings.shipping_content_declaration_enabled !== true) throw Object.assign(new Error('Confirme nas configurações se a loja está apta a usar declaração de conteúdo antes de preparar etiquetas.'), { code: 'FISCAL_CONFIGURATION_REQUIRED' });
  const items = Array.isArray(order.order_items) ? order.order_items : [];
  if (!items.length) throw Object.assign(new Error('Pedido sem itens para envio.'), { code: 'ORDER_EMPTY' });
  const totalQuantity = items.reduce((total, item) => total + Number(item.quantity || 0), 0);
  const insuranceValue = items.reduce((total, item) => total + Number(item.subtotal || 0), 0) / 100;
  const from = {
    name: text(settings.shipping_sender_name, 100), email: text(settings.email, 150), phone: digits(settings.shipping_sender_phone || settings.whatsapp),
    document: companyDocument ? '' : document, company_document: companyDocument, state_register: text(settings.shipping_sender_state_register, 30),
    address: text(settings.shipping_sender_address, 150), complement: text(settings.shipping_sender_complement, 80), number: text(settings.shipping_sender_number, 20),
    district: text(settings.shipping_sender_district, 80), city: text(settings.shipping_sender_city, 80), postal_code: digits(settings.shipping_origin_postal_code), state_abbr: text(settings.shipping_sender_state, 2).toUpperCase(),
  };
  const to = {
    name: text(address.destinatario || `${customer?.nome || ''} ${customer?.sobrenome || ''}`, 100), email: text(customerEmail, 150), phone: digits(customer?.telefone),
    document: '', company_document: '', state_register: '', address: text(address.rua, 150), complement: text(address.complemento, 80), number: text(address.numero, 20),
    district: text(address.bairro, 80), city: text(address.cidade, 80), postal_code: digits(address.cep), state_abbr: text(address.estado, 2).toUpperCase(),
  };
  return {
    service,
    from,
    to,
    products: items.map((item) => ({ name: text(item.product_name, 100), quantity: Number(item.quantity), unitary_value: Number(item.unit_price) / 100 })),
    volumes: [{ height: Number(settings.shipping_default_height_cm), width: Number(settings.shipping_default_width_cm), length: Number(settings.shipping_default_length_cm), weight: (Number(settings.shipping_default_weight_grams) * Math.max(totalQuantity, 1)) / 1000 }],
    options: { insurance_value: insuranceValue, receipt: false, own_hand: false, reverse: false, non_commercial: true, platform: 'Bros Store', reminder: `Pedido #${order.order_number}`, tags: [{ tag: `Pedido #${order.order_number}`, url: null }] },
  };
}

function extractExternalOrderId(payload) {
  const value = payload && typeof payload === 'object' ? (payload.id || payload.order_id) : null;
  return value ? String(value) : null;
}

function normalizeTracking(payload, externalOrderId) {
  const root = payload && typeof payload === 'object' ? payload : {};
  const record = root[externalOrderId] || root.data?.[externalOrderId] || root.data || root;
  const status = text(record.status || record.state || root.status, 80).toLowerCase();
  const trackingCode = text(record.tracking || record.tracking_code || record.protocol || root.tracking, 120) || null;
  const events = Array.isArray(record.events || record.history) ? (record.events || record.history) : [];
  return {
    providerStatus: status || null,
    logisticsStatus: PROVIDER_STATUS_MAP[status] || null,
    trackingCode,
    events: events.map((event, index) => ({
      providerEventId: text(event.id || event.event_id, 160) || `${status || 'evento'}-${text(event.date || event.created_at, 50)}-${index}`,
      status: text(event.status || event.state || status || 'atualizacao', 80),
      description: text(event.description || event.message, 500) || null,
      occurredAt: event.date || event.created_at || null,
    })),
  };
}

module.exports = { PROVIDER_STATUS_MAP, buildCartPayload, extractExternalOrderId, normalizeTracking };
