-- Ajuste: bônus mensal Afiliado Coins — Pro +100, Staff +1000 (UTC), idempotente por mês.
-- Aplica-se a projetos que já rodaram 20260402_afiliado_coins.sql com a função antiga.

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
