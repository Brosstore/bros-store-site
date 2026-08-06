import { MercadoPagoConfig, Preference } from 'mercadopago';
import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js';
import { createClient } from '../../../../lib/supabase/server';
import { getMercadoPagoConfig } from '../../../../lib/mercado-pago/config';

const ONLINE_PAYMENT_METHODS = new Set([
  'mercado_pago_pix',
  'mercado_pago_cartao',
]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type CheckoutItemInput = {
  productId: string;
  selectedSize?: string;
  selectedColor?: string;
  quantity: number;
};

type CreatePaymentBody = {
  addressId: string;
  notes?: string;
  items: CheckoutItemInput[];
  paymentMethod: string;
  idempotencyKey: string;
  shippingService: string;
};

type PreferenceResponse = {
  id: string;
  init_point: string;
  sandbox_init_point: string;
  redirect_url: string;
  orderId: string;
  orderNumber: number;
  existing: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

function parseBody(value: unknown): CreatePaymentBody | null {
  if (!isRecord(value) || !isUuid(value.addressId) || !isUuid(value.idempotencyKey)) {
    return null;
  }

  if (typeof value.paymentMethod !== 'string' || !ONLINE_PAYMENT_METHODS.has(value.paymentMethod) || value.shippingService !== 'manual-standard' || !Array.isArray(value.items)) {
    return null;
  }

  if (!value.items.length || value.items.length > 50) {
    return null;
  }

  const items = value.items.map((item): CheckoutItemInput | null => {
    const quantity = isRecord(item) ? item.quantity : undefined;
    if (!isRecord(item) || !isUuid(item.productId) || typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity <= 0 || quantity > 99) {
      return null;
    }

    const selectedSize = typeof item.selectedSize === 'string' ? item.selectedSize.trim().slice(0, 100) : '';
    const selectedColor = typeof item.selectedColor === 'string' ? item.selectedColor.trim().slice(0, 100) : '';

    return {
      productId: item.productId,
      selectedSize,
      selectedColor,
      quantity,
    };
  });

  if (items.some((item) => item === null)) {
    return null;
  }

  return {
    addressId: value.addressId,
    notes: typeof value.notes === 'string' ? value.notes.trim().slice(0, 1000) : '',
    items: items as CheckoutItemInput[],
    paymentMethod: value.paymentMethod,
    idempotencyKey: value.idempotencyKey,
    shippingService: value.shippingService,
  };
}

function createPaymentServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error('Configuração segura de pagamento indisponível.');
  }

  return createSupabaseAdminClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function clientError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function logPaymentError(operation: string, error: unknown) {
  const code = isRecord(error) && (typeof error.code === 'string' || typeof error.code === 'number')
    ? String(error.code).slice(0, 100)
    : null;
  console.error('Mercado Pago: operação não concluída', {
    operation,
    code,
  });
}

async function getPreferenceResponse(preference: Preference, preferenceId: string, orderId: string, orderNumber: number, existing: boolean) {
  const result = await preference.get({ preferenceId });

  if (!result.id || !result.init_point || !result.sandbox_init_point) {
    throw new Error('Resposta inválida do Mercado Pago.');
  }

  const mercadoPagoConfig = getMercadoPagoConfig();
  return {
    id: result.id,
    init_point: result.init_point,
    sandbox_init_point: result.sandbox_init_point,
    redirect_url: mercadoPagoConfig.getCheckoutUrl(result),
    orderId,
    orderNumber,
    existing,
  } satisfies PreferenceResponse;
}

export async function POST(request: NextRequest): Promise<NextResponse<PreferenceResponse | { error: string }>> {
  let mercadoPagoConfig;
  try {
    mercadoPagoConfig = getMercadoPagoConfig();
  } catch (error) {
    console.error('Mercado Pago: configuração inválida.', {
      code: isRecord(error) && typeof error.code === 'string' ? error.code : 'CONFIGURATION_ERROR',
    });
    return clientError('O pagamento online não está disponível no momento.', 503);
  }

  let paymentServerClient;
  try {
    paymentServerClient = createPaymentServerClient();
  } catch (error) {
    console.error('Mercado Pago: cliente de persistência não configurado.', {
      message: error instanceof Error ? error.message : 'Erro desconhecido.',
    });
    return clientError('O pagamento online não está disponível no momento.', 503);
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return clientError('Dados de pagamento inválidos.');
  }

  const body = parseBody(rawBody);
  if (!body) {
    return clientError('Dados de pagamento inválidos.');
  }

  const supabase = createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return clientError('Sua sessão expirou. Entre novamente.', 401);
  }

  const { data: rpcData, error: rpcError } = await supabase.rpc('start_mercado_pago_order', {
    p_address_id: body.addressId,
    p_notes: body.notes || '',
    p_items: body.items,
    p_idempotency_key: body.idempotencyKey,
    p_payment_method: body.paymentMethod,
    p_shipping_service: body.shippingService,
  });

  if (rpcError) {
    logPaymentError('start_mercado_pago_order', rpcError);
    const status = rpcError.code === '28000' || rpcError.code === '42501' ? 401 : 400;
    return clientError(status === 401 ? 'Sua sessão expirou. Entre novamente.' : 'Não foi possível iniciar o pagamento.', status);
  }

  const paymentAttempt = Array.isArray(rpcData) ? rpcData[0] : rpcData;
  if (!paymentAttempt?.order_id || !paymentAttempt?.payment_attempt_id || !paymentAttempt?.order_number) {
    console.error('Mercado Pago: resposta inválida da RPC start_mercado_pago_order.');
    return clientError('Não foi possível iniciar o pagamento.', 500);
  }

  const orderId = String(paymentAttempt.order_id);
  const paymentAttemptId = String(paymentAttempt.payment_attempt_id);
  const orderNumber = Number(paymentAttempt.order_number);
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, order_number, total, shipping, shipping_service_name, order_items(product_id, product_name, unit_price, quantity, subtotal)')
    .eq('id', orderId)
    .eq('customer_id', authData.user.id)
    .maybeSingle();

  if (orderError || !order || !Array.isArray(order.order_items) || !order.order_items.length) {
    logPaymentError('load_order_for_preference', orderError || { message: 'Pedido ou itens ausentes.' });
    return clientError('Não foi possível preparar o pedido para pagamento.', 500);
  }

  const { data: attempt, error: attemptError } = await supabase
    .from('payment_attempts')
    .select('id, external_reference, external_preference_id')
    .eq('id', paymentAttemptId)
    .eq('order_id', orderId)
    .maybeSingle();

  if (attemptError || !attempt || attempt.external_reference !== orderId) {
    logPaymentError('load_payment_attempt', attemptError || { message: 'Tentativa ausente ou referência inválida.' });
    return clientError('Não foi possível preparar o pagamento.', 500);
  }

  const client = new MercadoPagoConfig({ accessToken: mercadoPagoConfig.accessToken });
  const preference = new Preference(client);

  try {
    if (attempt.external_preference_id) {
      const response = await getPreferenceResponse(
        preference,
        attempt.external_preference_id,
        orderId,
        orderNumber,
        true,
      );
      return NextResponse.json(response);
    }

    const result = await preference.create({
      body: {
        items: [...order.order_items.map((item) => ({
          id: item.product_id,
          title: item.product_name,
          quantity: item.quantity,
          unit_price: Number(item.unit_price) / 100,
          currency_id: 'BRL',
        })), ...(Number(order.shipping) > 0 ? [{ id: 'shipping', title: order.shipping_service_name || 'Frete', quantity: 1, unit_price: Number(order.shipping) / 100, currency_id: 'BRL' as const }] : [])],
        external_reference: orderId,
        metadata: {
          order_id: orderId,
          payment_attempt_id: paymentAttemptId,
          order_number: order.order_number,
        },
        back_urls: mercadoPagoConfig.getBackUrls(orderId),
        notification_url: mercadoPagoConfig.webhookUrl,
      },
      requestOptions: { idempotencyKey: body.idempotencyKey },
    });

    if (!result.id || !result.init_point || !result.sandbox_init_point) {
      console.error('Mercado Pago: resposta de preferência inválida.');
      return clientError('Não foi possível iniciar o pagamento.', 502);
    }

    const { data: savedPreferenceId, error: saveError } = await paymentServerClient.rpc('save_mercado_pago_preference', {
      p_payment_attempt_id: paymentAttemptId,
      p_order_id: orderId,
      p_external_preference_id: result.id,
    });

    if (saveError || !savedPreferenceId) {
      logPaymentError('save_mercado_pago_preference', saveError || { message: 'Preferência não persistida.' });
      return clientError('Não foi possível registrar o pagamento. Tente novamente.', 500);
    }

    if (savedPreferenceId !== result.id) {
      const response = await getPreferenceResponse(preference, savedPreferenceId, orderId, orderNumber, true);
      return NextResponse.json(response);
    }

    return NextResponse.json({
      id: result.id,
      init_point: result.init_point,
      sandbox_init_point: result.sandbox_init_point,
      redirect_url: mercadoPagoConfig.getCheckoutUrl(result),
      orderId,
      orderNumber,
      existing: Boolean(paymentAttempt.existing),
    });
  } catch (error) {
    console.error('Mercado Pago: falha ao criar ou recuperar preferência.', {
      errorType: error instanceof Error ? error.name : typeof error,
    });
    return clientError('Não foi possível iniciar o pagamento. Tente novamente.', 502);
  }
}
