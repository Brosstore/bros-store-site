// Configuração central da Bros Store.
// Edite os valores abaixo para atualizar o site inteiro (WhatsApp, redes sociais,
// produtos, avaliações etc.) sem precisar mexer nos componentes.

export const siteConfig = {
  name: 'Bros Store',
  tagline: 'Vista sua atitude.',
  url: 'https://bros-store-site.vercel.app', // troque aqui se comprar um domínio próprio depois
  description: 'Bros Store: moda, streetwear e acessórios para vestir sua personalidade.',

  // Apenas números, com DDI + DDD (ex: 55 11 91234-5678 -> 5511912345678)
  whatsappNumber: '5598985106065',
  whatsappDefaultMessage: 'Olá! Quero falar com a Bros Store.',

  email: 'contatobrosstore@gmail.com',
  instagramUrl: 'https://instagram.com/bros_store__',
  instagramHandle: '@bros_store__',

  address: {
    city: 'São Luís, MA',
    full: 'São Luís, MA — Brasil',
    mapsQuery: 'São Luís, MA',
  },
};

export function whatsappLink(message) {
  const text = encodeURIComponent(message || siteConfig.whatsappDefaultMessage);
  return `https://wa.me/${siteConfig.whatsappNumber}?text=${text}`;
}
