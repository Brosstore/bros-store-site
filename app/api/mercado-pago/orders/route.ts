import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js';
import { createClient } from '../../../../lib/supabase/server';
import { getMercadoPagoConfig } from '../../../../lib/mercado-pago/config';
import ordersUtils from '../../../../lib/mercado-pago/orders.cjs';

const { buildOrderRequest, normalizeOrderPayment } = ordersUtils;
const ONLINE_PAYMENT_METHODS = new Set(['mercado_pago_pix', 'mercado_pago_cartao']);
const CARD_TYPES = new Set(['credit_card', 'debit_card']);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type CheckoutItemInput = { productId: string; selectedSize?: string; selectedColor?: string; quantity: number };
type CardInput = { token: string; paymentMethodId: string; paymentTypeId: string; installments: number; identification?: { type: string; number: string } };
type OrderBody = { addressId: string; notes?: string; items: CheckoutItemInput[]; paymentMethod: string; idempotencyKey: string; card?: CardInput };

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function text(value: unknown, maxLength: number) { return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''; }

function parseCard(value: unknown): CardInput | null {
  if (!isRecord(value)) return null;
  const token = text(value.token, 300);
  const paymentMethodId = text(value.paymentMethodId, 50);
  const paymentTypeId = text(value.paymentTypeId, 30);
  const installments = value.installments;
  if (!/^[A-Za-z0-9_-]{20,300}$/.test(token) || !/^[A-Za-z0-9_-]{2,50}$/.test(paymentMethodId)
    || !CARD_TYPES.has(paymentTypeId) || typeof installments !== 'number' || !Number.isInteger(installments) || installments < 1 || installments > 24) return null;
  const identification = isRecord(value.identification)
    ? { type: text(value.identification.type, 20), number: text(value.identification.number, 30).replace(/\D/g, '') }
    : undefined;
  return { token, paymentMethodId, paymentTypeId, installments, identification };
}

function parseBody(value: unknown): OrderBody | null {
  if (!isRecord(value) || !UUID_PATTERN.test(text(value.addressId, 36)) || !UUID_PATTERN.test(text(value.idempotencyKey, 36))) return null;
  const paymentMethod = text(value.paymentMethod, 50);
  if (!ONLINE_PAYMENT_METHODS.has(paymentMethod) || !Array.isArray(value.items) || !value.items.length || value.items.length > 50) return null;
  const items = value.items.map((item) => {
    if (!isRecord(item) || !UUID_PATTERN.test(text(item.productId, 36)) || typeof item.quantity !== 'number' || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) return null;
    return { productId: text(item.productId, 36), selectedSize: text(item.selectedSize, 100), selectedColor: text(item.selectedColor, 100), quantity: item.quantity };
  });
  if (items.some((item) => item === null)) return null;
  const card = paymentMethod === 'mercado_pago_cartao' ? parseCard(value.card) : undefined;
  if (paymentMethod === 'mercado_pago_cartao' && !card) return null;
  return { addressId: text(value.addressId, 36), idempotencyKey: text(value.idempotencyKey, 36), notes: text(value.notes, 1000), paymentMethod, items: items as CheckoutItemInput[], card: card || undefined };
}

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('PAYMENT_STORAGE_UNAVAILABLE');
  return createSupabaseAdminClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function clientError(message: string, status = 400) { return NextResponse.json({ error: message }, { status }); }

