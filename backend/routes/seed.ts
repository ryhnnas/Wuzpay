import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";
import { supabase } from "../supabaseClient.ts";

const seed = new Hono();

// Initialize Supabase Admin for user creation
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

seed.post("/", async (c) => {
  try {
    console.log('=== SEED ENDPOINT CALLED ===');
    
    // 1. Check if already seeded
    const { data: existingProducts, error: fetchError } = await supabase
      .from('products')
      .select('*');

    if (fetchError) {
      console.log('Supabase fetch existing products error:', fetchError);
      // Depending on desired behavior, you might want to throw or handle this differently
      // For now, we'll proceed with existingProducts being null if an error occurs
    }
    
    if (existingProducts && existingProducts.length > 0) {
      return c.json({ message: 'Database already seeded', alreadySeeded: true });
    }

    let seededCounts = { categories: 0, products: 0, customers: 0, suppliers: 0, discounts: 0, users: 0 };

    // 2. Seed Default Users
    const defaultUsers = [
      { email: 'owner@seblak.com', password: 'owner123', name: 'Owner Seblak', role: 'owner' },
      { email: 'admin@seblak.com', password: 'admin123', name: 'Admin Seblak', role: 'admin' },
      { email: 'kasir@seblak.com', password: 'kasir123', name: 'Kasir Seblak', role: 'kasir' }
    ];

    for (const userData of defaultUsers) {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        user_metadata: { name: userData.name, role: userData.role },
        email_confirm: true
      });

      if (!authError) {
        const userId = authData.user.id;
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: userId,
            email: userData.email,
            name: userData.name,
            role: userData.role,
            created_at: new Date().toISOString(), // Assuming 'created_at' in Supabase
          });

        if (insertError) {
          console.log('Supabase user insert error during seeding:', insertError);
          // Depending on desired behavior, you might want to throw or handle this differently
        }
        seededCounts.users++;
      }
    }

    // 3. Seed Categories
    const categories = [
      { id: 'cat1', name: 'Seblak Original', color: '#FF6B6B' },
      { id: 'cat2', name: 'Seblak Premium', color: '#4ECDC4' },
      { id: 'cat4', name: 'Minuman', color: '#1E90FF' }
    ];
    for (const cat of categories) {
      const { error: insertError } = await supabase
        .from('categories')
        .insert(cat);

      if (insertError) {
        console.log('Supabase category insert error during seeding:', insertError);
        // Depending on desired behavior, you might want to throw or handle this differently
      } else {
        seededCounts.categories++;
      }
    }

    // 4. Seed Products
    const products = [
      { id: 'prod1', sku: 'SBK-001', name: 'Seblak Original', buyPrice: 8000, sellPrice: 15000, stock: 50 },
      { id: 'prod2', sku: 'SBK-002', name: 'Seblak Ceker', buyPrice: 12000, sellPrice: 22000, stock: 35 }
    ];
    for (const prod of products) {
      const { error: insertError } = await supabase
        .from('products')
        .insert(prod);

      if (insertError) {
        console.log('Supabase product insert error during seeding:', insertError);
        // Depending on desired behavior, you might want to throw or handle this differently
      } else {
        seededCounts.products++;
      }
    }

    // 5. Seed Customers
    const customers = [
      { id: 'cust1', name: 'Budi Santoso', email: 'budi@example.com', totalPurchases: 450000 }
    ];
    for (const cust of customers) {
      const { error: insertError } = await supabase
        .from('customers')
        .insert(cust);

      if (insertError) {
        console.log('Supabase customer insert error during seeding:', insertError);
        // Depending on desired behavior, you might want to throw or handle this differently
      } else {
        seededCounts.customers++;
      }
    }

    return c.json({ success: true, message: 'Database seeded successfully', seeded: seededCounts });
  } catch (error: any) {
    return c.json({ error: `Failed to seed database: ${error?.message}` }, 500);
  }
});

export default seed;