import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { quoteMelhorEnvio } from '../../../../lib/shipping/melhor-envio-server';

type Item = { productId: string; selectedSize?: string; selectedColor?: string; quantity: number };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseBody(value: unknown): { addressId: string; items: Item[] } | null {
  if (!value || typeof value !== 'object') return null;
  const body = value as Record<string, unknown>;
  if (typeof body.addressId !== 'string' || !UUID.test(body.addressId) || !Array.isArray(body.items) || !body.items.length || body.items.length > 50) return null;
  const items = body.items.map((raw) => {
    const item = raw && typeof raw === 'object' ? raw as Record<string, unknown> : null;
    if (!item || typeof item.productId !== 'string' || !UUID.test(item.productId) || !Number.isInteger(item.quantity) || Number(item.quantity) < 1 || Number(item.quantity) > 99) return null;
    return { productId: item.productId, selectedSize: typeof item.selectedSize === 'string' ? item.selectedSize.slice(0, 100) : '', selectedColor: typeof item.selectedColor === 'string' ? item.selectedColor.slice(0, 100) : '', quantity: Number(item.quantity) };
  });
  return items.some((item) => item === null) ? null : { addressId: body.addressId, items: items as Item[] };
}

export async function POST(request: NextRequest) {
  const body = parseBody(await request.json().catch(() => null));
  if (!body) return NextResponse.json({ error: 'Dados para cálculo do frete inválidos.' }, { status: 400 });
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Sua sessão expirou. Entre novamente.' }, { status: 401 });
  const { data, error } = await supabase.rpc('calculate_customer_shipping', { p_address_id: body.addressId, p_items: body.items, p_shipping_service: 'manual-standard' });
  if (error) {
    const status = error.code === '28000' || error.code === '42501' ? 401 : error.code === '22023' ? 400 : 503;
    return NextResponse.json({ error: status === 503 ? 'O frete está temporariamente indisponível.' : error.message }, { status });
  }
  const quotes = (Array.isArray(data) ? data : []).map((quote) => ({ provider: quote.provider, service: quote.service, serviceName: quote.service_name, amountCents: Number(quote.amount_cents), estimatedDaysMin: quote.estimated_days_min, estimatedDaysMax: quote.estimated_days_max, metadata: quote.metadata || {} }));
  const [{data:address},{data:settings},{data:products}]=await Promise.all([supabase.from('addresses').select('cep').eq('id',body.addressId).eq('user_id',user.id).maybeSingle(),supabase.from('store_settings').select('shipping_melhor_envio_enabled,shipping_origin_postal_code,shipping_default_weight_grams,shipping_default_length_cm,shipping_default_width_cm,shipping_default_height_cm').eq('id',true).maybeSingle(),supabase.from('products').select('id,price_cents').in('id',body.items.map(item=>item.productId))]);
  if(settings?.shipping_melhor_envio_enabled&&address&&products?.length===new Set(body.items.map(i=>i.productId)).size){try{const externalQuotes=await quoteMelhorEnvio({customerId:user.id,addressId:body.addressId,items:body.items,destinationPostalCode:String(address.cep).replace(/\D/g,''),settings,products});if(externalQuotes.length)quotes.splice(0,quotes.length,...externalQuotes);}catch(error){console.warn('[shipping] Melhor Envio indisponível',{code:error instanceof Error?error.message:'UNKNOWN'});}}
  return NextResponse.json({ quotes }, { headers: { 'Cache-Control': 'no-store' } });
}
