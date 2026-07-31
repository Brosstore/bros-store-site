import Header from '../components/Header';
import Hero from '../components/Hero';
import Categories from '../components/Categories';
import Products from '../components/Products';
import About from '../components/About';
import { Gallery, Benefits, FAQ, ContactPremium } from '../components/PremiumDetails';
import Footer from '../components/Footer';
import WhatsAppButton from '../components/WhatsAppButton';
import PremiumBar from '../components/PremiumBar';
import { getCategories, getFeaturedProducts } from '../lib/catalog/products';

export default async function Home() {
  const [categories, featuredProducts] = await Promise.all([
    getCategories(),
    getFeaturedProducts(),
  ]);

  return (
    <main>
      <Header />
      <Hero />
      <PremiumBar />
      <Categories categories={categories} />
      <Products products={featuredProducts} />
      <About />
      <Benefits />
      <Gallery />
      <FAQ />
      <ContactPremium />
      <Footer />
      <WhatsAppButton />
    </main>
  );
}
