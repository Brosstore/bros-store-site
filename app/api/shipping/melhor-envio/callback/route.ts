import { NextRequest, NextResponse } from 'next/server';
import { createClient as adminClient } from '@supabase/supabase-js';
import { createClient } from '../../../../../lib/supabase/server';
import { encryptCredential, getMelhorEnvioConfig } from '../../../../../lib/shipping/melhor-envio';

export async function GET(request:NextRequest){
 const state=request.nextUrl.searchParams.get('state');const code=request.nextUrl.searchParams.get('code');const expected=request.cookies.get('melhor_envio_oauth_state')?.value;
 if(!state||!code||!expected||state!==expected)return NextResponse.json({error:'Autorização inválida ou expirada.'},{status:400});
 const supabase=createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)return NextResponse.redirect(new URL('/admin/login',request.url));
 const {data:admin}=await supabase.from('admin_users').select('user_id').eq('user_id',user.id).maybeSingle();if(!admin)return NextResponse.json({error:'Acesso negado.'},{status:403});
 const config=getMelhorEnvioConfig();const form=new URLSearchParams({grant_type:'authorization_code',client_id:config.clientId,client_secret:config.clientSecret,redirect_uri:config.redirectUri,code});const response=await fetch(`${config.baseUrl}/oauth/token`,{method:'POST',headers:{Accept:'application/json','Content-Type':'application/x-www-form-urlencoded','User-Agent':config.userAgent},body:form,cache:'no-store'});
 const token=await response.json().catch(()=>null);if(!response.ok||!token?.access_token||!token?.refresh_token)return NextResponse.json({error:'Não foi possível concluir a autorização.'},{status:502});
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key) return NextResponse.json({error:'Persistência indisponível.'},{status:503});
 const service=adminClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});const {error}=await service.from('shipping_provider_credentials').upsert({provider:'melhor_envio',access_token_encrypted:encryptCredential(token.access_token,config.encryptionKey),refresh_token_encrypted:encryptCredential(token.refresh_token,config.encryptionKey),expires_at:new Date(Date.now()+Number(token.expires_in||2592000)*1000).toISOString(),updated_at:new Date().toISOString()});
 if(error)return NextResponse.json({error:'Não foi possível armazenar a autorização.'},{status:500});await service.from('store_settings').update({shipping_melhor_envio_enabled:true}).eq('id',true);
 const redirect=NextResponse.redirect(new URL('/admin/configuracoes?melhor-envio=conectado',request.url));redirect.cookies.delete('melhor_envio_oauth_state');return redirect;
}
