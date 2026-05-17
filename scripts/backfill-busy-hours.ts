/**
 * One-shot: writes busyHours JSON into each seeded shop by slug.
 * Does NOT touch tags, images, or any other field.
 *
 *   pnpm tsx scripts/backfill-busy-hours.ts
 */
import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { normalizePgConnectionString } from "../src/utils/pgConnectionString.js";

const rawConnectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!rawConnectionString) throw new Error("Missing DATABASE_URL or DIRECT_URL.");

const pool = new Pool({
  connectionString: normalizePgConnectionString(rawConnectionString),
  connectionTimeoutMillis: 60_000,
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

type BusyHourBucket = { label: string; level: number };

const busyHoursBySlug: Record<string, BusyHourBucket[]> = {
  "daily-dose-cafe-grove-cir": [
    { label: "7A", level: 0.35 },
    { label: "8A", level: 0.80 },
    { label: "9A", level: 0.95 },
    { label: "10A", level: 0.75 },
    { label: "11A", level: 0.55 },
    { label: "12P", level: 0.45 },
    { label: "1P", level: 0.30 },
    { label: "2P", level: 0.15 },
  ],
  "kingdom-coffee-main-st": [
    { label: "6A", level: 0.20 },
    { label: "8A", level: 0.75 },
    { label: "10A", level: 0.90 },
    { label: "12P", level: 0.65 },
    { label: "2P", level: 0.50 },
    { label: "4P", level: 0.55 },
    { label: "6P", level: 0.40 },
  ],
  "bean-co-cafe-elm-creek-blvd-n": [
    { label: "8A", level: 0.70 },
    { label: "10A", level: 0.60 },
    { label: "12P", level: 0.55 },
    { label: "2P", level: 0.40 },
    { label: "4P", level: 0.30 },
  ],
  "caribou-the-grove-maple-grove-pkwy": [
    { label: "6A", level: 0.40 },
    { label: "8A", level: 0.90 },
    { label: "10A", level: 0.75 },
    { label: "12P", level: 0.65 },
    { label: "2P", level: 0.45 },
    { label: "4P", level: 0.50 },
    { label: "6P", level: 0.35 },
  ],
  "starbucks-elm-creek-blvd": [
    { label: "6A", level: 0.60 },
    { label: "8A", level: 0.95 },
    { label: "10A", level: 0.80 },
    { label: "12P", level: 0.75 },
    { label: "2P", level: 0.65 },
    { label: "4P", level: 0.70 },
    { label: "6P", level: 0.55 },
    { label: "8P", level: 0.30 },
  ],
  "brueggers-bass-lake-rd": [
    { label: "6A", level: 0.55 },
    { label: "8A", level: 0.85 },
    { label: "10A", level: 0.65 },
    { label: "12P", level: 0.70 },
    { label: "2P", level: 0.35 },
    { label: "4P", level: 0.20 },
  ],
  "dunkin-grove-dr-n": [
    { label: "5A", level: 0.45 },
    { label: "7A", level: 0.90 },
    { label: "9A", level: 0.70 },
    { label: "11A", level: 0.45 },
    { label: "1P", level: 0.30 },
    { label: "3P", level: 0.20 },
  ],
  "great-harvest-grove-dr-n": [
    { label: "7A", level: 0.55 },
    { label: "9A", level: 0.80 },
    { label: "11A", level: 0.75 },
    { label: "1P", level: 0.55 },
    { label: "3P", level: 0.25 },
  ],
  "hinterland-coffee-robin-rd-n": [
    { label: "8A", level: 0.40 },
    { label: "10A", level: 0.65 },
    { label: "12P", level: 0.55 },
    { label: "2P", level: 0.45 },
    { label: "4P", level: 0.30 },
  ],
  "uffda-donuts-grove-dr-n": [
    { label: "7A", level: 0.65 },
    { label: "8A", level: 0.90 },
    { label: "9A", level: 0.80 },
    { label: "10A", level: 0.55 },
    { label: "11A", level: 0.40 },
    { label: "12P", level: 0.45 },
    { label: "1P", level: 0.30 },
    { label: "2P", level: 0.20 },
  ],
};

async function main() {
  let updated = 0;
  let notFound = 0;

  for (const [slug, busyHours] of Object.entries(busyHoursBySlug)) {
    const result = await prisma.coffeeShop.updateMany({
      where: { slug },
      data: { busyHours: busyHours as object },
    });
    if (result.count > 0) {
      console.log(`  ✓ ${slug}`);
      updated += result.count;
    } else {
      console.warn(`  ✗ not found: ${slug}`);
      notFound += 1;
    }
  }

  console.log(`\nDone. Updated ${updated} shop(s), ${notFound} not found.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
