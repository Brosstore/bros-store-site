const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const migration = fs.readFileSync(path.join(root, 'supabase/migrations/202608060001_add_universal_shipping.sql'), 'utf8');
const checkout = fs.readFileSync(path.join(root, 'app/checkout/actions.js'), 'utf8');
const quoteRoute = fs.readFileSync(path.join(root, 'app/api/shipping/quotes/route.ts'), 'utf8');

test('pedido recebe somente o serviço, não o preço do navegador', () => { assert.match(checkout, /p_shipping_service: input\.shippingService/); assert.doesNotMatch(checkout, /shippingAmount|amountCents/); });
test('RPC recalcula e persiste frete na transação', () => { assert.match(migration, /calculate_customer_shipping\(p_address_id, p_items, p_shipping_service\)/); assert.match(migration, /total=v_subtotal\+v_quote\.amount_cents/); assert.match(migration, /shipping_quote_metadata/); });
test('cotação valida sessão, endereço e itens no servidor', () => { assert.match(quoteRoute, /auth\.getUser\(\)/); assert.match(migration, /O endereço selecionado não pertence à sua conta/); assert.match(migration, /CEP inválido/); assert.match(migration, /jsonb_array_length\(p_items\) > 50/); });
test('RPCs legadas continuam disponíveis', () => { assert.match(migration, /create_customer_order\(p_address_id uuid,p_payment_method text,p_notes text,p_items jsonb\)/); assert.match(migration, /start_mercado_pago_order\(p_address_id uuid,p_notes text,p_items jsonb,p_idempotency_key uuid,p_payment_method text\)/); });
test('consulta o Melhor Envio antes de recorrer ao fallback manual', () => { const external = quoteRoute.indexOf('quoteMelhorEnvio('); const manual = quoteRoute.indexOf("p_shipping_service: 'manual-standard'"); assert.ok(external >= 0 && manual > external); });
