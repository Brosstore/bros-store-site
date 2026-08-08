import { createClient as createAdmin } from '@supabase/supabase-js';
import { decryptCredential, encryptCredential, getMelhorEnvioConfig, normalizeMelhorEnvioQuotes } from './melhor-envio';

function admin() { const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY; if(!url||!key) throw new Error('STORAGE_UNAVAILABLE'); return createAdmin(url,key,{auth:{persistSession:false,autoRefreshToken:false}}); }

export async function credentials(){
  const db=admin(); const {data,error}=await db.from('shipping_provider_credentials').select('*').eq('provider','melhor_envio').maybeSingle(); if(error||!data) throw new Error('NOT_AUTHORIZED');
  const cfg=getMelhorEnvioConfig(); let access=decryptCredential(data.access_token_encrypted,cfg.encryptionKey); if(new Date(data.expires_at).getTime()>Date.now()+300000) return {access,cfg,db};
  const refresh=decryptCredential(data.refresh_token_encrypted,cfg.encryptionKey); const form=new URLSearchParams({grant_type:'refresh_token',client_id:cfg.clientId,client_secret:cfg.clientSecret,refresh_token:refresh});
  const response=await fetch(`${cfg.baseUrl}/oauth/token`,{method:'POST',headers:{Accept:'application/json','Content-Type':'application/x-www-form-urlencoded','User-Agent':cfg.userAgent},body:form,cache:'no-store'});
  const token=await response.json().catch(()=>null); if(!response.ok||!token?.access_token||!token?.refresh_token) throw new Error('REFRESH_FAILED'); access=token.access_token;
  await db.from('shipping_provider_credentials').update({access_token_encrypted:encryptCredential(access,cfg.encryptionKey),refresh_token_encrypted:encryptCredential(token.refresh_token,cfg.encryptionKey),expires_at:new Date(Date.now()+Number(token.expires_in||2592000)*1000).toISOString(),updated_at:new Date().toISOString()}).eq('provider','melhor_envio'); return {access,cfg,db};
}

export async function quoteMelhorEnvio(input:{customerId:string;addressId:string;items:Array<{productId:string;selectedSize?:string;selectedColor?:string;quantity:number}>;destinationPostalCode:string;settings:any;products:any[]}){
  const {access,cfg,db}=await credentials(); const byId=new Map(input.products.map(p=>[p.id,p]));
  const body={from:{postal_code:input.settings.shipping_origin_postal_code},to:{postal_code:input.destinationPostalCode},products:input.items.map(i=>{const p=byId.get(i.productId);return{id:i.productId,width:input.settings.shipping_default_width_cm,height:input.settings.shipping_default_height_cm,length:input.settings.shipping_default_length_cm,weight:input.settings.shipping_default_weight_grams/1000,insurance_value:Number(p.price_cents)/100,quantity:i.quantity};})};
  const response=await fetch(`${cfg.baseUrl}/api/v2/me/shipment/calculate`,{method:'POST',headers:{Authorization:`Bearer ${access}`,Accept:'application/json','Content-Type':'application/json','User-Agent':cfg.userAgent},body:JSON.stringify(body),cache:'no-store'}); const payload=await response.json().catch(()=>null); if(!response.ok) throw new Error(response.status===422?'INVALID_PACKAGE':'PROVIDER_ERROR');
  const quotes=normalizeMelhorEnvioQuotes(payload); const saved=[];
  for(const q of quotes){const {data,error}=await db.from('external_shipping_quotes').insert({customer_id:input.customerId,address_id:input.addressId,items:input.items,provider:q.provider,external_service_id:q.externalServiceId,service_name:q.serviceName,amount_cents:q.amountCents,estimated_days_min:q.estimatedDaysMin,estimated_days_max:q.estimatedDaysMax,metadata:q.metadata,expires_at:new Date(Date.now()+15*60*1000).toISOString()}).select('id').single(); if(!error&&data) saved.push({...q,service:`melhor-envio:${data.id}`});}
  return saved;
}
