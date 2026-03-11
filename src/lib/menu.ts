export const menuData = {
  categories: [
    {
      name: "All Day Brunch",
      items: [
        { id: "brunch_1", name: "Sourdough Toast", description: "Jam, peanut butter or vegemite", price: 11.00, tags: ["LG", "DF"] },
        { id: "brunch_2", name: "Eggs Your Way", description: "Two poached, fried, or scrambled served on sourdough", price: 14.50, tags: ["LG", "DF"] },
        { id: "brunch_3", name: "Bacon & Egg Roll", description: "Tomato relish, rocket, aioli. Add: Hashbrown +$4.00", price: 16.00, tags: ["LG", "DF"] },
        { id: "brunch_4", name: "Chilli Scrambled Egg", description: "Scrambled egg, spring onion, feta, sriracha, crispy shallots, pickled onion on sourdough toast", price: 24.50, tags: ["LG"] },
        { id: "brunch_5", name: "Mr Jackson", description: "Garlic roast mushroom, bacon, potato rosti, baked beans, avocado, tomato, poached eggs on sourdough toast", price: 25.00, tags: ["LG", "V"] },
        { id: "brunch_6", name: "Loaded Mushroom", description: "Field mushrooms, feta, basil pesto, rocket, crushed nuts, fresh chilli, poached eggs", price: 25.00, tags: ["LG", "V"] },
        { id: "brunch_7", name: "Smashed Avocado", description: "Avocado, hummus, whipped ricotta, fresh chilli, dukkah, rocket, pesto oil, poached eggs on sourdough toast", price: 24.50, tags: ["LG", "DF"] },
        { id: "brunch_8", name: "Corn Fritters", description: "Avocado, poached egg, bacon, seeds, sour cream, chilli jam, halloumi", price: 25.50, tags: ["V"] },
        { id: "brunch_9", name: "Mr Benedict", description: "Poached eggs, potato rosti, spinach, pickled onion, hollandaise, shallots. Choice of bacon or cured salmon", price: 26.00, tags: ["LG"] }
      ]
    },
    {
      name: "Salads & Bowls",
      items: [
        { id: "bowl_1", name: "Salt & Pepper Calamari Salad", description: "Dusted calamari rings, mixed salad leaves, cherry tomato, Asian dressing, radish, fried capers", price: 25.90, tags: ["DF"] },
        { id: "bowl_2", name: "Nourish Bowl", description: "Cajun spiced chicken, grains, braised cabbage, corn kernels, guacamole, black beans, tomato salsa, corn chips, chilli & lime crema", price: 24.50, tags: ["V", "LG"] },
        { id: "bowl_3", name: "Poke Bowl", description: "Cured salmon, avocado, pickled ginger, edamame beans, cucumber, wakame salad, fried noodles, shallots, nuts, soy sauce", price: 26.00, tags: ["DF"] }
      ]
    },
    {
      name: "Sandwiches & Toasties",
      items: [
        { id: "sand_1", name: "BLTC", description: "Bacon, lettuce, tomato, cheese, mayo on sourdough. Add chips +$4.50", price: 20.50, tags: ["LG"] },
        { id: "sand_2", name: "Chicken Avocado Toastie", description: "Poached chicken, avocado and cheese blend. Add chips +$4.50", price: 19.50, tags: ["LG"] },
        { id: "sand_3", name: "Reuben Toastie", description: "Pastrami, mustard pickled relish, cheese, sauerkraut. Add chips +$4.50", price: 19.00, tags: ["LG"] }
      ]
    },
    {
      name: "Burgers",
      items: [
        { id: "burg_1", name: "Pulled Pork Burger", description: "BBQ pulled pork, slaw, kimchi, served with chips", price: 25.50, tags: ["DF"] },
        { id: "burg_2", name: "Chicken Burger", description: "Crumbed chicken, burger sauce, cheese, tomato, lettuce, with chips", price: 25.00, tags: [] },
        { id: "burg_3", name: "Chilli & Lime Fish & Chips", description: "Tempura fish, house dressing, garden salad, tartare sauce, lemon, chips", price: 25.50, tags: ["DF"] }
      ]
    },
    {
      name: "Bao Buns",
      items: [
        { id: "bao_1", name: "Caramel Fried Chicken Bun", description: "Apple, pomegranate, coriander, chilli, Vietnamese mint, mayo", price: 10.00, tags: ["DF"] },
        { id: "bao_2", name: "Sticky Pork Bun", description: "Sticky pork, coriander, Vietnamese mint, eggplant, chilli, Asian dressing", price: 10.00, tags: ["DF"] },
        { id: "bao_3", name: "Classic Bun", description: "Pork belly, braised cabbage, crushed nuts, hoisin", price: 10.00, tags: ["DF"] }
      ]
    },
    {
      name: "Something Sweet",
      items: [
        { id: "sweet_1", name: "Banana Bread", description: "Vanilla mascarpone & seasonal fruits", price: 18.00, tags: [] },
        { id: "sweet_2", name: "Acai Pancakes", description: "Acai puree, granola, maple syrup, mascarpone, mango, desiccated coconut", price: 23.00, tags: [] }
      ]
    },
    {
      name: "Sides",
      items: [
        { id: "side_1", name: "Bowl of Chips", description: "", price: 10.00, tags: ["DF"] },
        { id: "side_2", name: "Pumpkin Arancini", description: "", price: 10.00, tags: [] },
        { id: "side_3", name: "Hollandaise / Hashbrown / Fetta / Baked Beans", description: "", price: 4.00, tags: [] },
        { id: "side_4", name: "Mushroom / Tomato / Rosti / Avocado / Spinach", description: "", price: 5.00, tags: [] },
        { id: "side_5", name: "Halloumi / Bacon / Grilled Chicken / Cured Salmon", description: "", price: 7.00, tags: [] }
      ]
    },
    {
      name: "Coffee",
      items: [
        { id: "cof_1", name: "Cappuccino / Latte / Flat White", description: "", price: 5.00, tags: [] },
        { id: "cof_2", name: "Magic / Piccolo", description: "", price: 5.00, tags: [] },
        { id: "cof_3", name: "Long Black / Espresso", description: "", price: 5.00, tags: [] },
        { id: "cof_4", name: "Long / Short Macchiato", description: "", price: 5.00, tags: [] },
        { id: "cof_5", name: "Mocha", description: "", price: 5.50, tags: [] },
        { id: "cof_6", name: "Affogato", description: "", price: 5.50, tags: [] },
        { id: "cof_7", name: "Matcha Latte", description: "Milk alt available +$0.90", price: 5.50, tags: ["DF"] },
        { id: "cof_8", name: "Turmeric Latte", description: "Milk alt available +$0.90", price: 5.50, tags: ["DF"] },
        { id: "cof_9", name: "Hot Chocolate", description: "", price: 6.00, tags: [] },
        { id: "cof_10", name: "Nutella Hot Chocolate", description: "", price: 8.50, tags: [] },
        { id: "cof_11", name: "Babychino with Marshmallow", description: "", price: 2.90, tags: [] },
        { id: "cof_12", name: "Iced Latte / Iced Long Black", description: "", price: 7.00, tags: [] },
        { id: "cof_13", name: "Iced Mocha", description: "", price: 8.00, tags: [] },
        { id: "cof_14", name: "Iced Coffee / Iced Chocolate", description: "", price: 9.00, tags: [] }
      ]
    },
    {
      name: "Tea & Chai",
      items: [
        { id: "tea_1", name: "English Breakfast / Earl Grey", description: "", price: 6.00, tags: [] },
        { id: "tea_2", name: "Green Tea / Peppermint", description: "", price: 6.00, tags: [] },
        { id: "tea_3", name: "Lemon Grass Ginger", description: "", price: 6.00, tags: [] },
        { id: "tea_4", name: "Powder Chai", description: "", price: 5.00, tags: [] },
        { id: "tea_5", name: "Prana Leaf Chai", description: "", price: 6.50, tags: [] },
        { id: "tea_6", name: "Turmeric Leaf Chai", description: "", price: 6.50, tags: [] },
        { id: "tea_7", name: "Iced Chai / Iced Matcha", description: "", price: 7.00, tags: [] },
        { id: "tea_8", name: "Strawberry Matcha", description: "", price: 7.50, tags: [] },
        { id: "tea_9", name: "Blueberry Matcha", description: "", price: 7.50, tags: [] }
      ]
    },
    {
      name: "Milkshakes",
      items: [
        { id: "shake_1", name: "Milkshake (Large)", description: "Chocolate, Nutella, Coffee, Vanilla, Strawberry", price: 9.00, tags: [] },
        { id: "shake_2", name: "Milkshake (Small)", description: "Chocolate, Nutella, Coffee, Vanilla, Strawberry", price: 7.00, tags: [] }
      ]
    },
    {
      name: "Smoothies",
      items: [
        { id: "smooth_1", name: "Bananarama", description: "Banana, coconut milk, cinnamon, honey", price: 11.50, tags: ["DF"] },
        { id: "smooth_2", name: "Acai Bliss", description: "Mix berry, acai, banana, coconut milk", price: 11.50, tags: ["DF"] },
        { id: "smooth_3", name: "Tropical Tango", description: "Mango, passionfruit, orange, banana, honey, coconut milk", price: 11.50, tags: ["DF"] },
        { id: "smooth_4", name: "Green Harmony", description: "Apple, mango, spinach, coconut milk", price: 11.50, tags: ["DF"] }
      ]
    },
    {
      name: "Fresh Juices",
      items: [
        { id: "juice_1", name: "Orange", description: "", price: 10.50, tags: ["DF"] },
        { id: "juice_2", name: "Apple Mint", description: "", price: 10.50, tags: ["DF"] },
        { id: "juice_3", name: "Apple and Orange", description: "", price: 10.50, tags: ["DF"] },
        { id: "juice_4", name: "Apple, Orange, Ginger, Coconut Water", description: "", price: 10.50, tags: ["DF"] },
        { id: "juice_5", name: "Watermelon, Mint, Lime", description: "", price: 10.50, tags: ["DF"] }
      ]
    },
    {
      name: "Cold Drinks",
      items: [
        { id: "cold_1", name: "Coconut Water", description: "", price: 5.00, tags: [] },
        { id: "cold_2", name: "Sparkling Water 250ml", description: "", price: 5.00, tags: [] },
        { id: "cold_3", name: "Sparkling Lemon 250ml", description: "", price: 5.00, tags: [] },
        { id: "cold_4", name: "Sparkling Water 750ml", description: "", price: 5.00, tags: [] },
        { id: "cold_5", name: "Coke", description: "", price: 5.00, tags: [] },
        { id: "cold_6", name: "Coke Zero", description: "", price: 5.00, tags: [] },
        { id: "cold_7", name: "Coconut Sparkling Water", description: "", price: 5.00, tags: [] },
        { id: "cold_8", name: "Lemon Lime Bitters", description: "", price: 5.00, tags: [] },
        { id: "cold_9", name: "Soda Co — Cola", description: "Natural bottled drink", price: 5.90, tags: [] },
        { id: "cold_10", name: "Soda Co — Ginger Beer", description: "Natural bottled drink", price: 5.90, tags: [] },
        { id: "cold_11", name: "Soda Co — Blood Orange", description: "Natural bottled drink", price: 5.90, tags: [] },
        { id: "cold_12", name: "Soda Co — Pink Lemonade", description: "Natural bottled drink", price: 5.90, tags: [] }
      ]
    },
    {
      name: "Wine & Sparkling",
      items: [
        { id: "wine_1", name: "Tara Roses Chardonnay", description: "Mornington Peninsula — glass / bottle", price: 13.90, tags: [] },
        { id: "wine_2", name: "Dal Zotto Pinot Grigio", description: "King Valley, VIC — glass / bottle", price: 12.90, tags: [] },
        { id: "wine_3", name: "Cloud Street Sauvignon Blanc", description: "Central Victoria — glass / bottle", price: 12.90, tags: [] },
        { id: "wine_4", name: "Yarrabank Estate Circle Rosé", description: "McLaren Vale, SA — glass / bottle", price: 13.90, tags: [] },
        { id: "wine_5", name: "Red Claw Pinot Noir", description: "Mornington Peninsula, VIC — glass / bottle", price: 13.90, tags: [] },
        { id: "wine_6", name: "Rockbare Clucky Shiraz", description: "South Australia — glass / bottle", price: 13.90, tags: [] },
        { id: "wine_7", name: "Dal Zotto Pucino Prosecco", description: "King Valley, VIC — glass / bottle", price: 13.90, tags: [] }
      ]
    },
    {
      name: "Cocktails",
      items: [
        { id: "cock_1", name: "Mimosa", description: "", price: 14.00, tags: [] },
        { id: "cock_2", name: "Aperol Spritz", description: "", price: 14.50, tags: [] },
        { id: "cock_3", name: "Pink Gin Spritz", description: "", price: 14.50, tags: [] },
        { id: "cock_4", name: "Espresso Martini", description: "", price: 14.50, tags: [] },
        { id: "cock_5", name: "Limoncello Spritz", description: "", price: 15.00, tags: [] }
      ]
    },
    {
      name: "Beer",
      items: [
        { id: "beer_1", name: "Jetty Road Pale Ale", description: "Mornington Peninsula", price: 10.00, tags: [] },
        { id: "beer_2", name: "Corona", description: "", price: 10.00, tags: [] },
        { id: "beer_3", name: "Peroni", description: "", price: 10.00, tags: [] },
        { id: "beer_4", name: "Asahi", description: "", price: 11.00, tags: [] }
      ]
    }
  ],
  surcharges: {
    weekend: 0.10,
    public_holiday: 0.15
  },
  dietary_tags: {
    V: "Vegetarian option available",
    LG: "Low gluten option available on request",
    VG: "Vegan option available on request",
    DF: "Dairy free option available on request"
  },
  special_deal: {
    description: "Choose one main meal paired with choice of alcoholic beverage",
    price: 30.99
  },
  alterations: {
    milk: { options: ["Almond", "Oat", "Lactose Free", "Coconut", "Tiger", "Decaf"], price: 0.90 },
    syrup: { options: ["Vanilla", "Caramel", "Hazelnut", "Sugar"], price: 0.90 }
  }
}

export type MenuItem = {
  id: string
  name: string
  description: string
  price: number
  tags: string[]
}

export type MenuCategory = {
  name: string
  items: MenuItem[]
}
