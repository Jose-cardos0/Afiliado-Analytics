-- Cole no Supabase: Dashboard → SQL Editor → Run
-- Corrige: "violates check constraint capture_sites_page_template_check"
-- quando o projeto já tem templates novos no código mas o banco ficou com CHECK antigo.

ALTER TABLE public.capture_sites
  DROP CONSTRAINT IF EXISTS capture_sites_page_template_check;

ALTER TABLE public.capture_sites
  ADD CONSTRAINT capture_sites_page_template_check
  CHECK (page_template IN (
    'classic',
    'vip_rosa',
    'vip_terroso',
    'vinho_rose',
    'the_new_chance',
    'aurora_ledger',
    'jardim_floral'
  ));
