const { Pool } = require('pg');

async function main() {
  const pool = new Pool({
    host: 'db.qducoenvjaotympjedrl.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'nnln1rIpuBFghmpp',
    ssl: { rejectUnauthorized: false },
  });

  const client = await pool.connect();
  console.log('Connected');

  // Create menu_items table
  await client.query(`
    CREATE TABLE IF NOT EXISTS menu_items (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      price DECIMAL(10,2) NOT NULL,
      category TEXT NOT NULL,
      tags TEXT[] DEFAULT '{}',
      available BOOLEAN DEFAULT TRUE,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  await client.query(`ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY`);
  await client.query(`DO $$ BEGIN
    CREATE POLICY "Public can read menu" ON menu_items FOR SELECT USING (true);
    EXCEPTION WHEN duplicate_object THEN NULL;
  END $$`);
  await client.query(`DO $$ BEGIN
    CREATE POLICY "Service role manages menu" ON menu_items FOR ALL USING (auth.role() = 'service_role');
    EXCEPTION WHEN duplicate_object THEN NULL;
  END $$`);
  console.log('Table created');

  // Check if already seeded
  const { rows: existing } = await client.query('SELECT count(*) FROM menu_items');
  if (parseInt(existing[0].count) > 0) {
    console.log(`Already has ${existing[0].count} items, skipping seed`);
    client.release();
    await pool.end();
    return;
  }

  // Seed from hardcoded menu
  const categories = [
    { name: "All Day Brunch", items: [
      { name: "Sourdough Toast", description: "Jam, peanut butter or vegemite", price: 11.00, tags: ["LG", "DF"] },
      { name: "Eggs Your Way", description: "Two poached, fried, or scrambled served on sourdough", price: 14.50, tags: ["LG", "DF"] },
      { name: "Bacon & Egg Roll", description: "Tomato relish, rocket, aioli. Add: Hashbrown +$4.00", price: 16.00, tags: ["LG", "DF"] },
      { name: "Chilli Scrambled Egg", description: "Scrambled egg, spring onion, feta, sriracha, crispy shallots, pickled onion on sourdough toast", price: 24.50, tags: ["LG"] },
      { name: "Mr Jackson", description: "Garlic roast mushroom, bacon, potato rosti, baked beans, avocado, tomato, poached eggs on sourdough toast", price: 25.00, tags: ["LG", "V"] },
      { name: "Loaded Mushroom", description: "Field mushrooms, feta, basil pesto, rocket, crushed nuts, fresh chilli, poached eggs", price: 25.00, tags: ["LG", "V"] },
      { name: "Smashed Avocado", description: "Avocado, hummus, whipped ricotta, fresh chilli, dukkah, rocket, pesto oil, poached eggs on sourdough toast", price: 24.50, tags: ["LG", "DF"] },
      { name: "Corn Fritters", description: "Avocado, poached egg, bacon, seeds, sour cream, chilli jam, halloumi", price: 25.50, tags: ["V"] },
      { name: "Mr Benedict", description: "Poached eggs, potato rosti, spinach, pickled onion, hollandaise, shallots. Choice of bacon or cured salmon", price: 26.00, tags: ["LG"] },
    ]},
    { name: "Salads & Bowls", items: [
      { name: "Salt & Pepper Calamari Salad", description: "Dusted calamari rings, mixed salad leaves, cherry tomato, Asian dressing, radish, fried capers", price: 25.90, tags: ["DF"] },
      { name: "Nourish Bowl", description: "Cajun spiced chicken, grains, braised cabbage, corn kernels, guacamole, black beans, tomato salsa, corn chips, chilli & lime crema", price: 24.50, tags: ["V", "LG"] },
      { name: "Poke Bowl", description: "Cured salmon, avocado, pickled ginger, edamame beans, cucumber, wakame salad, fried noodles, shallots, nuts, soy sauce", price: 26.00, tags: ["DF"] },
    ]},
    { name: "Sandwiches & Toasties", items: [
      { name: "BLTC", description: "Bacon, lettuce, tomato, cheese, mayo on sourdough. Add chips +$4.50", price: 20.50, tags: ["LG"] },
      { name: "Chicken Avocado Toastie", description: "Poached chicken, avocado and cheese blend. Add chips +$4.50", price: 19.50, tags: ["LG"] },
      { name: "Reuben Toastie", description: "Pastrami, mustard pickled relish, cheese, sauerkraut. Add chips +$4.50", price: 19.00, tags: ["LG"] },
    ]},
    { name: "Burgers", items: [
      { name: "Pulled Pork Burger", description: "BBQ pulled pork, slaw, kimchi, served with chips", price: 25.50, tags: ["DF"] },
      { name: "Chicken Burger", description: "Crumbed chicken, burger sauce, cheese, tomato, lettuce, with chips", price: 25.00, tags: [] },
      { name: "Chilli & Lime Fish & Chips", description: "Tempura fish, house dressing, garden salad, tartare sauce, lemon, chips", price: 25.50, tags: ["DF"] },
    ]},
    { name: "Bao Buns", items: [
      { name: "Caramel Fried Chicken Bun", description: "Apple, pomegranate, coriander, chilli, Vietnamese mint, mayo", price: 10.00, tags: ["DF"] },
      { name: "Sticky Pork Bun", description: "Sticky pork, coriander, Vietnamese mint, eggplant, chilli, Asian dressing", price: 10.00, tags: ["DF"] },
      { name: "Classic Bun", description: "Pork belly, braised cabbage, crushed nuts, hoisin", price: 10.00, tags: ["DF"] },
    ]},
    { name: "Something Sweet", items: [
      { name: "Banana Bread", description: "Vanilla mascarpone & seasonal fruits", price: 18.00, tags: [] },
      { name: "Acai Pancakes", description: "Acai puree, granola, maple syrup, mascarpone, mango, desiccated coconut", price: 23.00, tags: [] },
    ]},
    { name: "Sides", items: [
      { name: "Bowl of Chips", description: "", price: 10.00, tags: ["DF"] },
      { name: "Pumpkin Arancini", description: "", price: 10.00, tags: [] },
      { name: "Hollandaise / Hashbrown / Fetta / Baked Beans", description: "", price: 4.00, tags: [] },
      { name: "Mushroom / Tomato / Rosti / Avocado / Spinach", description: "", price: 5.00, tags: [] },
      { name: "Halloumi / Bacon / Grilled Chicken / Cured Salmon", description: "", price: 7.00, tags: [] },
    ]},
    { name: "Coffee", items: [
      { name: "Cappuccino / Latte / Flat White", description: "", price: 5.00, tags: [] },
      { name: "Magic / Piccolo", description: "", price: 5.00, tags: [] },
      { name: "Long Black / Espresso", description: "", price: 5.00, tags: [] },
      { name: "Long / Short Macchiato", description: "", price: 5.00, tags: [] },
      { name: "Mocha", description: "", price: 5.50, tags: [] },
      { name: "Affogato", description: "", price: 5.50, tags: [] },
      { name: "Matcha Latte", description: "Milk alt available +$0.90", price: 5.50, tags: ["DF"] },
      { name: "Turmeric Latte", description: "Milk alt available +$0.90", price: 5.50, tags: ["DF"] },
      { name: "Hot Chocolate", description: "", price: 6.00, tags: [] },
      { name: "Nutella Hot Chocolate", description: "", price: 8.50, tags: [] },
      { name: "Babychino with Marshmallow", description: "", price: 2.90, tags: [] },
      { name: "Iced Latte / Iced Long Black", description: "", price: 7.00, tags: [] },
      { name: "Iced Mocha", description: "", price: 8.00, tags: [] },
      { name: "Iced Coffee / Iced Chocolate", description: "", price: 9.00, tags: [] },
    ]},
    { name: "Tea & Chai", items: [
      { name: "English Breakfast / Earl Grey", description: "", price: 6.00, tags: [] },
      { name: "Green Tea / Peppermint", description: "", price: 6.00, tags: [] },
      { name: "Lemon Grass Ginger", description: "", price: 6.00, tags: [] },
      { name: "Powder Chai", description: "", price: 5.00, tags: [] },
      { name: "Prana Leaf Chai", description: "", price: 6.50, tags: [] },
      { name: "Turmeric Leaf Chai", description: "", price: 6.50, tags: [] },
      { name: "Iced Chai / Iced Matcha", description: "", price: 7.00, tags: [] },
      { name: "Strawberry Matcha", description: "", price: 7.50, tags: [] },
      { name: "Blueberry Matcha", description: "", price: 7.50, tags: [] },
    ]},
    { name: "Milkshakes", items: [
      { name: "Milkshake (Large)", description: "Chocolate, Nutella, Coffee, Vanilla, Strawberry", price: 9.00, tags: [] },
      { name: "Milkshake (Small)", description: "Chocolate, Nutella, Coffee, Vanilla, Strawberry", price: 7.00, tags: [] },
    ]},
    { name: "Smoothies", items: [
      { name: "Bananarama", description: "Banana, coconut milk, cinnamon, honey", price: 11.50, tags: ["DF"] },
      { name: "Acai Bliss", description: "Mix berry, acai, banana, coconut milk", price: 11.50, tags: ["DF"] },
      { name: "Tropical Tango", description: "Mango, passionfruit, orange, banana, honey, coconut milk", price: 11.50, tags: ["DF"] },
      { name: "Green Harmony", description: "Apple, mango, spinach, coconut milk", price: 11.50, tags: ["DF"] },
    ]},
    { name: "Fresh Juices", items: [
      { name: "Orange", description: "", price: 10.50, tags: ["DF"] },
      { name: "Apple Mint", description: "", price: 10.50, tags: ["DF"] },
      { name: "Apple and Orange", description: "", price: 10.50, tags: ["DF"] },
      { name: "Apple, Orange, Ginger, Coconut Water", description: "", price: 10.50, tags: ["DF"] },
      { name: "Watermelon, Mint, Lime", description: "", price: 10.50, tags: ["DF"] },
    ]},
    { name: "Cold Drinks", items: [
      { name: "Coconut Water", description: "", price: 5.00, tags: [] },
      { name: "Sparkling Water 250ml", description: "", price: 5.00, tags: [] },
      { name: "Sparkling Lemon 250ml", description: "", price: 5.00, tags: [] },
      { name: "Sparkling Water 750ml", description: "", price: 5.00, tags: [] },
      { name: "Coke", description: "", price: 5.00, tags: [] },
      { name: "Coke Zero", description: "", price: 5.00, tags: [] },
      { name: "Coconut Sparkling Water", description: "", price: 5.00, tags: [] },
      { name: "Lemon Lime Bitters", description: "", price: 5.00, tags: [] },
      { name: "Soda Co — Cola", description: "Natural bottled drink", price: 5.90, tags: [] },
      { name: "Soda Co — Ginger Beer", description: "Natural bottled drink", price: 5.90, tags: [] },
      { name: "Soda Co — Blood Orange", description: "Natural bottled drink", price: 5.90, tags: [] },
      { name: "Soda Co — Pink Lemonade", description: "Natural bottled drink", price: 5.90, tags: [] },
    ]},
    { name: "Wine & Sparkling", items: [
      { name: "Tara Roses Chardonnay", description: "Mornington Peninsula — glass / bottle", price: 13.90, tags: [] },
      { name: "Dal Zotto Pinot Grigio", description: "King Valley, VIC — glass / bottle", price: 12.90, tags: [] },
      { name: "Cloud Street Sauvignon Blanc", description: "Central Victoria — glass / bottle", price: 12.90, tags: [] },
      { name: "Yarrabank Estate Circle Rosé", description: "McLaren Vale, SA — glass / bottle", price: 13.90, tags: [] },
      { name: "Red Claw Pinot Noir", description: "Mornington Peninsula, VIC — glass / bottle", price: 13.90, tags: [] },
      { name: "Rockbare Clucky Shiraz", description: "South Australia — glass / bottle", price: 13.90, tags: [] },
      { name: "Dal Zotto Pucino Prosecco", description: "King Valley, VIC — glass / bottle", price: 13.90, tags: [] },
    ]},
    { name: "Cocktails", items: [
      { name: "Mimosa", description: "", price: 14.00, tags: [] },
      { name: "Aperol Spritz", description: "", price: 14.50, tags: [] },
      { name: "Pink Gin Spritz", description: "", price: 14.50, tags: [] },
      { name: "Espresso Martini", description: "", price: 14.50, tags: [] },
      { name: "Limoncello Spritz", description: "", price: 15.00, tags: [] },
    ]},
    { name: "Beer", items: [
      { name: "Jetty Road Pale Ale", description: "Mornington Peninsula", price: 10.00, tags: [] },
      { name: "Corona", description: "", price: 10.00, tags: [] },
      { name: "Peroni", description: "", price: 10.00, tags: [] },
      { name: "Asahi", description: "", price: 11.00, tags: [] },
    ]},
  ];

  let sortOrder = 0;
  for (const cat of categories) {
    for (const item of cat.items) {
      await client.query(
        `INSERT INTO menu_items (name, description, price, category, tags, sort_order) VALUES ($1, $2, $3, $4, $5, $6)`,
        [item.name, item.description, item.price, cat.name, item.tags, sortOrder++]
      );
    }
  }

  console.log(`Seeded ${sortOrder} menu items`);
  client.release();
  await pool.end();
}

main().catch(console.error);
