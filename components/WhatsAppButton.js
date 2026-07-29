import { MessageCircle } from 'lucide-react';
import { whatsappLink } from '../lib/siteConfig';

export default function WhatsAppButton() {
  return <a href={whatsappLink()} target="_blank" rel="noreferrer" aria-label="Falar pelo WhatsApp" className="fixed bottom-5 right-5 z-50 grid h-[50px] w-[50px] place-items-center rounded-full bg-[#25D366] text-white transition hover:scale-105" style={{ animation: 'pulse-soft 3s ease-in-out infinite' }} title="Fale conosco no WhatsApp"><MessageCircle size={23} fill="currentColor"/></a>;
}
