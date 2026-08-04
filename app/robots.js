import { siteConfig } from '../lib/siteConfig';

export default function robots() {
  return {
    rules: [{
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api', '/cadastro', '/carrinho', '/checkout', '/login', '/minha-conta', '/pedido-confirmado'],
    }],
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
