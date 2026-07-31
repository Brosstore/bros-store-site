create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  image_path text,
  banner_path text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger categories_set_updated_at before update on public.categories for each row execute function public.set_updated_at();
create index categories_active_order_idx on public.categories (is_active, sort_order);

insert into public.categories (name, slug, description, sort_order)
values
  ('Camisetas', 'camisetas', 'Modelagens marcantes para todos os dias.', 10),
  ('Bermudas', 'bermudas', 'Conforto e atitude no mesmo movimento.', 20),
  ('Calças', 'calcas', 'Peças versáteis para compor seu estilo.', 30),
  ('Tênis', 'tenis', 'O passo certo para chegar mais longe.', 40),
  ('Bonés', 'bones', 'Assinatura para o seu visual.', 50),
  ('Acessórios', 'acessorios', 'Detalhes que fazem a diferença.', 60)
on conflict (slug) do nothing;

alter table public.products add column if not exists category_id uuid references public.categories(id) on delete set null;
create index if not exists products_category_id_idx on public.products (category_id);
update public.products p set category_id = c.id from public.categories c where c.slug = p.category_slug and p.category_id is null;

alter table public.categories enable row level security;
create policy "Leitura pública de categorias ativas" on public.categories for select to anon, authenticated using (is_active = true);
create policy "Administradores gerenciam categorias" on public.categories for all to authenticated using (exists (select 1 from public.admin_users where admin_users.user_id = auth.uid())) with check (exists (select 1 from public.admin_users where admin_users.user_id = auth.uid()));
