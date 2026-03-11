import { supabaseAdmin } from './supabase'

export type Table = {
  id: number
  table_number: number
  seats: number
  status: 'available' | 'occupied' | 'reserved'
  label?: string
}

// Fetch all tables with their current status
export async function getTables() {
  const admin = supabaseAdmin()
  const { data, error } = await admin
    .from('tables')
    .select('*')
    .order('table_number', { ascending: true })

  if (error) throw error
  return (data || []) as Table[]
}

// Check if any tables are available
export async function hasAvailableTables(): Promise<boolean> {
  const admin = supabaseAdmin()
  const { count, error } = await admin
    .from('tables')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'available')

  if (error) throw error
  return (count || 0) > 0
}

// Reserve a specific table
export async function reserveTable(tableNumber: number, customerName: string): Promise<boolean> {
  const admin = supabaseAdmin()
  const { data, error } = await admin
    .from('tables')
    .update({ status: 'occupied', current_customer: customerName })
    .eq('table_number', tableNumber)
    .eq('status', 'available')
    .select()

  if (error) throw error
  return (data?.length || 0) > 0
}
