-- Plano trial (cupom) + tabela de cupons validada no banco
-- Ao criar cupom novo: INSERT aqui (ou SQL Editor) — espelhe em src/lib/trial-coupons-catalog.ts para documentação/prefill.

-- 1) plan_tier inclui trial
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_plan_tier_check;

-- Dados legados podem ter tier fora da lista (casing, typo, valor antigo).
-- Normaliza para um dos valores permitidos antes do novo CHECK.
UPDATE public.profiles
SET plan_tier = CASE lower(trim(plan_tier))
  WHEN 'legacy' THEN 'legacy'
  WHEN 'padrao' THEN 'padrao'
  WHEN 'pro' THEN 'pro'
  WHEN 'staff' THEN 'staff'
  WHEN 'trial' THEN 'trial'
  ELSE 'padrao'
END
WHERE plan_tier IS NOT NULL;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_plan_tier_check
  CHECK (plan_tier = ANY (ARRAY[
    'legacy'::text,
    'padrao'::text,
    'pro'::text,
    'staff'::text,
    'trial'::text
  ]));

-- 2) Fim do acesso trial + WhatsApp no cadastro
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trial_access_until timestamptz;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS whatsapp_phone text;

COMMENT ON COLUMN public.profiles.trial_access_until IS 'UTC: após este instante o trial expira (cron + middleware).';
COMMENT ON COLUMN public.profiles.whatsapp_phone IS 'WhatsApp informado no cadastro trial (apenas dígitos / E.164 simplificado).';

-- 3) Cupons (fonte de verdade para validação no signup)
CREATE TABLE IF NOT EXISTS public.trial_coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  duration_days integer NOT NULL CHECK (duration_days >= 1 AND duration_days <= 365),
  is_active boolean NOT NULL DEFAULT true,
  max_uses integer NOT NULL DEFAULT 99999 CHECK (max_uses >= 0),
  uses_count integer NOT NULL DEFAULT 0 CHECK (uses_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT trial_coupons_code_key UNIQUE (code)
);

CREATE INDEX IF NOT EXISTS idx_trial_coupons_active ON public.trial_coupons (is_active) WHERE is_active = true;

ALTER TABLE public.trial_coupons ENABLE ROW LEVEL SECURITY;

-- Sem policies: só service role / backend acessa

COMMENT ON TABLE public.trial_coupons IS 'Cupons de cadastro trial; validar sempre no servidor.';

-- 4) Incremento atômico de uso (evita estourar max_uses)
CREATE OR REPLACE FUNCTION public.trial_coupon_increment_use(p_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  norm text;
BEGIN
  norm := upper(trim(p_code));
  IF norm = '' THEN
    RETURN false;
  END IF;

  UPDATE public.trial_coupons
  SET
    uses_count = uses_count + 1,
    updated_at = now()
  WHERE code = norm
    AND is_active = true
    AND uses_count < max_uses;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.trial_coupon_increment_use(text) FROM PUBLIC;

-- Seeds (ajuste max_uses / duration_days conforme campanha)
INSERT INTO public.trial_coupons (code, duration_days, is_active, max_uses, uses_count)
VALUES
  ('1DAYFREE', 1, true, 99999, 0),
  ('BRENDA3DAYS', 3, true, 99999, 0)
ON CONFLICT (code) DO NOTHING;
