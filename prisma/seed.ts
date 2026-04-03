import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { normalizePgConnectionString } from "../src/utils/pgConnectionString.js";

// `pg` must use a direct Postgres URL. With Prisma Accelerate / PDP, set DIRECT_URL
// to the direct connection string and keep DATABASE_URL for the accelerated client.
const rawConnectionString =
  process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!rawConnectionString) {
  throw new Error(
    "Missing DATABASE_URL (or DIRECT_URL for seeding when using Accelerate).",
  );
}

const pool = new Pool({
  connectionString: normalizePgConnectionString(rawConnectionString),
  connectionTimeoutMillis: 60_000,
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const defaultHours = {
  monday: { open: "07:00", close: "18:00" },
  tuesday: { open: "07:00", close: "18:00" },
  wednesday: { open: "07:00", close: "18:00" },
  thursday: { open: "07:00", close: "18:00" },
  friday: { open: "07:00", close: "19:00" },
  saturday: { open: "08:00", close: "19:00" },
  sunday: { open: "08:00", close: "16:00" },
};

async function main() {
  console.log("🌱 Seeding coffee shops...");

  const vibe = await prisma.tagCategory.upsert({
    where: { slug: "vibe" },
    update: {},
    create: { name: "Vibe", slug: "vibe" },
  });

  const amenities = await prisma.tagCategory.upsert({
    where: { slug: "amenities" },
    update: {},
    create: { name: "Amenities", slug: "amenities" },
  });

  const useCase = await prisma.tagCategory.upsert({
    where: { slug: "use-case" },
    update: {},
    create: { name: "Use Case", slug: "use-case" },
  });

  const tagData = [
    { name: "Quiet", slug: "quiet", categoryId: vibe.id },
    { name: "Cozy", slug: "cozy", categoryId: vibe.id },
    { name: "Bright", slug: "bright", categoryId: vibe.id },
    { name: "Modern", slug: "modern", categoryId: vibe.id },

    { name: "WiFi", slug: "wifi", categoryId: amenities.id },
    { name: "Outlets", slug: "outlets", categoryId: amenities.id },
    { name: "Parking Easy", slug: "easy-parking", categoryId: amenities.id },

    { name: "Work", slug: "work", categoryId: useCase.id },
    { name: "Quick Stop", slug: "quick-stop", categoryId: useCase.id },
    { name: "Meet", slug: "meet", categoryId: useCase.id },
  ];

  const tags: Record<string, string> = {};
  for (const t of tagData) {
    const tag = await prisma.tag.upsert({
      where: { slug: t.slug },
      update: {},
      create: t,
    });
    tags[t.slug] = tag.id;
  }

  const shops = [
    {
      name: "Nordic Brewpub",
      slug: "nordic-brewpub",
      city: "Maple Grove",
      state: "MN",
      latitude: 45.103,
      longitude: -93.455,
      tags: ["quiet", "bright", "wifi", "work"],
    },
    {
      name: "Roots Roasting",
      slug: "roots-roasting",
      city: "Maple Grove",
      state: "MN",
      latitude: 45.098,
      longitude: -93.468,
      tags: ["modern", "wifi", "outlets", "work"],
    },
    {
      name: "Angel Food Bakery & Coffee",
      slug: "angel-food",
      city: "Maple Grove",
      state: "MN",
      latitude: 45.099,
      longitude: -93.462,
      tags: ["cozy", "quick-stop", "meet"],
    },
    {
      name: "Caribou Coffee - Arbor Lakes",
      slug: "caribou-arbor-lakes",
      city: "Maple Grove",
      state: "MN",
      latitude: 45.104,
      longitude: -93.455,
      tags: ["wifi", "quick-stop", "easy-parking"],
    },
    {
      name: "Starbucks - Main St",
      slug: "starbucks-main",
      city: "Maple Grove",
      state: "MN",
      latitude: 45.101,
      longitude: -93.45,
      tags: ["wifi", "quick-stop", "meet"],
    },
    {
      name: "Daily Dose Cafe",
      slug: "daily-dose",
      city: "Maple Grove",
      state: "MN",
      latitude: 45.097,
      longitude: -93.46,
      tags: ["cozy", "wifi", "meet"],
    },
    {
      name: "Rustica Coffee",
      slug: "rustica",
      city: "Plymouth",
      state: "MN",
      latitude: 45.01,
      longitude: -93.46,
      tags: ["cozy", "bright", "meet"],
    },
    {
      name: "Smith Coffee & Cafe",
      slug: "smith-coffee",
      city: "Plymouth",
      state: "MN",
      latitude: 45.015,
      longitude: -93.475,
      tags: ["modern", "wifi", "work"],
    },
    {
      name: "Corner Coffee - Osseo",
      slug: "corner-coffee",
      city: "Osseo",
      state: "MN",
      latitude: 45.119,
      longitude: -93.402,
      tags: ["cozy", "wifi", "meet"],
    },
    {
      name: "Starbucks - Weaver Lake",
      slug: "starbucks-weaver",
      city: "Maple Grove",
      state: "MN",
      latitude: 45.11,
      longitude: -93.47,
      tags: ["quick-stop", "wifi"],
    },
    {
      name: "Caribou Coffee - Weaver Lake Rd",
      slug: "caribou-weaver",
      city: "Maple Grove",
      state: "MN",
      latitude: 45.108,
      longitude: -93.468,
      tags: ["wifi", "easy-parking"],
    },
    {
      name: "Dunn Brothers Coffee",
      slug: "dunn-brothers",
      city: "Maple Grove",
      state: "MN",
      latitude: 45.102,
      longitude: -93.46,
      tags: ["cozy", "wifi", "work"],
    },
  ];

  for (const shop of shops) {
    const created = await prisma.coffeeShop.upsert({
      where: { slug: shop.slug },
      update: {},
      create: {
        name: shop.name,
        slug: shop.slug,
        city: shop.city,
        state: shop.state,
        latitude: shop.latitude,
        longitude: shop.longitude,
        hours: defaultHours,
      },
    });

    for (const tagSlug of shop.tags) {
      const tagId = tags[tagSlug.trim()];
      if (!tagId) {
        console.warn(`Skipping unknown tag slug "${tagSlug}" for shop ${shop.slug}`);
        continue;
      }
      await prisma.coffeeShopTag.upsert({
        where: {
          coffeeShopId_tagId: {
            coffeeShopId: created.id,
            tagId,
          },
        },
        update: {},
        create: {
          coffeeShopId: created.id,
          tagId,
        },
      });
    }
  }

  console.log("✅ Seed complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
