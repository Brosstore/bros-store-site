-- Conteúdo opcional e administrável da Home.
-- Mantém os campos institucionais e o registro único existentes intactos.

alter table public.store_settings
  add column if not exists home_eyebrow text,
  add column if not exists home_title text,
  add column if not exists home_subtitle text,
  add column if not exists home_description text,
  add column if not exists home_primary_cta_label text,
  add column if not exists home_primary_cta_url text,
  add column if not exists home_secondary_cta_label text,
  add column if not exists home_secondary_cta_url text;
