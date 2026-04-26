/**
 * WuzPay Backend Test Setup
 * ========================
 * Shared utilities, mock helpers, and database setup for all backend tests.
 * Uses MongoDB Memory Server for fully isolated, fast testing.
 */

import mongoose from "npm:mongoose";
import MongoMemoryServerPkg from "npm:mongodb-memory-server";
const { MongoMemoryReplSet } = MongoMemoryServerPkg;
import jwt from "npm:jsonwebtoken";
import bcrypt from "npm:bcryptjs";
import { User } from "../models/User.ts";

// Must match the fallback in middleware/auth.ts since Deno hoists static imports
// before setupTestEnv() can set the env variable
const JWT_SECRET = "supersecretkeywuzpay";

// ==================== DATABASE LIFECYCLE ====================

let mongod: InstanceType<typeof MongoMemoryReplSet>;

/**
 * Connects to an in-memory MongoDB replica set instance.
 * Replica set is required to support mongoose sessions/transactions.
 * Call once in `beforeAll` or at the top of your test module.
 */
export async function setupTestDB() {
  mongod = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });
  const uri = mongod.getUri();
  await mongoose.connect(uri);
}

/**
 * Drops all collections. Call between tests for isolation.
 */
export async function clearTestDB() {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
}

/**
 * Closes connection and stops the in-memory MongoDB.
 * Call in `afterAll` or at the end of your test module.
 */
export async function teardownTestDB() {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongod.stop();
}

// ==================== AUTH HELPERS ====================

export interface TestUser {
  id: string;
  email: string;
  name: string;
  role: string;
  token: string;
  sessionId: string;
}

/**
 * Creates a real user in the test database and returns auth credentials.
 */
export async function createTestUser(overrides: Partial<{
  email: string;
  password: string;
  name: string;
  role: string;
}> = {}): Promise<TestUser> {
  const data = {
    email: overrides.email || `test-${Date.now()}@wuzpay.test`,
    password: overrides.password || "password123",
    name: overrides.name || "Test User",
    role: overrides.role || "owner",
  };

  const hashedPassword = await bcrypt.hash(data.password, 10);
  const sessionId = crypto.randomUUID();

  const user = await User.create({
    email: data.email,
    password: hashedPassword,
    name: data.name,
    role: data.role,
    last_session_id: sessionId,
  });

  const token = jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: "1h" }
  );

  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    role: user.role,
    token,
    sessionId,
  };
}

/**
 * Returns authorization headers for a given test user.
 */
export function authHeaders(user: TestUser): Record<string, string> {
  return {
    "Authorization": `Bearer ${user.token}`,
    "X-Session-ID": user.sessionId,
    "Content-Type": "application/json",
  };
}

// ==================== ENVIRONMENT MOCK ====================

/**
 * Set environment variables needed for tests.
 */
export function setupTestEnv() {
  Deno.env.set("JWT_SECRET", JWT_SECRET);
  Deno.env.set("MONGO_URI", "mongodb://localhost:27017/test"); // not used, memory server overrides
  Deno.env.set("GROQ_API_KEY", "test-groq-key");
  Deno.env.set("GROQ_API_URL", "https://api.groq.com/openai/v1");
  Deno.env.set("GROQ_MODEL", "llama-3.3-70b-versatile");
}

// ==================== REQUEST HELPERS ====================

/**
 * Helper to create a JSON request body.
 */
export function jsonBody(data: Record<string, unknown>): string {
  return JSON.stringify(data);
}

// ==================== RE-EXPORTS ====================
export { JWT_SECRET };
