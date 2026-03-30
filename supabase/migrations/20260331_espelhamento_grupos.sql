-- Espelhamento de grupos WhatsApp: config por usuário + log de payloads (n8n / app)

CREATE TABLE IF NOT EXISTS espelhamento_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instance_id uuid NOT NULL REFERENCES evolution_instances(id) ON DELETE CASCADE,
  grupo_origem_jid text NOT NULL,
  grupo_destino_jid text NOT NULL,
  grupo_origem_nome text,
  grupo_destino_nome text,
  sub_id_1 text NOT NULL DEFAULT '',
  sub_id_2 text NOT NULL DEFAULT '',
  sub_id_3 text NOT NULL DEFAULT '',
  ativo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, instance_id, grupo_origem_jid)
);

CREATE INDEX IF NOT EXISTS idx_espelhamento_config_user_ativo
  ON espelhamento_config(user_id) WHERE ativo = true;

CREATE INDEX IF NOT EXISTS idx_espelhamento_config_instance
  ON espelhamento_config(instance_id);

CREATE TABLE IF NOT EXISTS espelhamento_payloads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  config_id uuid REFERENCES espelhamento_config(id) ON DELETE SET NULL,
  id_mensagem_externa text,
  instancia_nome text,
  grupo_origem_jid text NOT NULL,
  texto_entrada text NOT NULL,
  texto_saida text,
  status text NOT NULL DEFAULT 'pendente',
  erro_detalhe text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT espelhamento_payloads_status_check CHECK (
    status IN ('pendente', 'enviado', 'ignorado', 'erro')
  )
);

CREATE INDEX IF NOT EXISTS idx_espelhamento_payloads_user_created
  ON espelhamento_payloads(user_id, created_at DESC);

ALTER TABLE espelhamento_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE espelhamento_payloads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "espelhamento_config_select_own" ON espelhamento_config;
CREATE POLICY "espelhamento_config_select_own"
  ON espelhamento_config FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "espelhamento_config_insert_own" ON espelhamento_config;
CREATE POLICY "espelhamento_config_insert_own"
  ON espelhamento_config FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "espelhamento_config_update_own" ON espelhamento_config;
CREATE POLICY "espelhamento_config_update_own"
  ON espelhamento_config FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "espelhamento_config_delete_own" ON espelhamento_config;
CREATE POLICY "espelhamento_config_delete_own"
  ON espelhamento_config FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "espelhamento_payloads_select_own" ON espelhamento_payloads;
CREATE POLICY "espelhamento_payloads_select_own"
  ON espelhamento_payloads FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "espelhamento_payloads_insert_own" ON espelhamento_payloads;
CREATE POLICY "espelhamento_payloads_insert_own"
  ON espelhamento_payloads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "espelhamento_payloads_update_own" ON espelhamento_payloads;
CREATE POLICY "espelhamento_payloads_update_own"
  ON espelhamento_payloads FOR UPDATE
  USING (auth.uid() = user_id);

COMMENT ON TABLE espelhamento_config IS 'Mapeia grupo origem -> destino para espelhar ofertas (Shopee) com link do usuário.';
COMMENT ON TABLE espelhamento_payloads IS 'Log de mensagens processadas pelo pipeline n8n / espelhamento.';
