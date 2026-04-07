-- Notificações na página pública: ligar/desligar e posição (topo / rodapé).
ALTER TABLE public.capture_sites
  ADD COLUMN IF NOT EXISTS notifications_enabled boolean NOT NULL DEFAULT true;

ALTER TABLE public.capture_sites
  ADD COLUMN IF NOT EXISTS notifications_position text NOT NULL DEFAULT 'top';

ALTER TABLE public.capture_sites
  DROP CONSTRAINT IF EXISTS capture_sites_notifications_position_check;

ALTER TABLE public.capture_sites
  ADD CONSTRAINT capture_sites_notifications_position_check
  CHECK (notifications_position IN ('top', 'bottom'));
