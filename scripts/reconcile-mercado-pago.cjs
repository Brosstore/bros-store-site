const fs = require('node:fs');
const path = require('node:path');
const { MercadoPagoConfig, Payment } = require('mercadopago');
const { createClient } = require('@supabase/supabase-js');
const { getMercadoPagoConfig } = require('../lib/mercado-pago/config.cjs');

function loadLocalEnv() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;

  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (!match || process.env[match[1]]) continue;
    let value = match[2].trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    process.env[match[1]] = value;
  }
}

function parseArguments(argv) {
  const apply = argv.includes('--apply');
  const paymentIds = argv
    .filter((argument) => argument.startsWith('--payment-id='))
    .map((argument) => argument.slice('--payment-id='.length).trim())
    .filter((id) => /^\d+$/.test(id));

  if (apply && paymentIds.length === 0) {
    throw new Error('--apply exige pelo menos um --payment-id=<ID> explícito.');
  }

  return { apply, paymentIds: [...new Set(paymentIds)] };
}

function assertConfiguration() {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
  ];
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length) throw new Error(`Configuração ausente: ${missing.join(', ')}.`);
}

async function loadCandidateAttempts(supabase, paymentIds) {
  if (paymentIds.length) {
    const payments = await Promise.all(paymentIds.map((paymentId) => paymentClient.get({ id: paymentId })));
    const references = payments.map((payment) => payment.external_reference).filter(Boolean);
    const result = await supabase
      .from('payment_attempts')
      .select('id,order_id,external_reference,external_payment_id,status,orders(total,payment_status)')
      .in('external_reference', references);
    if (result.error) throw result.error;
    return { attempts: result.data, payments };
  }

  const result = await supabase
    .from('payment_attempts')
    .select('id,order_id,external_reference,external_payment_id,status,orders(total,payment_status)')
    .in('status', ['pending', 'in_process'])
    .order('created_at', { ascending: false })
    .limit(100);
  if (result.error) throw result.error;

  const payments = [];
  for (const attempt of result.data) {
    const response = await fetch(
      `https://api.mercadopago.com/v1/payments/search?external_reference=${encodeURIComponent(attempt.external_reference)}`,
      { headers: { Authorization: `Bearer ${mercadoPagoConfig.accessToken}` } },
    );
    if (!response.ok) throw new Error(`Busca no Mercado Pago falhou com HTTP ${response.status}.`);
    const body = await response.json();
    payments.push(...(body.results || []));
  }
  return { attempts: result.data, payments };
}

function buildPlan(attempts, payments, selectedPaymentIds) {
  const attemptsByReference = new Map(attempts.map((attempt) => [attempt.external_reference, attempt]));

  return payments
    .filter((payment) => payment.status === 'approved')
    .filter((payment) => !selectedPaymentIds.length || selectedPaymentIds.includes(String(payment.id)))
    .map((payment) => {
      const attempt = attemptsByReference.get(payment.external_reference);
      if (!attempt || attempt.order_id !== payment.external_reference) {
        throw new Error(`Pagamento ${payment.id}: external_reference não corresponde a uma tentativa/pedido.`);
      }
      const order = Array.isArray(attempt.orders) ? attempt.orders[0] : attempt.orders;
      if (!order || Number(order.total) !== Math.round(Number(payment.transaction_amount) * 100)) {
        throw new Error(`Pagamento ${payment.id}: valor não corresponde ao total do pedido.`);
      }
      if (attempt.external_payment_id && attempt.external_payment_id !== String(payment.id)) {
        throw new Error(`Pagamento ${payment.id}: tentativa já vinculada a outro pagamento.`);
      }

      return { payment, attempt, order };
    });
}

loadLocalEnv();
const { apply, paymentIds } = parseArguments(process.argv.slice(2));
assertConfiguration();
const mercadoPagoConfig = getMercadoPagoConfig(process.env);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);
const paymentClient = new Payment(new MercadoPagoConfig({
  accessToken: mercadoPagoConfig.accessToken,
}));

(async () => {
  const { attempts, payments } = await loadCandidateAttempts(supabase, paymentIds);
  const plan = buildPlan(attempts, payments, paymentIds);

  console.table(plan.map(({ payment, attempt, order }) => ({
    payment_id: String(payment.id),
    order_id: attempt.order_id,
    amount: Number(payment.transaction_amount).toFixed(2),
    remote_status: payment.status,
    local_status: attempt.status,
    order_payment_status: order.payment_status,
    action: apply ? 'reconcile' : 'dry-run',
  })));

  if (!apply) {
    console.log('Nenhuma alteração realizada. Use --apply com --payment-id=<ID> após aprovação explícita.');
    return;
  }

  for (const { payment } of plan) {
    const { error } = await supabase.rpc('sync_mercado_pago_payment', {
      p_external_payment_id: String(payment.id),
      p_external_reference: payment.external_reference,
      p_status: payment.status,
      p_status_detail: payment.status_detail || null,
      p_payment_method: payment.payment_method_id || null,
      p_installments: Number.isInteger(payment.installments) ? payment.installments : null,
    });
    if (error) throw new Error(`Pagamento ${payment.id}: ${error.code || 'RPC'} ${error.message}`);
  }
})();
