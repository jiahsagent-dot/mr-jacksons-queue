-- Mr Jackson — Schema Update v2 (Order & Pay)
-- Run this in Supabase SQL Editor AFTER the initial schema

-- Drop and recreate orders table with new fields
DROP TABLE IF EXISTS orders;

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  customer_name TEXT NOT NULL,
  phone TEXT,
  time_slot TEXT,
  queue_entry_id UUID REFERENCES queue_entries(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'received', 'preparing', 'ready', 'served', 'cancelled')),
  items JSONB NOT NULL DEFAULT '[]',
  notes TEXT,
  stripe_session_id TEXT,
  paid_at TIMESTAMPTZ
);

-- Index
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status, created_at);

-- RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Public can read own order (for receipt page)
CREATE POLICY "Public can read orders" ON orders FOR SELECT USING (true);
-- Service role handles inserts/updates (bypasses RLS)
