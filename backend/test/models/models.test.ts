/**
 * Unit Tests: Mongoose Models
 * Tests for model schemas, validation, and default values.
 * Uses in-memory MongoDB for isolation.
 */

import { assertEquals, assertExists, assertRejects } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { setupTestDB, clearTestDB, teardownTestDB, setupTestEnv } from "../setup.ts";

// Setup environment before importing models
setupTestEnv();

import { User } from "../../models/User.ts";
import { Product, StockLog } from "../../models/Product.ts";
import { Category } from "../../models/Category.ts";
import { Transaction } from "../../models/Transaction.ts";
import { Customer, Supplier, Discount } from "../../models/Entity.ts";
import { CashDrawer } from "../../models/CashDrawer.ts";
import { Ingredient } from "../../models/Ingredient.ts";
import { PendingOrder } from "../../models/PendingOrder.ts";
import { Permission } from "../../models/Permission.ts";
import { ReceiptSetting } from "../../models/ReceiptSetting.ts";
import { OcrTask } from "../../models/OcrTask.ts";
import mongoose from "npm:mongoose";

// ==================== LIFECYCLE ====================

Deno.test({
  name: "Models Test Suite",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async (t) => {
    await setupTestDB();

    // ==================== USER MODEL ====================

    await t.step("User - should create user with all fields", async () => {
      await clearTestDB();
      const user = await User.create({
        name: "Test User",
        email: "test@wuzpay.com",
        password: "hashed_password",
        role: "owner",
      });

      assertExists(user._id);
      assertEquals(user.name, "Test User");
      assertEquals(user.email, "test@wuzpay.com");
      assertEquals(user.role, "owner");
      assertExists(user.createdAt);
    });

    await t.step("User - should default role to 'kasir'", async () => {
      await clearTestDB();
      const user = await User.create({
        name: "Kasir",
        email: "kasir@wuzpay.com",
        password: "password",
      });

      assertEquals(user.role, "kasir");
    });

    await t.step("User - should enforce unique email", async () => {
      await clearTestDB();
      await User.create({
        name: "First",
        email: "duplicate@test.com",
        password: "pass",
      });

      await assertRejects(
        async () => {
          await User.create({
            name: "Second",
            email: "duplicate@test.com",
            password: "pass",
          });
        },
      );
    });

    await t.step("User - should require name, email, password", async () => {
      await clearTestDB();
      await assertRejects(async () => {
        await User.create({});
      });
    });

    await t.step("User - last_session_id defaults to null", async () => {
      await clearTestDB();
      const user = await User.create({
        name: "Session Test",
        email: "session@test.com",
        password: "pass",
      });

      assertEquals(user.last_session_id, null);
    });

    // ==================== CATEGORY MODEL ====================

    await t.step("Category - should create with name and description", async () => {
      await clearTestDB();
      const cat = await Category.create({
        name: "Makanan",
        description: "Semua jenis makanan",
      });

      assertExists(cat._id);
      assertEquals(cat.name, "Makanan");
      assertEquals(cat.description, "Semua jenis makanan");
    });

    await t.step("Category - description should default to empty string", async () => {
      await clearTestDB();
      const cat = await Category.create({ name: "Minuman" });
      assertEquals(cat.description, "");
    });

    await t.step("Category - should enforce unique name", async () => {
      await clearTestDB();
      await Category.create({ name: "UniqueCategory" });
      await assertRejects(async () => {
        await Category.create({ name: "UniqueCategory" });
      });
    });

    // ==================== PRODUCT MODEL ====================

    await t.step("Product - should create product with required fields", async () => {
      await clearTestDB();
      const product = await Product.create({
        name: "Nasi Goreng",
        price: 15000,
      });

      assertExists(product._id);
      assertEquals(product.name, "Nasi Goreng");
      assertEquals(product.price, 15000);
    });

    await t.step("Product - should accept recipe array", async () => {
      await clearTestDB();
      const ingredient = await Ingredient.create({
        name: "Nasi",
        unit: "gram",
        stock_quantity: 1000,
      });

      const product = await Product.create({
        name: "Nasi Goreng Spesial",
        price: 20000,
        recipe: [{
          ingredient_id: ingredient._id,
          amount_needed: 200,
        }],
      });

      assertEquals(product.recipe.length, 1);
      assertEquals(product.recipe[0].amount_needed, 200);
    });

    await t.step("Product - should default price to 0", async () => {
      await clearTestDB();
      const product = await Product.create({ name: "Test Product" });
      assertEquals(product.price, 0);
    });

    // ==================== INGREDIENT MODEL ====================

    await t.step("Ingredient - should create with all fields", async () => {
      await clearTestDB();
      const ing = await Ingredient.create({
        name: "Gula",
        unit: "kg",
        stock_quantity: 50,
        cost_per_unit: 12000,
      });

      assertExists(ing._id);
      assertEquals(ing.name, "Gula");
      assertEquals(ing.unit, "kg");
      assertEquals(ing.stock_quantity, 50);
      assertEquals(ing.cost_per_unit, 12000);
    });

    await t.step("Ingredient - should enforce unique name", async () => {
      await clearTestDB();
      await Ingredient.create({ name: "Garam", unit: "kg" });
      await assertRejects(async () => {
        await Ingredient.create({ name: "Garam", unit: "gram" });
      });
    });

    await t.step("Ingredient - should default stock to 0", async () => {
      await clearTestDB();
      const ing = await Ingredient.create({ name: "Minyak", unit: "liter" });
      assertEquals(ing.stock_quantity, 0);
      assertEquals(ing.cost_per_unit, 0);
    });

    // ==================== STOCK LOG MODEL ====================

    await t.step("StockLog - should create with all fields", async () => {
      await clearTestDB();
      const ingredient = await Ingredient.create({ name: "Tepung", unit: "kg" });

      const log = await StockLog.create({
        ingredient_id: ingredient._id,
        user_id: "user123",
        previous_stock: 100,
        added_stock: 50,
        current_stock: 150,
        type: "addition",
        source: "manual",
      });

      assertExists(log._id);
      assertEquals(log.previous_stock, 100);
      assertEquals(log.added_stock, 50);
      assertEquals(log.current_stock, 150);
      assertEquals(log.type, "addition");
      assertEquals(log.source, "manual");
    });

    await t.step("StockLog - defaults should be correct", async () => {
      await clearTestDB();
      const ingredient = await Ingredient.create({ name: "Bawang", unit: "kg" });

      const log = await StockLog.create({
        ingredient_id: ingredient._id,
        user_id: "user123",
      });

      assertEquals(log.type, "addition");
      assertEquals(log.source, "manual");
    });

    // ==================== TRANSACTION MODEL ====================

    await t.step("Transaction - should create with items", async () => {
      await clearTestDB();
      const tx = await Transaction.create({
        userId: "user123",
        receipt_number: "WUZ-20260407-ABCD",
        total_amount: 50000,
        total_real_amount: 55000,
        discount_amount: 5000,
        profit: 20000,
        payment_method: "cash",
        items: [{
          name: "Nasi Goreng",
          quantity: 2,
          price_at_sale: 25000,
          total_amount: 50000,
        }],
      });

      assertExists(tx._id);
      assertEquals(tx.receipt_number, "WUZ-20260407-ABCD");
      assertEquals(tx.total_amount, 50000);
      assertEquals(tx.items.length, 1);
      assertEquals(tx.items[0].name, "Nasi Goreng");
      assertEquals(tx.status, "completed");
    });

    await t.step("Transaction - should default payment_method to 'cash'", async () => {
      await clearTestDB();
      const tx = await Transaction.create({
        userId: "user123",
        receipt_number: "WUZ-DEFAULT-TEST",
        total_amount: 10000,
        total_real_amount: 10000,
        items: [{ name: "Test", quantity: 1, price_at_sale: 10000, total_amount: 10000 }],
      });

      assertEquals(tx.payment_method, "cash");
      assertEquals(tx.discount_amount, 0);
      assertEquals(tx.profit, 0);
    });

    // ==================== ENTITY MODELS ====================

    await t.step("Customer - should create with name", async () => {
      await clearTestDB();
      const customer = await Customer.create({
        name: "Budi",
        phone: "08123456789",
        email: "budi@test.com",
      });

      assertExists(customer._id);
      assertEquals(customer.name, "Budi");
      assertEquals(customer.phone, "08123456789");
    });

    await t.step("Supplier - should create with name", async () => {
      await clearTestDB();
      const supplier = await Supplier.create({
        name: "PT Supplier ABC",
        phone: "021-123456",
      });

      assertExists(supplier._id);
      assertEquals(supplier.name, "PT Supplier ABC");
    });

    await t.step("Discount - should create with all fields", async () => {
      await clearTestDB();
      const discount = await Discount.create({
        name: "Diskon Lebaran",
        value_type: "percentage",
        value: 10,
        scope: "transaction",
        is_active: true,
      });

      assertExists(discount._id);
      assertEquals(discount.name, "Diskon Lebaran");
      assertEquals(discount.value, 10);
      assertEquals(discount.value_type, "percentage");
      assertEquals(discount.is_active, true);
    });

    await t.step("Discount - should default scope to 'transaction'", async () => {
      await clearTestDB();
      const discount = await Discount.create({
        name: "Default Scope",
        value_type: "fixed",
        value: 5000,
      });

      assertEquals(discount.scope, "transaction");
    });

    // ==================== CASH DRAWER MODEL ====================

    await t.step("CashDrawer - should create with defaults", async () => {
      await clearTestDB();
      const userId = new mongoose.Types.ObjectId();
      const drawer = await CashDrawer.create({
        user_id: userId,
        staffname: "Kasir Budi",
        starting_cash: 100000,
      });

      assertExists(drawer._id);
      assertEquals(drawer.staffname, "Kasir Budi");
      assertEquals(drawer.starting_cash, 100000);
      assertEquals(drawer.status, "open");
      assertEquals(drawer.ending_cash, null);
      assertEquals(drawer.end_time, null);
    });

    // ==================== PENDING ORDER MODEL ====================

    await t.step("PendingOrder - should create with items array", async () => {
      await clearTestDB();
      const order = await PendingOrder.create({
        customer_name: "Pelanggan A",
        items: [{ name: "Item 1", quantity: 2, price: 10000 }],
        subtotal: 20000,
        total_amount: 18000,
        discount_amount: 2000,
      });

      assertExists(order._id);
      assertEquals(order.customer_name, "Pelanggan A");
      assertEquals(order.items.length, 1);
      assertEquals(order.subtotal, 20000);
      assertEquals(order.discount_amount, 2000);
    });

    await t.step("PendingOrder - customer_name defaults to 'Pelanggan'", async () => {
      await clearTestDB();
      const order = await PendingOrder.create({
        items: [{ name: "Test" }],
        subtotal: 0,
        total_amount: 0,
      });

      assertEquals(order.customer_name, "Pelanggan");
    });

    // ==================== PERMISSION MODEL ====================

    await t.step("Permission - should create with role_name and allowed_menus", async () => {
      await clearTestDB();
      const perm = await Permission.create({
        role_name: "kasir",
        allowed_menus: ["dashboard", "pos", "transactions"],
      });

      assertExists(perm._id);
      assertEquals(perm.role_name, "kasir");
      assertEquals(perm.allowed_menus.length, 3);
      assertEquals(perm.allowed_menus[0], "dashboard");
    });

    await t.step("Permission - should enforce unique role_name", async () => {
      await clearTestDB();
      await Permission.create({ role_name: "admin", allowed_menus: [] });
      await assertRejects(async () => {
        await Permission.create({ role_name: "admin", allowed_menus: [] });
      });
    });

    // ==================== RECEIPT SETTING MODEL ====================

    await t.step("ReceiptSetting - should create with defaults", async () => {
      await clearTestDB();
      const config = await ReceiptSetting.create({
        setting_key: "main_config",
      });

      assertExists(config._id);
      assertEquals(config.store_name, "WuzPay Store");
      assertEquals(config.paper_size, "58mm");
      assertEquals(config.auto_print, false);
      assertEquals(config.max_chars, 32);
      assertEquals(config.font_family, "monospace");
      assertEquals(config.font_size, 12);
    });

    await t.step("ReceiptSetting - should enforce unique setting_key", async () => {
      await clearTestDB();
      await ReceiptSetting.create({ setting_key: "main_config" });
      await assertRejects(async () => {
        await ReceiptSetting.create({ setting_key: "main_config" });
      });
    });

    // ==================== OCR TASK MODEL ====================

    await t.step("OcrTask - should create with required fields", async () => {
      await clearTestDB();
      const task = await OcrTask.create({
        file_b64: "base64encodeddata",
        mime_type: "image/png",
      });

      assertExists(task._id);
      assertEquals(task.file_b64, "base64encodeddata");
      assertEquals(task.mime_type, "image/png");
      assertEquals(task.status, "pending");
      assertEquals(task.result, null);
      assertEquals(task.error_message, null);
    });

    await t.step("OcrTask - should default status to 'pending'", async () => {
      await clearTestDB();
      const task = await OcrTask.create({ file_b64: "data" });

      assertEquals(task.status, "pending");
      assertEquals(task.mime_type, "image/jpeg");
    });

    // ==================== CLEANUP ====================
    await teardownTestDB();
  },
});
