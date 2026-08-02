import Header from '../components/Header';
import Hero from '../components/Hero';
import Categories from '../components/Categories';
import Products from '../components/Products';
import About from '../components/About';
import { Gallery, Benefits, FAQ, ContactPremium } from '../components/PremiumDetails';
import Footer from '../components/Footer';
import WhatsAppButton from '../components/WhatsAppButton';
import PremiumBar from '../components/PremiumBar';
import { getAllProducts, getHomeShowcases } from '../lib/catalog/products';
import { getPublicCategories } from '../lib/categories';
import { getStoreSettings } from '../lib/storeSettings';
import { absoluteUrl, jsonLd } from '../lib/seo';
import { siteConfig } from '../lib/siteConfig';

export const revalidate = 60;

export async function generateMetadata() {
  const settings = await getStoreSettings();
  const title = `${settings.storeName} | ${settings.slogan}`;
  const description = settings.description || siteConfig.description;
  const image = settings.bannerUrl || absoluteUrl('/opengraph-image');
  return { title, description, keywords: ['Bros Store', 'streetwear brasileiro', 'moda urbana', 'calçados', 'acessórios'], alternates: { canonical: '/' }, robots: { index: true, follow: true }, openGraph: { title, description, url: absoluteUrl('/'), type: 'website', locale: 'pt_BR', images: [{ url: image, alt: settings.storeName }] }, twitter: { card: 'summary_large_image', title, description, images: [image] } };
}

export default async function Home() {
  const [categories, products, settings] = await Promise.all([
    getPublicCategories(),
    getAllProducts(),
    getStoreSettings(),
  ]);
  const showcases = getHomeShowcases(products);
  const organization = { '@context': 'https://schema.org', '@type': 'Organization', name: settings.storeName, url: siteConfig.url, logo: settings.logoUrl || absoluteUrl('/icon.svg'), email: settings.email || undefined, sameAs: [settings.instagram, settings.facebook, settings.tiktok].filter(Boolean) };
  const website = { '@context': 'https://schema.org', '@type': 'WebSite', name: settings.storeName, url: siteConfig.url, inLanguage: 'pt-BR' };

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(organization) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(website) }} />
      <Header settings={settings} />
      <Hero settings={settings} heroProduct={showcases.heroProduct} />
      <PremiumBar />
      <Categories categories={categories} />
      <Products products={showcases.newArrivals} id="lancamentos" eyebrow="Novidades" title="RECÉM" accent="CHEGADOS." description="Produtos novos selecionados para a Bros Store." />
      <Products products={showcases.featured} id="destaques" eyebrow="Seleção Bros" title="EM" accent="DESTAQUE." description="Peças escolhidas para inspirar seu próximo visual." />
      <Products products={showcases.promotions} id="promocoes" eyebrow="Oportunidades" title="SELEÇÃO" accent="ESPECIAL." description="Produtos com condição especial disponível no catálogo." />
      <About />
      <Benefits />
      <Gallery settings={settings} />
      <FAQ />
      <ContactPremium settings={settings} />
      <Footer settings={settings} />
      <WhatsAppButton settings={settings} />
    </main>
  );
}
