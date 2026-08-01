import './globals.css';
import { Manrope } from 'next/font/google';
import { siteConfig } from '../lib/siteConfig';
import { CartProvider } from '../components/cart/CartContext';
import { getStoreSettings } from '../lib/storeSettings';

const manrope = Manrope({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-manrope', display: 'swap' });

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
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'Bros Store — Vista sua atitude.' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${siteConfig.name} | ${siteConfig.tagline}`,
    description: siteConfig.description,
    images: ['/opengraph-image'],
  },
};

export default async function RootLayout({ children }) {
  const settings = await getStoreSettings();
  return (
    <html lang="pt-BR">
      <body className={manrope.variable}><CartProvider settings={settings}>{children}</CartProvider></body>
    </html>
  );
}
