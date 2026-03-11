-- Mr Jackson Mornington — Supabase Schema
-- Run this in your Supabase SQL Editor

-- Queue entries
CREATE TABLE IF NOT EXISTS queue_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  name TEXT NOT NULL,
  party_size INT NOT NULL CHECK (party_size >= 1 AND party_size <= 10),
  phone TEXT NOT NULL,
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'called', 'seated', 'left')),
  called_at TIMESTAMPTZ,
  seated_at TIMESTAMPTZ
);

-- Queue settings (single row)
CREATE TABLE IF NOT EXISTS queue_settings (
  id INT PRIMARY KEY DEFAULT 1,
  is_closed BOOLEAN DEFAULT FALSE,
  estimated_wait INT DEFAULT 20,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings row
INSERT INTO queue_settings (id, is_closed, estimated_wait)
VALUES (1, false, 20)
ON CONFLICT (id) DO NOTHING;

-- Orders (P1 feature)
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  queue_entry_id UUID REFERENCES queue_entries(id),
  customer_name TEXT NOT NULL,
  status TEXT DEFAULT 'received' CHECK (status IN ('received', 'preparing', 'ready', 'served')),
  items JSONB NOT NULL DEFAULT '[]',
  notes TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_queue_entries_status ON queue_entries(status, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status, created_at);

-- RLS
ALTER TABLE queue_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Public can insert into queue
CREATE POLICY "Public can join queue" ON queue_entries FOR INSERT WITH CHECK (true);
-- Public can read queue entries (for status page)
CREATE POLICY "Public can read queue entries" ON queue_entries FOR SELECT USING (true);
-- Public can read settings (for wait time display)
CREATE POLICY "Public can read settings" ON queue_settings FOR SELECT USING (true);
-- Service role (used by API) bypasses RLS — no extra policies needed

-- Supabase Auth: Create a staff user via Dashboard > Auth > Users
-- Email: staff@mrjackson.com.au (or whatever you choose)
-- Password: set a strong password
