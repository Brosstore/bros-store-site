const catalogProducts = [
  {
    id: 'adidas-adizero', name: 'Adidas Adizero', brand: 'Adidas', category: 'Calçados', price: 'R$ 329,99', badge: 'NOVO', sizes: ['34', '35', '36', '37', '38', '39'], colors: ['#FFFFFF', '#080808'], description: 'Tênis Adidas Adizero com visual esportivo e acabamento marcante para acompanhar a rotina.', images: ['/images/catalogo-drive/adidas/adizero/capa.jpg', '/images/catalogo-drive/adidas/adizero/galeria-01.jpg', '/images/catalogo-drive/adidas/adizero/galeria-03.png'],
  },
  {
    id: 'adidas-campus', name: 'Adidas Campus', brand: 'Adidas', category: 'Calçados', price: 'R$ 199,99', badge: 'MAIS VENDIDO', sizes: ['34', '35', '36', '37', '38', '39'], colors: ['#080808', '#FFFFFF'], description: 'Silhueta clássica de streetwear, com perfil baixo e presença urbana.', images: ['/images/catalogo-drive/adidas/campus/capa.jpg', '/images/catalogo-drive/adidas/campus/galeria-01.jpg', '/images/catalogo-drive/adidas/campus/galeria-02.jpg'],
  },
  {
    id: 'adidas-forum', name: 'Adidas Forum', brand: 'Adidas', category: 'Calçados', price: 'R$ 199,90', badge: 'NOVO', sizes: ['34', '35', '36', '37', '38', '39'], colors: ['#FFFFFF', '#080808'], description: 'Um clássico de quadra reinterpretado para composições urbanas.', images: ['/images/catalogo-drive/adidas/forum/capa.jpg', '/images/catalogo-drive/adidas/forum/galeria-01.jpg', '/images/catalogo-drive/adidas/forum/galeria-02.jpg'],
  },
  {
    id: 'adidas-samba', name: 'Adidas Samba', brand: 'Adidas', category: 'Calçados', price: 'R$ 179,99', badge: 'MAIS VENDIDO', sizes: ['34', '35', '36', '37', '38', '39'], colors: ['#FFFFFF', '#080808'], description: 'Perfil retrô e versátil para completar looks com personalidade.', images: ['/images/catalogo-drive/adidas/samba/capa.jpg', '/images/catalogo-drive/adidas/samba/galeria-01.jpg', '/images/catalogo-drive/adidas/samba/galeria-02.jpg'],
  },
  {
    id: 'adidas-sl-72', name: 'Adidas SL 72', brand: 'Adidas', category: 'Calçados', price: 'R$ 329,99', badge: 'NOVO', sizes: ['34', '35', '36', '37', '38', '39'], colors: ['#800020', '#F5C518'], description: 'Referência retrô de corrida com linhas leves e acabamento cheio de estilo.', images: ['/images/catalogo-drive/adidas/sl-72/capa.jpg'],
  },
  {
    id: 'new-balance-530', name: 'New Balance 530', brand: 'New Balance', category: 'Calçados', price: 'R$ 299,99', badge: 'NOVO', sizes: ['34', '35', '36', '37', '38', '39'], colors: ['#FFFFFF', '#A1A1AA'], description: 'Conforto e visual esportivo em uma silhueta que marcou o streetwear.', images: ['/images/catalogo-drive/new-balance/530/capa.png', '/images/catalogo-drive/new-balance/530/galeria-01.png', '/images/catalogo-drive/new-balance/530/galeria-02.png'],
  },
  {
    id: 'new-balance-9060', name: 'New Balance 9060', brand: 'New Balance', category: 'Calçados', price: 'R$ 299,99', oldPrice: 'R$ 329,99', badge: 'PROMOÇÃO', sizes: ['34', '35', '36', '37', '38', '39'], colors: ['#FFFFFF', '#A1A1AA'], description: 'Design robusto e contemporâneo, feito para destacar o seu visual.', images: ['/images/catalogo-drive/new-balance/9060/capa.png', '/images/catalogo-drive/new-balance/9060/galeria-01.png', '/images/catalogo-drive/new-balance/9060/galeria-02.jpg'],
  },
  {
    id: 'mizuno-pro-14', name: 'Mizuno Pro 14', brand: 'Mizuno', category: 'Calçados', price: 'R$ 349,99', badge: 'NOVO', sizes: ['34', '35', '36', '37', '38', '39'], colors: ['#FFFFFF', '#080808'], description: 'Tênis de perfil esportivo, com construção confortável para o dia a dia.', images: ['/images/catalogo-drive/mizuno/pro-14/capa.png', '/images/catalogo-drive/mizuno/pro-14/galeria-01.png', '/images/catalogo-drive/mizuno/pro-14/galeria-02.png'],
  },
  {
    id: 'nike-air-force', name: 'Nike Air Force', brand: 'Nike', category: 'Calçados', price: 'R$ 189,99', badge: 'MAIS VENDIDO', sizes: ['34', '35', '36', '37', '38', '39'], colors: ['#FFFFFF', '#080808'], description: 'Ícone urbano de cano baixo, versátil para todos os momentos.', images: ['/images/catalogo-drive/nike/air-force/capa.jpg', '/images/catalogo-drive/nike/air-force/galeria-01.jpg', '/images/catalogo-drive/nike/air-force/galeria-02.jpg'],
  },
  {
    id: 'nike-dunk', name: 'Nike Dunk', brand: 'Nike', category: 'Calçados', price: 'R$ 199,99', badge: 'NOVO', sizes: ['34', '35', '36', '37', '38', '39'], colors: ['#FFFFFF', '#080808'], description: 'Silhueta clássica de basquete que se tornou essencial no streetwear.', images: ['/images/catalogo-drive/nike/dunk/capa.jpg', '/images/catalogo-drive/nike/dunk/galeria-01.jpg', '/images/catalogo-drive/nike/dunk/galeria-02.jpg'],
  },
  {
    id: 'on-cloud', name: 'On Cloud', brand: 'On Cloud', category: 'Calçados', price: 'R$ 199,99', badge: 'NOVO', sizes: ['34', '35', '36', '37', '38', '39'], colors: ['#FFFFFF', '#080808'], description: 'Leveza e conforto em um tênis de design contemporâneo.', images: ['/images/catalogo-drive/on-cloud/catalogo-geral/capa.png', '/images/catalogo-drive/on-cloud/catalogo-geral/galeria-01.png', '/images/catalogo-drive/on-cloud/catalogo-geral/galeria-02.png'],
  },
];

