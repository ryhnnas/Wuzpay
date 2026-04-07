import mongoose from "npm:mongoose";
import { Transaction } from "./models/Transaction.ts";
import { Product } from "./models/Product.ts";
import "npm:dotenv/config";

async function fetchBusinessContext(): Promise<string> {
  try {
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const sevenDaysAgo = new Date(new Date().setDate(now.getDate() - 7));
    const thirtyDaysAgo = new Date(new Date().setDate(now.getDate() - 30));

    console.log("Date ranges:");
    console.log("30 days ago:", thirtyDaysAgo);
    console.log("7 days ago:", sevenDaysAgo);
    console.log("Today:", todayStart);

    // 1. Ambil Summary Penjualan (Today, Week, Month) menggunakan Aggregation
    const salesStats = await Transaction.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo, $lt: todayEnd } } },
      {
        $facet: {
          today: [{ $match: { createdAt: { $gte: todayStart, $lt: todayEnd } } }, { $group: { _id: null, rev: { $sum: "$total_amount" }, count: { $sum: 1 } } }],
          weekly: [{ $match: { createdAt: { $gte: sevenDaysAgo, $lt: todayEnd } } }, { $group: { _id: null, rev: { $sum: "$total_amount" }, count: { $sum: 1 } } }],
          monthly: [{ $group: { _id: null, rev: { $sum: "$total_amount" }, count: { $sum: 1 } } }],
          dailyBreakdown: [
            { $match: { createdAt: { $gte: sevenDaysAgo, $lt: todayEnd } } },
            { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "Asia/Jakarta" } }, rev: { $sum: "$total_amount" }, count: { $sum: 1 } } },
            { $sort: { "_id": 1 } }
          ]
        }
      }
    ]);

    const stats = salesStats[0];
    console.log("Sales stats:", stats);

    return "Success";
  } catch (err) {
    console.error('AI Context Error:', err);
    return err.toString();
  }
}

async function run() {
  await mongoose.connect(Deno.env.get("MONGO_URI")!);
  console.log("Connected to MongoDB");
  await fetchBusinessContext();
  Deno.exit(0);
}

run();
