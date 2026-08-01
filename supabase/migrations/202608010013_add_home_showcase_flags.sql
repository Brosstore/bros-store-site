-- Flags opcionais para montar vitrines da Home a partir de produtos reais.
-- A migration é segura para bancos que já possuam display_order.

alter table public.products
  add column if not exists featured_home boolean not null default false,
  add column if not exists new_arrival boolean not null default false,
  add column if not exists promotion_home boolean not null default false,
  add column if not exists hero_feature boolean not null default false,
  add column if not exists display_order integer not null default 0;
