'use strict';
const crypto = require('node:crypto');

function config(env = process.env) {
  const clientId = env.MELHOR_ENVIO_CLIENT_ID;
  const clientSecret = env.MELHOR_ENVIO_CLIENT_SECRET;
  const encryptionKey = env.SHIPPING_TOKEN_ENCRYPTION_KEY;
  if (!clientId || !clientSecret || !encryptionKey) throw Object.assign(new Error('Configuração do Melhor Envio incompleta.'), { code: 'CONFIGURATION_ERROR' });
  return { clientId, clientSecret, encryptionKey, baseUrl: env.MELHOR_ENVIO_ENVIRONMENT === 'sandbox' ? 'https://sandbox.melhorenvio.com.br' : 'https://melhorenvio.com.br', redirectUri: `${(env.NEXT_PUBLIC_SITE_URL || 'https://bros-store-site.vercel.app').replace(/\/$/, '')}/api/shipping/melhor-envio/callback`, userAgent: `Bros Store (${env.MELHOR_ENVIO_SUPPORT_EMAIL || 'contatobrosstore@gmail.com'})` };
}
function key(secret) { return crypto.createHash('sha256').update(secret).digest(); }
function encrypt(value, secret) { const iv=crypto.randomBytes(12); const cipher=crypto.createCipheriv('aes-256-gcm',key(secret),iv); const data=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]); return [iv.toString('base64url'),cipher.getAuthTag().toString('base64url'),data.toString('base64url')].join('.'); }
function decrypt(value, secret) { const [i,t,d]=String(value).split('.'); if(!i||!t||!d) throw new Error('Credencial inválida.'); const decipher=crypto.createDecipheriv('aes-256-gcm',key(secret),Buffer.from(i,'base64url')); decipher.setAuthTag(Buffer.from(t,'base64url')); return Buffer.concat([decipher.update(Buffer.from(d,'base64url')),decipher.final()]).toString('utf8'); }
function normalizeQuotes(payload) { if(!Array.isArray(payload)) return []; return payload.filter(q=>q && !q.error && q.id && q.custom_price != null).map(q=>({provider:'melhor_envio',service:`melhor-envio:${q.id}`,externalServiceId:String(q.id),serviceName:[q.company?.name,q.name].filter(Boolean).join(' · ')||'Melhor Envio',amountCents:Math.round(Number(q.custom_price)*100),estimatedDaysMin:Number.isInteger(q.custom_delivery_time)?q.custom_delivery_time:null,estimatedDaysMax:Number.isInteger(q.custom_delivery_time)?q.custom_delivery_time:null,metadata:{company:q.company?.name||null,service:q.name||null,custom_price:String(q.custom_price)}})).filter(q=>Number.isSafeInteger(q.amountCents)&&q.amountCents>=0); }
module.exports={config,encrypt,decrypt,normalizeQuotes};
