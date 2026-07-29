import { siteConfig } from '../lib/siteConfig';

export default function sitemap() {
  return [
    {
      url: siteConfig.url,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
  ];
}
