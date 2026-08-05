'use strict';

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getOrderPayment(order) {
  const payments = isRecord(order?.transactions) && Array.isArray(order.transactions.payments)
    ? order.transactions.payments
    : [];
  return payments.find(isRecord) || null;
}

function normalizeOrderPayment(order) {
  const payment = getOrderPayment(order);
  const orderStatus = typeof order?.status === 'string' ? order.status : '';
  const status = typeof payment?.status === 'string' ? payment.status : orderStatus;
  const statusDetail = typeof payment?.status_detail === 'string'
    ? payment.status_detail
    : (typeof order?.status_detail === 'string' ? order.status_detail : '');

  let legacyStatus = 'pending';
  if (['accredited', 'approved'].includes(statusDetail) || ['processed', 'approved'].includes(status)) legacyStatus = 'approved';
  else if (['rejected', 'declined', 'failed'].includes(status) || statusDetail.startsWith('cc_rejected')) legacyStatus = 'rejected';
  else if (['cancelled', 'canceled', 'expired'].includes(status)) legacyStatus = 'cancelled';
  else if (['refunded', 'charged_back'].includes(status)) legacyStatus = 'refunded';
  else if (['processing', 'in_process'].includes(status)) legacyStatus = 'in_process';

  const paymentMethod = isRecord(payment?.payment_method) ? payment.payment_method : {};
  return {
    orderId: typeof order?.id === 'string' ? order.id : '',
    externalReference: typeof order?.external_reference === 'string' ? order.external_reference : '',
    paymentId: payment?.id == null ? '' : String(payment.id),
    status: legacyStatus,
    statusDetail: statusDetail || status || null,
    paymentMethod: typeof paymentMethod.id === 'string' ? paymentMethod.id : null,
    installments: Number.isInteger(paymentMethod.installments) ? paymentMethod.installments : null,
    qrCode: typeof paymentMethod.qr_code === 'string' ? paymentMethod.qr_code : null,
    qrCodeBase64: typeof paymentMethod.qr_code_base64 === 'string' ? paymentMethod.qr_code_base64 : null,
    ticketUrl: typeof paymentMethod.ticket_url === 'string' ? paymentMethod.ticket_url : null,
  };
}

function buildOrderRequest({ amount, externalReference, payerEmail, paymentMethod }) {
  const body = {
    type: 'online',
    processing_mode: 'automatic',
    total_amount: amount,
    external_reference: externalReference,
    payer: { email: payerEmail },
    transactions: { payments: [{ amount, payment_method: paymentMethod }] },
  };
  return body;
}

module.exports = { buildOrderRequest, getOrderPayment, isRecord, normalizeOrderPayment };
