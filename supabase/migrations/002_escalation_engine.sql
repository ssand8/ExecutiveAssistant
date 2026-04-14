-- ─────────────────────────────────────────────────────────────────────────────
-- 002_escalation_engine.sql
-- Escalation Engine: state machine tracking + nudge history
-- ─────────────────────────────────────────────────────────────────────────────

-- Escalation levels:
--   0  on_track        — no action needed
--   1  soft_nudge      — push notification reminder
--   2  firm_nudge      — push notification, overdue
--   3  sms_escalation  — Twilio SMS, 24h+ overdue
--   4  blocked         — app locked until user responds

CREATE TYPE escalation_level AS ENUM ('0', '1', '2', '3', '4');
CREATE TYPE nudge_channel AS ENUM ('push', 'sms', 'in_app');

-- One row per task, upserted by the sweep function
CREATE TABLE escalation_state (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id         uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  level           escalation_level NOT NULL DEFAULT '0',
  last_nudge_at   timestamptz,
  nudge_count     integer NOT NULL DEFAULT 0,
  -- Timestamps for when each level was first entered
  level_1_at      timestamptz,
  level_2_at      timestamptz,
  level_3_at      timestamptz,
  level_4_at      timestamptz,
  -- Resolved when user completes task or submits forced response
  resolved_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(task_id)
);

-- Append-only log of every nudge sent
CREATE TABLE nudge_history (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  level       escalation_level NOT NULL,
  channel     nudge_channel NOT NULL,
  message     text NOT NULL,
  -- Expo push receipt or Twilio SID, null for in_app
  external_id text,
  sent_at     timestamptz NOT NULL DEFAULT now()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX idx_escalation_state_user_id   ON escalation_state(user_id);
CREATE INDEX idx_escalation_state_task_id   ON escalation_state(task_id);
CREATE INDEX idx_escalation_state_level     ON escalation_state(level) WHERE resolved_at IS NULL;
CREATE INDEX idx_nudge_history_task_id      ON nudge_history(task_id);
CREATE INDEX idx_nudge_history_user_sent    ON nudge_history(user_id, sent_at DESC);

-- ── updated_at trigger (reuse existing function from migration 001) ────────────

CREATE TRIGGER set_escalation_state_updated_at
  BEFORE UPDATE ON escalation_state
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE escalation_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE nudge_history    ENABLE ROW LEVEL SECURITY;

-- Users can read their own escalation state (for blocked-state UI)
CREATE POLICY "Users can view own escalation state"
  ON escalation_state FOR SELECT
  USING (auth.uid() = user_id);

-- Users can read their own nudge history
CREATE POLICY "Users can view own nudge history"
  ON nudge_history FOR SELECT
  USING (auth.uid() = user_id);

-- Service role has full access (used by Edge Functions)
-- No explicit policy needed — service role bypasses RLS

-- ── Add phone_number to users for SMS escalation ──────────────────────────────

ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS sms_opt_in   boolean NOT NULL DEFAULT false;

-- ── pre_deadline_warned flag on tasks (avoid duplicate pre-deadline nudges) ───

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS pre_deadline_warned_at timestamptz;