async function requestOrder(accessToken: string, idempotencyKey: string, body?: unknown, orderId?: string) {
  const response = await fetch(`https://api.mercadopago.com/v1/orders${orderId ? `/${encodeURIComponent(orderId)}` : ''}`, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json', 'X-Idempotency-Key': idempotencyKey } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok || !isRecord(payload)) {
    console.error('Mercado Pago Orders: solicitação não concluída.', { status: response.status, operation: body ? 'create' : 'get' });
    throw new Error(response.status === 429 ? 'RATE_LIMITED' : 'PROVIDER_ERROR');
  }
  return payload as Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  let config;
  try {
    config = getMercadoPagoConfig();
    if (config.checkoutMode !== 'transparent') throw new Error('MODE_DISABLED');
  } catch { return clientError('O pagamento transparente não está disponível no momento.', 503); }

  const body = parseBody(await request.json().catch(() => null));
  if (!body) return clientError('Dados de pagamento inválidos.');
  const supabase = createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user?.email) return clientError('Sua sessão expirou. Entre novamente.', 401);

  const { data: rpcData, error: rpcError } = await supabase.rpc('start_mercado_pago_order', {
    p_address_id: body.addressId, p_notes: body.notes || '', p_items: body.items,
    p_idempotency_key: body.idempotencyKey, p_payment_method: body.paymentMethod,
  });
  if (rpcError) return clientError('Não foi possível iniciar o pagamento.', rpcError.code === '28000' || rpcError.code === '42501' ? 401 : 400);
  const attemptStart = Array.isArray(rpcData) ? rpcData[0] : rpcData;
  if (!attemptStart?.order_id || !attemptStart?.payment_attempt_id) return clientError('Não foi possível preparar o pagamento.', 500);

  const orderId = String(attemptStart.order_id);
  const attemptId = String(attemptStart.payment_attempt_id);
  const [{ data: order }, { data: attempt }] = await Promise.all([
    supabase.from('orders').select('id,order_number,total').eq('id', orderId).eq('customer_id', authData.user.id).maybeSingle(),
    supabase.from('payment_attempts').select('id,external_reference,external_order_id').eq('id', attemptId).eq('order_id', orderId).maybeSingle(),
  ]);
  if (!order || !attempt || attempt.external_reference !== orderId) return clientError('Não foi possível validar o pedido.', 500);

  let externalOrder: Record<string, unknown>;
  try {
    if (attempt.external_order_id) externalOrder = await requestOrder(config.accessToken, body.idempotencyKey, undefined, attempt.external_order_id);
    else {
      const amount = (Number(order.total) / 100).toFixed(2);
      const paymentMethod = body.paymentMethod === 'mercado_pago_pix'
        ? { id: 'pix', type: 'bank_transfer' }
        : { id: body.card!.paymentMethodId, type: body.card!.paymentTypeId, token: body.card!.token, installments: body.card!.installments };
      const requestBody = buildOrderRequest({ amount, externalReference: orderId, payerEmail: authData.user.email, paymentMethod });
      if (body.card?.identification?.type && body.card.identification.number) requestBody.payer.identification = body.card.identification;
      externalOrder = await requestOrder(config.accessToken, body.idempotencyKey, requestBody);
    }
  } catch (error) {
    return clientError(error instanceof Error && error.message === 'RATE_LIMITED' ? 'Muitas tentativas. Aguarde alguns instantes.' : 'Não foi possível processar o pagamento.', 502);
  }

  const normalized = normalizeOrderPayment(externalOrder);
  if (!normalized.orderId || normalized.externalReference !== orderId) return clientError('Resposta inválida do processador de pagamentos.', 502);
  const paymentAdmin = adminClient();
  const { error: saveError } = await paymentAdmin.rpc('save_mercado_pago_order', { p_payment_attempt_id: attemptId, p_order_id: orderId, p_external_order_id: normalized.orderId });
  if (saveError) return clientError('Não foi possível registrar o pagamento.', 500);
  if (normalized.paymentId || normalized.status !== 'pending') {
    const { error: syncError } = await paymentAdmin.rpc('sync_mercado_pago_payment', {
      p_external_payment_id: normalized.paymentId || null, p_external_reference: orderId, p_status: normalized.status,
      p_status_detail: normalized.statusDetail, p_payment_method: normalized.paymentMethod, p_installments: normalized.installments,
    });
    if (syncError) return clientError('Não foi possível sincronizar o pagamento.', 500);
  }
  return NextResponse.json({
    orderId, orderNumber: Number(order.order_number), externalOrderId: normalized.orderId, status: normalized.status,
    statusDetail: normalized.statusDetail,
    pix: normalized.qrCode ? { qrCode: normalized.qrCode, qrCodeBase64: normalized.qrCodeBase64, ticketUrl: normalized.ticketUrl } : null,
  });
}
