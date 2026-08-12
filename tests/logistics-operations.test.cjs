const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const operations = require('../lib/shipping/operations.cjs');

const root = path.resolve(__dirname, '..');
const migration = fs.readFileSync(path.join(root, 'supabase/migrations/202608120001_add_logistics_operations.sql'), 'utf8');
const actions = fs.readFileSync(path.join(root, 'app/admin/pedidos/actions.js'), 'utf8');
const manager = fs.readFileSync(path.join(root, 'app/admin/pedidos/ShippingManager.js'), 'utf8');
const server = fs.readFileSync(path.join(root, 'lib/shipping/melhor-envio-operations.ts'), 'utf8');
const credentials = fs.readFileSync(path.join(root, 'lib/shipping/melhor-envio-server.ts'), 'utf8');

function context() {
  return {
    order: { order_number: 1001, shipping_quote_metadata: { external_service_id: '1' }, order_items: [{ product_name: 'Tênis', quantity: 1, unit_price: 29990, subtotal: 29990 }] },
    address: { destinatario: 'Cliente', rua: 'Rua B', numero: '20', complemento: '', bairro: 'Centro', cidade: 'São Luís', estado: 'MA', cep: '65000000' },
    customer: { nome: 'Cliente', sobrenome: 'Teste', telefone: '98999999999' }, customerEmail: 'cliente@example.com',
    settings: { email: 'loja@example.com', whatsapp: '98988888888', shipping_sender_name: 'Bros Store', shipping_sender_phone: '98988888888', shipping_sender_document: '12345678901', shipping_sender_address: 'Rua A', shipping_sender_number: '10', shipping_sender_district: 'Centro', shipping_sender_city: 'São Luís', shipping_sender_state: 'MA', shipping_origin_postal_code: '65058484', shipping_default_height_cm: 13, shipping_default_width_cm: 23, shipping_default_length_cm: 35, shipping_default_weight_grams: 800, shipping_content_declaration_enabled: true },
  };
}

test('monta etiqueta com serviço e valores reais do pedido', () => { const body = operations.buildCartPayload(context()); assert.equal(body.service, 1); assert.equal(body.products[0].unitary_value, 299.9); assert.equal(body.to.postal_code, '65000000'); });
test('pedido sem configuração de remetente é bloqueado antes da API', () => { const input=context(); input.settings.shipping_sender_document=''; assert.throws(()=>operations.buildCartPayload(input), /CPF ou CNPJ/); });
test('declaração de conteúdo exige confirmação administrativa explícita', () => { const input=context(); input.settings.shipping_content_declaration_enabled=false; assert.throws(()=>operations.buildCartPayload(input), /declaração de conteúdo/); });
test('normaliza rastreamento confirmado pelo provedor', () => { const data=operations.normalizeTracking({abc:{status:'delivered',tracking:'BR123',events:[{id:'1',status:'delivered',description:'Entregue'}]}},'abc'); assert.equal(data.logisticsStatus,'entregue'); assert.equal(data.trackingCode,'BR123'); assert.equal(data.events.length,1); });
test('schema protege cliente e permite apenas leitura do próprio rastreamento', () => { assert.match(migration,/Customers read own shipments/); assert.match(migration,/o\.customer_id = auth\.uid\(\)/); assert.match(migration,/revoke all on table public\.shipments from anon, authenticated/); });
test('reserva de compra é idempotente e exclusiva do servidor', () => { assert.match(migration,/purchase_idempotency_key uuid unique/); assert.match(migration,/pg_advisory_xact_lock/); assert.match(migration,/auth\.role\(\) <> 'service_role'/); assert.match(migration,/Já existe uma compra em andamento/); });
test('ações de etiqueta validam administrador e bloqueiam clique duplicado', () => { assert.match(actions,/await requireAdmin\(\)/); assert.match(actions,/purchaseShippingLabel/); assert.match(manager,/crypto\.randomUUID/); assert.match(manager,/if \(pending\) return/); });
test('falha de geração não repete baixa de estoque nem altera pagamento', () => { assert.doesNotMatch(server,/stock|payment_status/); assert.match(server,/label_status: 'falhou'/); assert.match(server,/reservation\.label_status !== 'comprada'/); });
test('tracking e renovação de token permanecem server-side', () => { assert.match(server,/shipment\/tracking/); assert.match(credentials,/grant_type:'refresh_token'/); assert.match(credentials,/SUPABASE_SERVICE_ROLE_KEY/); });
