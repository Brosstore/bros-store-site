import { siteConfig } from './siteConfig';

export const defaultStoreSettings = {
  storeName: siteConfig.name,
  slogan: siteConfig.tagline,
  description: siteConfig.description,
  whatsapp: siteConfig.whatsappNumber,
  email: siteConfig.email,
  instagram: siteConfig.instagramUrl,
  facebook: '',
  tiktok: '',
  address: siteConfig.address.full,
  city: siteConfig.address.city,
  state: 'MA',
  openingHours: '',
  logoPath: null,
  bannerPath: null,
  logoUrl: null,
  bannerUrl: null,
  pixKey: '',
  pixKeyType: '',
  pixReceiverName: '',
  pixCity: '',
  pixInstructions: '',
  homeEyebrow: 'Bros Store · Streetwear',
  homeTitle: 'VISTA SUA\nATITUDE.',
  homeSubtitle: '',
  homeDescription: 'Roupas, calçados e acessórios para quem vive com personalidade, estilo e atitude.',
  homePrimaryCtaLabel: 'Comprar agora',
  homePrimaryCtaUrl: '/produtos',
  homeSecondaryCtaLabel: 'Ver categorias',
  homeSecondaryCtaUrl: '/#categorias',
};

function optionalText(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function instagramHandle(instagram) {
  if (!instagram) return '';
  const value = instagram.replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/\/$/, '');
  return value ? `@${value.replace(/^@/, '')}` : instagram;
}

function mapSettings(row, supabase) {
  if (!row) return defaultStoreSettings;

  return {
    storeName: row.store_name || defaultStoreSettings.storeName,
    slogan: row.slogan || defaultStoreSettings.slogan,
    description: row.description || defaultStoreSettings.description,
    whatsapp: row.whatsapp || defaultStoreSettings.whatsapp,
    email: row.email || defaultStoreSettings.email,
    instagram: row.instagram || defaultStoreSettings.instagram,
    instagramHandle: instagramHandle(row.instagram || defaultStoreSettings.instagram),
    facebook: row.facebook || '',
    tiktok: row.tiktok || '',
    address: row.address || defaultStoreSettings.address,
    city: row.city || defaultStoreSettings.city,
    state: row.state || defaultStoreSettings.state,
    openingHours: row.opening_hours || '',
    logoPath: row.logo_path || null,
    bannerPath: row.banner_path || null,
    logoUrl: row.logo_path
      ? supabase.storage.from('product-images').getPublicUrl(row.logo_path).data.publicUrl
      : null,
    bannerUrl: row.banner_path
      ? supabase.storage.from('product-images').getPublicUrl(row.banner_path).data.publicUrl
      : null,
    pixKey: row.pix_key || '',
    pixKeyType: row.pix_key_type || '',
    pixReceiverName: row.pix_receiver_name || '',
    pixCity: row.pix_city || '',
    pixInstructions: row.pix_instructions || '',
    homeEyebrow: optionalText(row.home_eyebrow) || defaultStoreSettings.homeEyebrow,
    homeTitle: optionalText(row.home_title) || defaultStoreSettings.homeTitle,
    homeSubtitle: optionalText(row.home_subtitle) || defaultStoreSettings.homeSubtitle,
    homeDescription: optionalText(row.home_description) || defaultStoreSettings.homeDescription,
    homePrimaryCtaLabel: optionalText(row.home_primary_cta_label) || defaultStoreSettings.homePrimaryCtaLabel,
    homePrimaryCtaUrl: optionalText(row.home_primary_cta_url) || defaultStoreSettings.homePrimaryCtaUrl,
    homeSecondaryCtaLabel: optionalText(row.home_secondary_cta_label) || defaultStoreSettings.homeSecondaryCtaLabel,
    homeSecondaryCtaUrl: optionalText(row.home_secondary_cta_url) || defaultStoreSettings.homeSecondaryCtaUrl,
  };
}

export async function getStoreSettings() {
  try {
    const { createPublicClient } = await import('./supabase/public');
    const supabase = createPublicClient();
    const { data, error } = await supabase.from('store_settings').select('*').eq('id', true).maybeSingle();
    if (error) {
      if (error.code === 'PGRST205' || /could not find the table/i.test(error.message || '')) {
        return { ...defaultStoreSettings, instagramHandle: instagramHandle(defaultStoreSettings.instagram) };
      }
      throw error;
    }
    return mapSettings(data, supabase);
  } catch (error) {
    console.error(`[settings] Falha ao carregar configurações da loja: ${error.message || error}`);
    return { ...defaultStoreSettings, instagramHandle: instagramHandle(defaultStoreSettings.instagram) };
  }
}

export function storeWhatsappLink(settings, message) {
  const text = encodeURIComponent(message || 'Olá! Quero falar com a Bros Store.');
  return `https://wa.me/${settings?.whatsapp || defaultStoreSettings.whatsapp}?text=${text}`;
}
