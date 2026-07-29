import './globals.css';
import { siteConfig } from '../lib/siteConfig';
import ProductNavigation from '../components/ProductNavigation';

export const metadata = {
  metadataBase: new URL(siteConfig.url),
  title: `${siteConfig.name} | ${siteConfig.tagline}`,
  description: siteConfig.description,
  keywords: ['Bros Store', 'moda urbana', 'streetwear', 'roupas', 'calçados', 'acessórios'],
  robots: { index: true, follow: true },
  openGraph: {
    title: `${siteConfig.name} | ${siteConfig.tagline}`,
    description: siteConfig.description,
    type: 'website',
    locale: 'pt_BR',
    url: siteConfig.url,
    siteName: siteConfig.name,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${siteConfig.name} | ${siteConfig.tagline}`,
    description: siteConfig.description,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body><ProductNavigation />{children}</body>
    </html>
  );
}
