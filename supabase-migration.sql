-- ===== TABLES for table management =====
CREATE TABLE IF NOT EXISTS tables (
  id SERIAL PRIMARY KEY,
  table_number INTEGER UNIQUE NOT NULL,
  seats INTEGER NOT NULL DEFAULT 2,
  label TEXT,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'reserved')),
  current_customer TEXT,
  occupied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed tables (adjust to match Mr Jackson's actual layout)
INSERT INTO tables (table_number, seats, label, status) VALUES
  (1, 2, 'Window Seat', 'available'),
  (2, 2, 'Bar Side', 'available'),
  (3, 4, 'Courtyard', 'available'),
  (4, 4, 'Main Floor', 'available'),
  (5, 2, 'Corner Booth', 'available'),
  (6, 6, 'Large Table', 'available'),
  (7, 4, 'Garden View', 'available'),
  (8, 2, 'Front Patio', 'available'),
  (9, 8, 'Group Table', 'available')
ON CONFLICT (table_number) DO NOTHING;

-- Enable RLS
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;

-- Allow public reads
CREATE POLICY "Public can view tables" ON tables
  FOR SELECT USING (true);

-- Only service role can update
CREATE POLICY "Service role manages tables" ON tables
  FOR ALL USING (auth.role() = 'service_role');

-- ===== BOOKINGS table =====
CREATE TABLE IF NOT EXISTS bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  party_size INTEGER NOT NULL DEFAULT 2,
  date DATE NOT NULL,
  time_slot TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed', 'no_show')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Service role only
CREATE POLICY "Service role manages bookings" ON bookings
  FOR ALL USING (auth.role() = 'service_role');

-- ===== Add table_number to orders for dine-in tracking =====
ALTER TABLE orders ADD COLUMN IF NOT EXISTS table_number INTEGER;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_context TEXT DEFAULT 'standard';
-- order_context: 'standard' | 'dine_in' | 'queue_preorder' | 'booking_preorder'

-- ===== Booking confirmation + reminder tracking =====
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reminded_at TIMESTAMPTZ;
-- confirmed_at: set when customer taps "I'm Here — Check In" on the manage page
-- reminded_at:  set when the 15-min reminder SMS is sent (prevents duplicate sends)
