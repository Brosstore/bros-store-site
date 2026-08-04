export default function manifest() {
  return {
    name: 'Bros Store',
    short_name: 'Bros Store',
    description: 'Moda urbana, streetwear, calçados e acessórios.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0e0e0e',
    theme_color: '#dfff00',
    lang: 'pt-BR',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  };
}
