// Business rules and configuration — NOT menu item data.
// Menu items live in the Supabase menu_items table.

export const surcharges = {
  weekend: 0.10,
  public_holiday: 0.15,
}

export const dietaryTags: Record<string, string> = {
  V: 'Vegetarian option available',
  LG: 'Low gluten option available on request',
  VG: 'Vegan option available on request',
  DF: 'Dairy free option available on request',
}

export const specialDeal = {
  description: 'Choose one main meal paired with choice of alcoholic beverage',
  price: 30.99,
}

export const alterations = {
  milk: { options: ['Almond', 'Oat', 'Lactose Free', 'Coconut', 'Tiger', 'Decaf'], price: 0.90 },
  syrup: { options: ['Vanilla', 'Caramel', 'Hazelnut', 'Sugar'], price: 0.90 },
}

// Types
export type MenuItem = {
  id: string | number
  name: string
  description: string
  price: number
  tags: string[]
  available?: boolean
}

export type MenuCategory = {
  name: string
  items: MenuItem[]
}
