import { Hono } from "npm:hono";
import { getSupabase } from "../supabaseClient.ts";

const app = new Hono();

// 1. GET: Ambil setting struk dari Supabase
app.get("/", async (c) => {
  const supabase = getSupabase(c);
  
  // Ambil data dari tabel receipt_settings dimana id = 1
  const { data, error } = await supabase
    .from("receipt_settings")
    .select("*")
    .eq("id", 1)
    .single();

  if (error) {
    return c.json({ error: "Gagal mengambil data: " + error.message }, 500);
  }

  return c.json(data);
});

// 2. PUT: Update setting struk ke Supabase
app.put("/", async (c) => {
  const supabase = getSupabase(c);
  const body = await c.req.json();

  const { data, error } = await supabase
    .from("receipt_settings")
    .update({
      store_name: body.store_name,
      address: body.address,
      footer_text: body.footer_text,
      logo_url: body.logo_url,
      show_logo: body.show_logo,
      paper_size: body.paper_size,
      auto_print: body.auto_print,
      max_chars: body.max_chars,
      font_family: body.font_family,
      font_size: body.font_size,
      margin_h: body.margin_h,
      margin_b: body.margin_b,
    })
    .eq("id", 1)
    .select()
    .single();

  if (error) {
    return c.json({ error: "Gagal update: " + error.message }, 500);
  }

  return c.json({
    message: "PENGATURAN STRUK PUSAT BERHASIL DISINKRONKAN!",
    data: data
  });
});

export default app;