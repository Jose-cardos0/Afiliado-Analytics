-- Expande posições de notificação (legacy top/bottom → top_right/bottom_right).
-- ORDEM: primeiro remover o CHECK antigo (só top/bottom), senão o UPDATE para top_right falha (23514).

ALTER TABLE capture_sites
  DROP CONSTRAINT IF EXISTS capture_sites_notifications_position_check;

UPDATE capture_sites
SET notifications_position = 'top_right'
WHERE notifications_position = 'top';

UPDATE capture_sites
SET notifications_position = 'bottom_right'
WHERE notifications_position = 'bottom';

ALTER TABLE capture_sites
  ADD CONSTRAINT capture_sites_notifications_position_check
  CHECK (
    notifications_position IN (
      'top_left',
      'top_center',
      'top_right',
      'bottom_left',
      'bottom_center',
      'bottom_right',
      'center',
      'middle_left',
      'middle_right'
    )
  );

ALTER TABLE capture_sites
  ALTER COLUMN notifications_position SET DEFAULT 'top_right';
