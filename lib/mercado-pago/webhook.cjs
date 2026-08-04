const {
  InvalidWebhookSignatureError,
  WebhookSignatureValidator,
} = require('mercadopago');

const NUMERIC_ID_PATTERN = /^\d+$/;

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getWebhookPaymentId(payload, searchParams) {
  const queryId = searchParams.get('data.id');
  const bodyId = isRecord(payload?.data) ? payload.data.id : undefined;
  const queryPaymentId = typeof queryId === 'string' ? queryId.trim() : '';
  const bodyPaymentId = typeof bodyId === 'string' || typeof bodyId === 'number'
    ? String(bodyId).trim()
    : '';

  // The signed query parameter is authoritative. A disagreement with the body
  // is rejected instead of letting an authenticated notification select a
  // different resource from the one covered by the HMAC manifest.
  if (queryPaymentId && bodyPaymentId && queryPaymentId !== bodyPaymentId) {
    return '';
  }

  const paymentId = queryPaymentId || bodyPaymentId;
  return NUMERIC_ID_PATTERN.test(paymentId) ? paymentId : '';
}

function isPaymentNotification(payload, searchParams) {
  const bodyType = typeof payload?.type === 'string' ? payload.type.trim().toLowerCase() : '';
  const queryType = (searchParams.get('type') || searchParams.get('topic') || '').trim().toLowerCase();
  const action = typeof payload?.action === 'string' ? payload.action.trim().toLowerCase() : '';

  return bodyType === 'payment'
    || queryType === 'payment'
    || queryType === 'payments'
    || action.startsWith('payment.');
}

function validateWebhookSignature(request, secret) {
  const dataId = request.nextUrl.searchParams.get('data.id')?.trim().toLowerCase();

  WebhookSignatureValidator.validate({
    xSignature: request.headers.get('x-signature'),
    xRequestId: request.headers.get('x-request-id'),
    dataId,
    secret,
  });
}

function getMercadoPagoErrorDetails(error) {
  if (!isRecord(error)) {
    return {
      status: null,
      code: null,
      type: typeof error,
      message: error instanceof Error ? error.message.slice(0, 300) : 'Unknown SDK error',
    };
  }

  const rawStatus = error.status ?? error.statusCode ?? error.api_response?.status;
  const status = Number.isInteger(Number(rawStatus)) ? Number(rawStatus) : null;
  const rawCode = error.code ?? error.error;
  const code = typeof rawCode === 'string' || typeof rawCode === 'number'
    ? String(rawCode).slice(0, 100)
    : null;
  const message = typeof error.message === 'string'
    ? error.message.slice(0, 300)
    : error instanceof Error
      ? error.message.slice(0, 300)
      : 'Unknown SDK error';

  return {
    status,
    code,
    type: error.constructor?.name || 'Object',
    message,
  };
}

function isPaymentNotFoundError(error) {
  const details = getMercadoPagoErrorDetails(error);
  return details.status === 404
    || details.code === 'not_found'
    || details.code === 'resource_not_found';
}

async function fetchPayment(paymentClient, paymentId) {
  try {
    return await paymentClient.get({ id: paymentId });
  } catch (error) {
    if (isPaymentNotFoundError(error)) {
      return null;
    }
    throw error;
  }
}

module.exports = {
  InvalidWebhookSignatureError,
  fetchPayment,
  getMercadoPagoErrorDetails,
  getWebhookPaymentId,
  isPaymentNotification,
  isPaymentNotFoundError,
  isRecord,
  validateWebhookSignature,
};
