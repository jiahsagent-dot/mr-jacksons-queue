-- No-show timeout support
-- Run in Supabase SQL Editor

-- Add no_show_minutes to queue_settings (default 10 minutes)
ALTER TABLE queue_settings ADD COLUMN IF NOT EXISTS no_show_minutes INT DEFAULT 10;

-- Update existing row to have the default
UPDATE queue_settings SET no_show_minutes = 10 WHERE id = 1 AND no_show_minutes IS NULL;

-- Track which table was assigned to a called queue entry
ALTER TABLE queue_entries ADD COLUMN IF NOT EXISTS assigned_table INT;
