import { notFound, redirect } from 'next/navigation';
import { createClient } from '../../../../lib/supabase/server';
import ImageManager from '../ImageManager';
import ProductForm from '../ProductForm';

export const metadata = {
  title: 'Editar produto | Painel Bros Store',
  robots: { index: false, follow: false },
};

export default async function EditProductPage({ params }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/admin/login');

  const { data: product } = await supabase
    .from('products')
    .select(`
      id, name, slug, category_slug, category_name, brand, description,
      price_cents, old_price_cents, stock, badge, featured, active, sizes, colors,
      product_images(id, storage_path, position)
    `)
    .eq('id', params.id)
    .maybeSingle();

  if (!product) notFound();

  const { product_images: productImages = [], ...productData } = product;
  const images = productImages
    .sort((first, second) => first.position - second.position)
    .map((image) => ({
      ...image,
      url: supabase.storage.from('product-images').getPublicUrl(image.storage_path).data.publicUrl,
    }));

  return (
    <main className="min-h-screen bg-ink px-5 py-8 text-white sm:px-8 lg:px-12">
      <div className="mx-auto max-w-4xl">
        <header className="border-b border-white/10 pb-7">
          <a href="/admin/produtos" className="text-xl font-extrabold tracking-[.08em]">
            BROS<span className="ml-1 text-brand">STORE</span>
          </a>
          <p className="mt-2 text-sm text-zinc-400">Painel / Produtos / Editar</p>
        </header>

        <section className="py-10">
          <p className="eyebrow">Edição</p>
          <h1 className="text-4xl font-extrabold tracking-tight">Editar produto</h1>
          <p className="mt-3 text-sm text-zinc-400">As imagens atuais serão preservadas.</p>
          <ProductForm product={productData} />
          <ImageManager productId={product.id} initialImages={images} />
        </section>
      </div>
    </main>
  );
}
