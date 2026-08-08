import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../../lib/supabase/server';
import { getMelhorEnvioConfig } from '../../../../../lib/shipping/melhor-envio';

export async function GET(request: NextRequest) {
  const supabase=createClient(); const {data:{user}}=await supabase.auth.getUser();
  if(!user) return NextResponse.redirect(new URL('/admin/login',request.url));
  const {data:admin}=await supabase.from('admin_users').select('user_id').eq('user_id',user.id).maybeSingle();
  if(!admin) return NextResponse.json({error:'Acesso negado.'},{status:403});
  let config; try{config=getMelhorEnvioConfig();}catch{return NextResponse.json({error:'Integração ainda não configurada.'},{status:503});}
  const state=crypto.randomUUID(); const url=new URL('/oauth/authorize',config.baseUrl);
  url.searchParams.set('client_id',config.clientId);url.searchParams.set('redirect_uri',config.redirectUri);url.searchParams.set('response_type','code');url.searchParams.set('scope','shipping-calculate');url.searchParams.set('state',state);
  const response=NextResponse.redirect(url); response.cookies.set('melhor_envio_oauth_state',state,{httpOnly:true,secure:true,sameSite:'lax',maxAge:600,path:'/api/shipping/melhor-envio'});return response;
}