export const products = [
  ...catalogProducts,
  {
    id: 'camiseta-logo-bros',
    name: 'Camiseta Logo Bros',
    category: 'Masculino',
    price: 'R$ 129,90',
    badge: 'NOVO',
    colors: ['#080808', '#F5C518', '#FFFFFF'],
    description:
      'Camiseta de modelagem regular com algodão premium e assinatura Bros em destaque.',
    images: [
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1300&q=85',
      'https://images.unsplash.com/photo-1503341504253-dff4815485f1?auto=format&fit=crop&w=1300&q=85',
      'https://images.unsplash.com/photo-1566206091558-7f218b696731?auto=format&fit=crop&w=1300&q=85',
    ],
  },

  {
    id: 'tenis-movimento',
    name: 'Tênis Movimento',
    category: 'Calçados',
    price: 'R$ 429,90',
    oldPrice: 'R$ 499,90',
    badge: 'MAIS VENDIDO',
    colors: ['#080808', '#FFFFFF'],
    description:
      'Tênis urbano de perfil baixo, construído para acompanhar os seus movimentos.',
    images: [
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1300&q=85',
      'https://images.unsplash.com/photo-1495555961986-6d4c1ecb7be3?auto=format&fit=crop&w=1300&q=85',
      'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?auto=format&fit=crop&w=1300&q=85',
    ],
  },

  {
    id: 'moletom-atitude',
    name: 'Moletom Atitude',
    category: 'Masculino',
    price: 'R$ 219,90',
    oldPrice: 'R$ 269,90',
    badge: 'PROMOÇÃO',
    colors: ['#080808', '#A1A1AA'],
    description:
      'Moletom encorpado, confortável e essencial para os dias em que sua atitude fala primeiro.',
    images: [
      'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=1300&q=85',
      'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=1300&q=85',
      'https://images.unsplash.com/photo-1627225924765-552d49cf47ad?auto=format&fit=crop&w=1300&q=85',
    ],
  },

  {
    id: 'bone-assinatura',
    name: 'Boné Assinatura',
    category: 'Acessórios',
    price: 'R$ 99,90',
    badge: 'NOVO',
    colors: ['#080808', '#F5C518'],
    description:
      'Boné de aba curva com acabamento premium e o símbolo da Bros bordado.',
    images: [
      'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=1300&q=85',
      'https://images.unsplash.com/photo-1521369909029-2afed882baee?auto=format&fit=crop&w=1300&q=85',
      'https://images.unsplash.com/photo-1588742238091-58a5b0a9a7e2?auto=format&fit=crop&w=1300&q=85',
    ],
  },

  {
    id: 'camiseta-essential',
    name: 'Camiseta Essential',
    category: 'Feminino',
    price: 'R$ 119,90',
    badge: 'NOVO',
    colors: ['#FFFFFF', '#080808'],
    description:
      'Camiseta essencial de algodão com caimento leve e conforto para todos os momentos.',
    images: [
      'https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?auto=format&fit=crop&w=1300&q=85',
      'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1300&q=85',
      'https://images.unsplash.com/photo-1496217590455-aa63a8350eea?auto=format&fit=crop&w=1300&q=85',
    ],
  },

  {
    id: 'bolsa-street',
    name: 'Bolsa Street',
    category: 'Acessórios',
    price: 'R$ 149,90',
    oldPrice: 'R$ 189,90',
    badge: 'PROMOÇÃO',
    colors: ['#080808', '#A1A1AA'],
    description:
      'Bolsa compacta e funcional para levar o essencial com a sua identidade.',
    images: [
      'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1300&q=85',
      'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1100&q=75',
      'https://images.unsplash.com/photo-1554342872-034a06541bad?auto=format&fit=crop&w=1300&q=85',
    ],
  },

  {
    id: 'tenis-urban-run',
    name: 'Tênis Urban Run',
    category: 'Calçados',
    price: 'R$ 399,90',
    badge: 'MAIS VENDIDO',
    colors: ['#FFFFFF', '#080808'],
    description:
      'Tênis de perfil urbano com conforto para acompanhar o seu ritmo.',
    images: [
      'https://images.unsplash.com/photo-1495555961986-6d4c1ecb7be3?auto=format&fit=crop&w=1300&q=85',
      'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?auto=format&fit=crop&w=1300&q=85',
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1300&q=85',
    ],
  },

  {
    id: 'jaqueta-movimento',
    name: 'Jaqueta Movimento',
    category: 'Feminino',
    price: 'R$ 289,90',
    badge: 'NOVO',
    colors: ['#080808', '#F5C518'],
    description:
      'Jaqueta versátil para camadas urbanas e combinações cheias de atitude.',
    images: [
      'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1300&q=85',
      'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=1300&q=85',
      'https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?auto=format&fit=crop&w=1300&q=85',
    ],
  },

  {
    id: 'nike-blazer-mid-classic',
    name: 'Nike Blazer Mid Classic',
    brand: 'Nike',
    category: 'Calçados',
    price: 'R$ 240,00',
    badge: 'NOVO',
    colors: ['#FFFFFF', '#080808'],
    sizes: ['34', '35', '36', '37', '38', '39'],
    description:
      'O Nike Blazer Mid Classic une o visual retrô das quadras à versatilidade do streetwear moderno. Seu acabamento oferece conforto, resistência e excelente ajuste para o uso diário. A combinação do cabedal branco com o detalhe preto cria um visual marcante e fácil de combinar.',
    images: [
      '/produtos/nike-blazer-mid-classic/1.jpg',
      '/produtos/nike-blazer-mid-classic/2.jpg',
      '/produtos/nike-blazer-mid-classic/3.jpg',
      '/produtos/nike-blazer-mid-classic/4.jpg',
    ],
  },

  {
    id: 'adidas-forum-white-sky',
    name: 'Adidas Fórum White Sky',
    brand: 'Adidas',
    category: 'Calçados',
    price: 'R$ 240,00',
    badge: 'NOVO',
    colors: ['#FFFFFF', '#87CEEB'],
    sizes: ['34', '35', '36', '37', '38', '39'],
    description:
      'O Adidas Fórum White Sky combina o estilo clássico da linha Forum com detalhes modernos em branco e azul celeste. Confortável, versátil e cheio de personalidade, possui acabamento resistente e solado em borracha para acompanhar diferentes momentos do dia.',
    images: [
      '/produtos/adidas-forum-white-sky/1.jpg',
      '/produtos/adidas-forum-white-sky/2.jpg',
      '/produtos/adidas-forum-white-sky/3.jpg',
      '/produtos/adidas-forum-white-sky/4.jpg',
    ],
  },

  {
    id: 'chanel-mini-bow-bag',
    name: 'Chanel Mini Bow Bag',
    brand: 'Chanel',
    category: 'Acessórios',
    price: 'R$ 270,00',
    badge: 'NOVO',
    colors: ['#D2B48C'],
    description:
      'A Chanel Mini Bow Bag combina elegância e praticidade em um acessório compacto e sofisticado. Seu acabamento matelassado, os detalhes metálicos dourados e a alça em corrente valorizam produções casuais e refinadas. Ideal para carregar os itens essenciais com estilo.',
    images: [
      '/produtos/chanel-mini-bow-bag/1.jpg',
      '/produtos/chanel-mini-bow-bag/2.jpg',
      '/produtos/chanel-mini-bow-bag/3.jpg',
    ],
  },
];

export const getProduct = (id) =>
  products.find((product) => product.id === id);

export const categories = [
  { num: '01', name: 'Camisetas', desc: 'Modelagens marcantes para todos os dias.', image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=85' },
  { num: '02', name: 'Bermudas', desc: 'Conforto e atitude no mesmo movimento.', image: 'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?auto=format&fit=crop&w=900&q=85' },
  { num: '03', name: 'Calças', desc: 'Peças versáteis para compor seu estilo.', image: 'https://images.unsplash.com/photo-1548883354-7622d03aca27?auto=format&fit=crop&w=900&q=85' },
  { num: '04', name: 'Tênis', desc: 'O passo certo para chegar mais longe.', image: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=900&q=85' },
  { num: '05', name: 'Bonés', desc: 'Assinatura para o seu visual.', image: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=900&q=85' },
  { num: '06', name: 'Acessórios', desc: 'Detalhes que fazem a diferença.', image: 'https://images.unsplash.com/photo-1523779917675-b6ed3a42a561?auto=format&fit=crop&w=900&q=85' },
];
