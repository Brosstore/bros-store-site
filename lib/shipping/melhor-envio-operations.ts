import 'server-only';
import { credentials } from './melhor-envio-server';
import { buildCartPayload, extractExternalOrderId, normalizeTracking } from './operations';

type Db = Awaited<ReturnType<typeof credentials>>['db'];

class ProviderError extends Error {
  code: string;
  status: number;
  constructor(code: string, status: number) { super('Operação logística não concluída.'); this.name = 'ProviderError'; this.code = code; this.status = status; }
}

async function providerRequest(access: string, cfg: any, path: string, body?: unknown, method = 'POST') {
  const response = await fetch(`${cfg.baseUrl}${path}`, {
    method,
    headers: { Authorization: `Bearer ${access}`, Accept: 'application/json', 'Content-Type': 'application/json', 'User-Agent': cfg.userAgent },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new ProviderError(`MELHOR_ENVIO_${response.status}`, response.status);
  return payload;
}

async function loadOrderContext(db: Db, orderId: string) {
  const { data: order, error } = await db.from('orders').select('*,order_items(*)').eq('id', orderId).maybeSingle();
  if (error || !order) throw Object.assign(new Error('Pedido não encontrado.'), { code: 'ORDER_NOT_FOUND' });
  if (order.status === 'cancelado') throw Object.assign(new Error('Pedido cancelado não pode gerar etiqueta.'), { code: 'ORDER_CANCELLED' });
  if (order.shipping_provider !== 'melhor_envio') throw Object.assign(new Error('Este pedido não utiliza o Melhor Envio.'), { code: 'INVALID_PROVIDER' });
  const [{ data: address }, { data: customer }, { data: settings }, authUser] = await Promise.all([
    db.from('addresses').select('*').eq('id', order.address_id).maybeSingle(),
    db.from('profile').select('nome,sobrenome,telefone').eq('id', order.customer_id).maybeSingle(),
    db.from('store_settings').select('*').eq('id', true).maybeSingle(),
    db.auth.admin.getUserById(order.customer_id),
  ]);
  if (!address) throw Object.assign(new Error('Endereço de entrega indisponível.'), { code: 'ADDRESS_NOT_FOUND' });
  if (!settings) throw Object.assign(new Error('Configurações de envio indisponíveis.'), { code: 'SETTINGS_NOT_FOUND' });
  return { order, address, customer, settings, customerEmail: authUser.data.user?.email || '' };
}

async function addEvent(db: Db, shipmentId: string, status: string, source: 'admin' | 'melhor_envio' | 'sistema', description: string, providerEventId?: string | null, occurredAt?: string | null) {
  const record = { shipment_id: shipmentId, status, source, description, provider_event_id: providerEventId || null, occurred_at: occurredAt || new Date().toISOString() };
  const query = db.from('shipment_events');
  if (record.provider_event_id) await query.upsert(record, { onConflict: 'shipment_id,provider_event_id', ignoreDuplicates: true });
  else await query.insert(record);
}

export async function prepareMelhorEnvioShipment(orderId: string) {
  const { access, cfg, db } = await credentials();
  const context = await loadOrderContext(db, orderId);
  const { data: existing } = await db.from('shipments').select('*').eq('order_id', orderId).maybeSingle();
  if (existing?.external_order_id) return { shipment: existing, existing: true };
  const payload = await providerRequest(access, cfg, '/api/v2/me/cart', buildCartPayload(context));
  const externalOrderId = extractExternalOrderId(payload);
  if (!externalOrderId) throw new ProviderError('MELHOR_ENVIO_INVALID_CART_RESPONSE', 502);
  const metadata = context.order.shipping_quote_metadata || {};
  const record = {
    order_id: orderId, provider: 'melhor_envio', carrier: metadata.company || null,
    service_name: context.order.shipping_service_name, external_service_id: String(metadata.external_service_id || ''),
    quoted_amount_cents: context.order.shipping, estimated_days_min: context.order.shipping_estimated_days_min,
    estimated_days_max: context.order.shipping_estimated_days_max, logistics_status: 'em_preparacao', label_status: 'carrinho_criado',
    external_order_id: externalOrderId, cart_created_at: new Date().toISOString(), last_error_code: null,
  };
  const { data: shipment, error } = await db.from('shipments').upsert(record, { onConflict: 'order_id' }).select('*').single();
  if (error || !shipment) throw Object.assign(new Error('Não foi possível persistir a remessa.'), { code: error?.code || 'SHIPMENT_SAVE_FAILED' });
  await addEvent(db, shipment.id, 'carrinho_criado', 'melhor_envio', 'Etiqueta preparada no carrinho do Melhor Envio.');
  await db.from('orders').update({ status: context.order.status === 'confirmado' ? 'em_preparo' : context.order.status }).eq('id', orderId);
  return { shipment, existing: false };
}

export async function purchaseMelhorEnvioShipment(orderId: string, idempotencyKey: string) {
  const { access, cfg, db } = await credentials();
  const { data: reserved, error: reserveError } = await db.rpc('reserve_shipment_purchase', { p_order_id: orderId, p_idempotency_key: idempotencyKey });
  const reservation = Array.isArray(reserved) ? reserved[0] : reserved;
  if (reserveError || !reservation) throw Object.assign(new Error('Não foi possível reservar a compra da etiqueta.'), { code: reserveError?.code || 'PURCHASE_RESERVATION_FAILED' });
  const shipmentId = reservation.shipment_id as string;
  const externalOrderId = reservation.external_order_id as string;
  if (reservation.label_status === 'gerada') return { shipmentId, existing: true };
  if (reservation.label_status !== 'comprada') {
    try {
      await providerRequest(access, cfg, '/api/v2/me/shipment/checkout', { orders: [externalOrderId] });
      await db.from('shipments').update({ label_status: 'comprada', purchased_at: new Date().toISOString(), last_error_code: null }).eq('id', shipmentId);
      await addEvent(db, shipmentId, 'comprada', 'melhor_envio', 'Compra da etiqueta confirmada pelo Melhor Envio.');
    } catch (error: any) {
      await db.from('shipments').update({ label_status: 'falhou', last_error_code: String(error?.code || 'PROVIDER_ERROR').slice(0, 100) }).eq('id', shipmentId);
      throw error;
    }
  }
  try {
    await providerRequest(access, cfg, '/api/v2/me/shipment/generate', { orders: [externalOrderId] });
    await db.from('shipments').update({ label_status: 'gerada', logistics_status: 'pronto_para_envio', label_generated_at: new Date().toISOString(), last_error_code: null }).eq('id', shipmentId);
    await db.from('orders').update({ status: 'pronto_para_envio' }).eq('id', orderId).neq('status', 'cancelado');
    await addEvent(db, shipmentId, 'pronto_para_envio', 'melhor_envio', 'Etiqueta gerada e pedido pronto para envio.');
    return { shipmentId, existing: Boolean(reservation.existing) };
  } catch (error: any) {
    await db.from('shipments').update({ label_status: 'comprada', last_error_code: String(error?.code || 'PROVIDER_ERROR').slice(0, 100) }).eq('id', shipmentId);
    throw error;
  }
}

export async function getMelhorEnvioLabelUrl(orderId: string) {
  const { access, cfg, db } = await credentials();
  const { data: shipment } = await db.from('shipments').select('external_order_id,label_status').eq('order_id', orderId).maybeSingle();
  if (!shipment?.external_order_id || shipment.label_status !== 'gerada') throw Object.assign(new Error('A etiqueta ainda não foi gerada.'), { code: 'LABEL_NOT_READY' });
  const payload = await providerRequest(access, cfg, '/api/v2/me/shipment/print', { mode: 'public', orders: [shipment.external_order_id] });
  const candidate = typeof payload === 'string' ? payload : payload?.url;
  const url = new URL(String(candidate || ''));
  if (url.protocol !== 'https:' || !(url.hostname === 'melhorenvio.com.br' || url.hostname.endsWith('.melhorenvio.com.br'))) throw new ProviderError('INVALID_LABEL_URL', 502);
  return url.toString();
}

export async function syncMelhorEnvioTracking(orderId: string) {
  const { access, cfg, db } = await credentials();
  const { data: shipment } = await db.from('shipments').select('*').eq('order_id', orderId).maybeSingle();
  if (!shipment?.external_order_id) throw Object.assign(new Error('Remessa ainda não preparada.'), { code: 'SHIPMENT_NOT_READY' });
  const payload = await providerRequest(access, cfg, '/api/v2/me/shipment/tracking', { orders: [shipment.external_order_id] });
  const tracking = normalizeTracking(payload, shipment.external_order_id);
  const now = new Date().toISOString();
  const values: Record<string, unknown> = { provider_status: tracking.providerStatus, tracking_code: tracking.trackingCode || shipment.tracking_code, tracking_last_synced_at: now, last_error_code: null };
  if (tracking.logisticsStatus) values.logistics_status = tracking.logisticsStatus;
  if (tracking.logisticsStatus === 'enviado' && !shipment.shipped_at) values.shipped_at = now;
  if (tracking.logisticsStatus === 'entregue' && !shipment.delivered_at) values.delivered_at = now;
  if (tracking.logisticsStatus === 'cancelado' && !shipment.cancelled_at) values.cancelled_at = now;
  await db.from('shipments').update(values).eq('id', shipment.id);
  for (const event of tracking.events) await addEvent(db, shipment.id, event.status, 'melhor_envio', event.description || 'Atualização recebida do Melhor Envio.', event.providerEventId, event.occurredAt);
  if (tracking.logisticsStatus) {
    const orderStatus = tracking.logisticsStatus === 'em_preparacao' ? 'em_preparo' : tracking.logisticsStatus;
    await db.from('orders').update({ status: orderStatus }).eq('id', orderId).neq('status', 'cancelado');
  }
  return tracking;
}
