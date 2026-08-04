import { MercadoPagoConfig, Payment } from 'mercadopago';
import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js';
import webhookUtils from '../../../../lib/mercado-pago/webhook.cjs';

const {
  InvalidWebhookSignatureError,
  fetchPayment,
  getMercadoPagoErrorDetails,
  getWebhookPaymentId,
  isPaymentNotification,
  isRecord,
  validateWebhookSignature,
} = webhookUtils;

type WebhookPayload = {
  type?: unknown;
  action?: unknown;
  data?: { id?: unknown };
};

function createServerSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error('Configuração de persistência indisponível.');
  }

  return createSupabaseAdminClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(request: NextRequest) {
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  const webhookSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;

  if (!accessToken || !webhookSecret) {
    console.error('Mercado Pago webhook: configuração ausente.', {
      accessTokenConfigured: Boolean(accessToken),
      webhookSecretConfigured: Boolean(webhookSecret),
    });
    return NextResponse.json({ error: 'Serviço indisponível.' }, { status: 503 });
  }

  let payload: WebhookPayload;
  try {
    const rawPayload: unknown = await request.json();
    payload = isRecord(rawPayload) ? rawPayload as WebhookPayload : {};
  } catch {
    return NextResponse.json({ error: 'Notificação inválida.' }, { status: 400 });
  }

  try {
    validateWebhookSignature(request, webhookSecret);
  } catch (error) {
    console.error('Mercado Pago webhook: assinatura inválida.', {
      reason: error instanceof InvalidWebhookSignatureError ? error.reason : 'ValidationError',
    });
    return NextResponse.json({ error: 'Assinatura inválida.' }, { status: 401 });
  }

  if (!isPaymentNotification(payload, request.nextUrl.searchParams)) {
    return NextResponse.json({ received: true, ignored: true });
  }

  const paymentId = getWebhookPaymentId(payload, request.nextUrl.searchParams);
  if (!paymentId) {
    return NextResponse.json({ error: 'Notificação inválida.' }, { status: 400 });
  }

  try {
    const paymentClient = new Payment(new MercadoPagoConfig({ accessToken }));
    const payment = await fetchPayment(paymentClient, paymentId);

    // The official simulator accepts an arbitrary Data ID (the documentation
    // uses 123456). A signed notification can therefore legitimately point to
    // no API resource. Acknowledge only that verified 404; other SDK failures
    // still return 5xx so Mercado Pago retries them.
    if (!payment) {
      console.info('Mercado Pago webhook: recurso assinado não encontrado.', {
        paymentId,
      });
      return NextResponse.json({ received: true, resourceFound: false });
    }
    const externalReference = typeof payment.external_reference === 'string'
      ? payment.external_reference.trim()
      : '';
    const status = typeof payment.status === 'string' ? payment.status.trim() : '';

    if (!payment.id || !externalReference || !status) {
      console.error('Mercado Pago webhook: pagamento sem dados de reconciliação.');
      return NextResponse.json({ error: 'Pagamento inválido.' }, { status: 422 });
    }

    const supabase = createServerSupabaseClient();
    const { error } = await supabase.rpc('sync_mercado_pago_payment', {
      p_external_payment_id: String(payment.id),
      p_external_reference: externalReference,
      p_status: status,
      p_status_detail: typeof payment.status_detail === 'string' ? payment.status_detail : null,
      p_payment_method: typeof payment.payment_method_id === 'string' ? payment.payment_method_id : null,
      p_installments: Number.isInteger(payment.installments) ? payment.installments : null,
    });

    if (error) {
      console.error('Mercado Pago webhook: sincronização não concluída.', {
        code: error.code || null,
        message: error.message || null,
      });
      return NextResponse.json({ error: 'Não foi possível sincronizar o pagamento.' }, { status: 500 });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Mercado Pago webhook: falha ao consultar ou sincronizar pagamento.', {
      ...getMercadoPagoErrorDetails(error),
      paymentId,
    });
    return NextResponse.json({ error: 'Não foi possível processar a notificação.' }, { status: 500 });
  }
}
