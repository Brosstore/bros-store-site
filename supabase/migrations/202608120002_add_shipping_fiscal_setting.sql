-- A declaração de conteúdo depende do enquadramento fiscal do remetente.
-- Permanece desativada até confirmação explícita no painel administrativo.
alter table public.store_settings
  add column if not exists shipping_content_declaration_enabled boolean not null default false;
