import Header from '../components/Header';
import Hero from '../components/Hero';
import Categories from '../components/Categories';
import Products from '../components/Products';
import About from '../components/About';
import { Gallery, Benefits, FAQ, ContactPremium } from '../components/PremiumDetails';
import Footer from '../components/Footer';
import WhatsAppButton from '../components/WhatsAppButton';
import PremiumBar from '../components/PremiumBar';

export default function Home() {
  return (
    <main>
      <Header />
      <Hero />
      <PremiumBar />
      <Categories />
      <Products />
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
