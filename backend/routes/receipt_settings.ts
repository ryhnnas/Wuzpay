import { Hono } from "npm:hono";
import { ReceiptSetting } from "../models/ReceiptSetting.ts";
import { z } from "npm:zod";
import { zValidator } from "npm:@hono/zod-validator";

const receiptSchema = z.object({
  store_name: z.string().optional(),
  address: z.string().optional(),
  footer_text: z.string().optional(),
  logo_url: z.string().optional(),
  show_logo: z.boolean().optional(),
  paper_size: z.string().optional(),
  auto_print: z.boolean().optional(),
  max_chars: z.union([z.string(), z.number()]).transform(v => Number(v)).optional(),
  font_family: z.string().optional(),
  font_size: z.union([z.string(), z.number()]).transform(v => Number(v)).optional(),
  margin_h: z.union([z.string(), z.number()]).transform(v => Number(v)).optional(),
  margin_b: z.union([z.string(), z.number()]).transform(v => Number(v)).optional()
});

const validateReceipt = zValidator('json', receiptSchema, (result, c) => {
  if (!result.success) return c.json({ error: result.error.issues[0].message }, 400);
});


const receipt = new Hono();

// 1. GET: Ambil setting struk (Gunakan findOne)
receipt.get("/", async (c) => {
  try {
    // Cari dokumen config utama, jika tidak ada, buatkan default-nya
    let config = await ReceiptSetting.findOne({ setting_key: "main_config" });
    
    if (!config) {
      config = await ReceiptSetting.create({ setting_key: "main_config" });
    }

    return c.json(config);
  } catch (error: any) {
    return c.json({ error: "Gagal mengambil data: " + error.message }, 500);
  }
});

// 2. PUT: Update setting struk
receipt.put("/", validateReceipt, async (c) => {
  try {
    const body = c.req.valid('json');

    // findOneAndUpdate dengan upsert: true agar otomatis terbuat jika belum ada
    const updatedConfig = await ReceiptSetting.findOneAndUpdate(
      { setting_key: "main_config" },
      {
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
      },
      { new: true, upsert: true }
    );

    return c.json({
      message: "PENGATURAN STRUK WUZPAY BERHASIL DISINKRONKAN!",
      data: updatedConfig
    });
  } catch (error: any) {
    return c.json({ error: "Gagal update: " + error.message }, 500);
  }
});

export default receipt;