/**
 * Seed script: Migrates all menu items from the hardcoded menu.ts into the
 * Supabase menu_items table. Run once to unify the menu system.
 *
 * Usage: npx tsx scripts/seed-menu.ts
 *
 * Requires env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Or pass them inline: NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/seed-menu.ts
 */

import { menuData } from '../src/lib/menu'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SUPABASE_KEY)

async function seed() {
  console.log('🌱 Seeding menu items from hardcoded menu.ts...\n')

  // Check what already exists
  const { data: existing } = await admin.from('menu_items').select('name')
  const existingNames = new Set((existing || []).map((i: any) => i.name))

  if (existingNames.size > 0) {
    console.log(`⚠️  Found ${existingNames.size} existing items in menu_items table.`)
    console.log('   Skipping items that already exist (matched by name).\n')
  }

  let inserted = 0
  let skipped = 0

  for (let catIdx = 0; catIdx < menuData.categories.length; catIdx++) {
    const category = menuData.categories[catIdx]
    console.log(`📁 ${category.name} (${category.items.length} items)`)

    for (let itemIdx = 0; itemIdx < category.items.length; itemIdx++) {
      const item = category.items[itemIdx]

      if (existingNames.has(item.name)) {
        console.log(`   ⏭  ${item.name} (already exists)`)
        skipped++
        continue
      }

      const { error } = await admin.from('menu_items').insert({
        name: item.name,
        description: item.description || '',
        price: item.price,
        category: category.name,
        tags: item.tags || [],
        available: true,
        sort_order: itemIdx + 1,
      })

      if (error) {
        console.error(`   ❌ ${item.name}: ${error.message}`)
      } else {
        console.log(`   ✅ ${item.name} — $${item.price.toFixed(2)}`)
        inserted++
      }
    }
  }

  console.log(`\n✅ Done! Inserted: ${inserted}, Skipped: ${skipped}`)
  console.log(`   Total in DB: ${existingNames.size + inserted}`)
}

seed().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
