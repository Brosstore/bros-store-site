import 'server-only';
import configModule from './config.cjs';

type MercadoPagoEnvironment = 'test' | 'production';
type PreferenceUrls = { init_point?: string; sandbox_init_point?: string };

type MercadoPagoServerConfig = {
  accessToken: string;
  publicKey: string;
  webhookSecret?: string;
  environment: MercadoPagoEnvironment;
  siteUrl: string;
  webhookUrl: string;
  getBackUrls(orderId: string): { success: string; failure: string; pending: string };
  getCheckoutUrl(preference: PreferenceUrls): string;
};

export function getMercadoPagoConfig(options: { requireWebhookSecret?: boolean } = {}): MercadoPagoServerConfig {
  return configModule.getMercadoPagoConfig(process.env, options) as MercadoPagoServerConfig;
}
