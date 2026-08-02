import { siteConfig } from '../lib/siteConfig';

export default function robots() {
  return { rules: [{ userAgent: '*', allow: '/', disallow: ['/admin/', '/admin'] }], sitemap: `${siteConfig.url}/sitemap.xml` };
}
