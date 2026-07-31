// Compatibilidade temporária para imports legados.
// A camada de acesso do catálogo está em lib/catalog/products.js.
export {
  getAllProducts,
  getCategories,
  getProductBySlug,
  getProductsByCategory,
} from './catalog/products';
