import {
  InvalidWebhookSignatureError,
  MercadoPagoConfig,
  Payment,
  WebhookSignatureValidator,
} from 'mercadopago';
import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js';

type WebhookPayload = {
  type?: unknown;
  action?: unknown;
  data?: { id?: unknown };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getWebhookPaymentId(payload: WebhookPayload, request: NextRequest): string {
  const candidates = [request.nextUrl.searchParams.get('data.id'), request.nextUrl.searchParams.get('id'), payload.data?.id];
  const value = candidates.find((candidate) => typeof candidate === 'string' || typeof candidate === 'number');
  const paymentId = String(value || '').trim();
  return /^\d+$/.test(paymentId) ? paymentId : '';
}

function validateSignature(request: NextRequest, secret: string): void {
  const dataId = request.nextUrl.searchParams.get('data.id')?.trim().toLowerCase();

  WebhookSignatureValidator.validate({
    xSignature: request.headers.get('x-signature'),
    xRequestId: request.headers.get('x-request-id'),
    dataId,
    secret,
  });
}

function isPaymentNotification(payload: WebhookPayload, request: NextRequest): boolean {
  const type = typeof payload.type === 'string' ? payload.type : request.nextUrl.searchParams.get('topic');
  const action = typeof payload.action === 'string' ? payload.action : '';
  return type === 'payment' || action.startsWith('payment.');
}

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
    validateSignature(request, webhookSecret);
  } catch (error) {
    console.error('Mercado Pago webhook: assinatura inválida.', {
      reason: error instanceof InvalidWebhookSignatureError ? error.reason : 'ValidationError',
    });
    return NextResponse.json({ error: 'Assinatura inválida.' }, { status: 401 });
  }

  if (!isPaymentNotification(payload, request)) {
    return NextResponse.json({ received: true, ignored: true });
  }

  const paymentId = getWebhookPaymentId(payload, request);
  if (!paymentId) {
    return NextResponse.json({ error: 'Notificação inválida.' }, { status: 400 });
  }

  try {
    const paymentClient = new Payment(new MercadoPagoConfig({ accessToken }));
    const payment = await paymentClient.get({ id: paymentId });
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
      message: error instanceof Error ? error.message : 'Erro desconhecido.',
    });
    return NextResponse.json({ error: 'Não foi possível processar a notificação.' }, { status: 500 });
  }
}
