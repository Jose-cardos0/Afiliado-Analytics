-- Afiliado Coins: saldo em profiles, histórico, compras Kiwify, crédito mensal por tier
-- Custos app: imagem 30, vídeo 70; Pro +100/mês UTC, Staff +1000/mês UTC

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS afiliado_coins integer NOT NULL DEFAULT 0;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS afiliado_coins_monthly_ym text NULL;

CREATE TABLE IF NOT EXISTS public.afiliado_coins_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delta integer NOT NULL,
  balance_after integer NOT NULL,
  reason text NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_afiliado_coins_ledger_user_created
  ON public.afiliado_coins_ledger (user_id, created_at DESC);

ALTER TABLE public.afiliado_coins_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "afiliado_coins_ledger_select_own" ON public.afiliado_coins_ledger;
CREATE POLICY "afiliado_coins_ledger_select_own"
  ON public.afiliado_coins_ledger FOR SELECT
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.afiliado_coins_kiwify_orders (
  order_id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coins integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_afiliado_coins_kiwify_orders_user
  ON public.afiliado_coins_kiwify_orders (user_id);

-- Crédito mensal: Pro +100, Staff +1000 (UTC YYYY-MM), uma vez por mês
CREATE OR REPLACE FUNCTION public.ensure_afiliado_monthly_pro_coins(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ym text := to_char((timezone('UTC', now()))::date, 'YYYY-MM');
  tier text;
  credited_ym text;
  bal integer;
  grant_amt integer;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT plan_tier, afiliado_coins_monthly_ym, afiliado_coins
  INTO tier, credited_ym, bal
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND OR tier IS NULL THEN
    RAISE EXCEPTION 'profile not found' USING ERRCODE = 'P0002';
  END IF;

  grant_amt := CASE tier
    WHEN 'staff' THEN 1000
    WHEN 'pro' THEN 100
    ELSE 0
  END;

  IF grant_amt > 0 AND (credited_ym IS DISTINCT FROM ym) THEN
    UPDATE public.profiles
    SET
      afiliado_coins = afiliado_coins + grant_amt,
      afiliado_coins_monthly_ym = ym
    WHERE id = p_user_id
    RETURNING afiliado_coins INTO bal;

    INSERT INTO public.afiliado_coins_ledger (user_id, delta, balance_after, reason, meta)
    VALUES (
      p_user_id,
      grant_amt,
      bal,
      'monthly_allowance',
      jsonb_build_object('ym', ym, 'plan_tier', tier)
    );
  END IF;

  RETURN bal;
END;
$$;

-- Consumo (imagem 30 / vídeo 70)
CREATE OR REPLACE FUNCTION public.consume_afiliado_coins(p_user_id uuid, p_amount integer, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  bal integer;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_amount');
  END IF;

  UPDATE public.profiles
  SET afiliado_coins = afiliado_coins - p_amount
  WHERE id = p_user_id AND afiliado_coins >= p_amount
  RETURNING afiliado_coins INTO bal;

  IF bal IS NULL THEN
    SELECT afiliado_coins INTO bal FROM public.profiles WHERE id = p_user_id;
    RETURN jsonb_build_object('ok', false, 'balance', COALESCE(bal, 0), 'error', 'insufficient');
  END IF;

  INSERT INTO public.afiliado_coins_ledger (user_id, delta, balance_after, reason, meta)
  VALUES (p_user_id, -p_amount, bal, p_reason, '{}'::jsonb);

  RETURN jsonb_build_object('ok', true, 'balance', bal);
END;
$$;

-- Estorno após falha da API (mesmo utilizador)
CREATE OR REPLACE FUNCTION public.refund_afiliado_coins(p_user_id uuid, p_amount integer, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  bal integer;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_amount');
  END IF;

  UPDATE public.profiles
  SET afiliado_coins = afiliado_coins + p_amount
  WHERE id = p_user_id
  RETURNING afiliado_coins INTO bal;

  INSERT INTO public.afiliado_coins_ledger (user_id, delta, balance_after, reason, meta)
  VALUES (p_user_id, p_amount, bal, p_reason, '{}'::jsonb);

  RETURN jsonb_build_object('ok', true, 'balance', bal);
END;
$$;

-- Crédito por compra Kiwify (apenas service_role — webhook)
CREATE OR REPLACE FUNCTION public.credit_afiliado_coins_kiwify(p_user_id uuid, p_order_id text, p_coins integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  bal integer;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF p_order_id IS NULL OR length(trim(p_order_id)) = 0 OR p_coins IS NULL OR p_coins <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_args');
  END IF;

  BEGIN
    INSERT INTO public.afiliado_coins_kiwify_orders (order_id, user_id, coins)
    VALUES (trim(p_order_id), p_user_id, p_coins);
  EXCEPTION
    WHEN unique_violation THEN
      SELECT afiliado_coins INTO bal FROM public.profiles WHERE id = p_user_id;
      RETURN jsonb_build_object('ok', true, 'credited', false, 'balance', COALESCE(bal, 0));
  END;

  UPDATE public.profiles
  SET afiliado_coins = afiliado_coins + p_coins
  WHERE id = p_user_id
  RETURNING afiliado_coins INTO bal;

  INSERT INTO public.afiliado_coins_ledger (user_id, delta, balance_after, reason, meta)
  VALUES (p_user_id, p_coins, bal, 'kiwify_purchase', jsonb_build_object('order_id', trim(p_order_id)));

  RETURN jsonb_build_object('ok', true, 'credited', true, 'balance', bal);
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_afiliado_monthly_pro_coins(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_afiliado_coins(uuid, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refund_afiliado_coins(uuid, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.credit_afiliado_coins_kiwify(uuid, text, integer) TO service_role;

COMMENT ON COLUMN public.profiles.afiliado_coins IS 'Saldo Afiliado Coins (gerador especialista + compras Kiwify + bônus mensal Pro)';
COMMENT ON COLUMN public.profiles.afiliado_coins_monthly_ym IS 'Último YYYY-MM UTC em que foi creditado o bônus mensal (Pro +100, Staff +1000)';
