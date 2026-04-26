import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { normalizePgConnectionString } from "../src/utils/pgConnectionString.js";
import { COFFEE_SHOP_PLACEHOLDER_IMAGE_URL } from "../src/utils/googlePlacesPhoto.js";

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

/**
 * Coffee-focused venues near 11550 Arbor Lakes Pkwy N, Maple Grove, MN (~15 min drive).
 * Primarily coffee / espresso and bakery or cafe snacks — not full-service restaurants or grocery stores.
 * **No duplicate chains** (one Caribou, one Starbucks, one Dunkin', etc.); multiple distinct local names are fine.
 * Addresses / phones from public listings; coordinates from OpenStreetMap Nominatim where it resolves.
 *
 * **Default — create missing, preserve existing:** Ensures tag categories/tags from this file exist.
 * Creates **new** coffee shops (by slug) with full seed data. **Existing** shops are not updated,
 * but **missing `CoffeeShopTag` links** for tags listed in seed are added (manual/extra tags stay).
 * Adds a placeholder image only if the shop has no images. `googlePlaceId` is untouched.
 *
 * **Override:** `SEED_OVERWRITE=1` or `SEED_OVERRIDE=1` — full re-sync: update shop rows from seed,
 * replace shop tags with the seed list (removes tags not in seed), refresh placeholder images when
 * applicable, clear `googlePlaceId` for seeded slugs, deprecated-tag cleanup.
 *
 * **Purge (optional):** `SEED_PURGE_ORPHANS=1` — delete shops not in the seed list (or wrong city/state).
 */

type WeekHours = {
  monday: { open: string; close: string };
  tuesday: { open: string; close: string };
  wednesday: { open: string; close: string };
  thursday: { open: string; close: string };
  friday: { open: string; close: string };
  saturday: { open: string; close: string };
  sunday: { open: string; close: string };
};

const caribouTheGroveHours: WeekHours = {
  monday: { open: "06:00", close: "20:00" },
  tuesday: { open: "06:00", close: "20:00" },
  wednesday: { open: "06:00", close: "20:00" },
  thursday: { open: "06:00", close: "20:00" },
  friday: { open: "06:00", close: "20:00" },
  saturday: { open: "06:30", close: "20:00" },
  sunday: { open: "06:30", close: "19:00" },
};

const starbucksElmCreekHours: WeekHours = {
  monday: { open: "04:30", close: "21:30" },
  tuesday: { open: "04:30", close: "21:30" },
  wednesday: { open: "04:30", close: "21:30" },
  thursday: { open: "04:30", close: "21:30" },
  friday: { open: "04:30", close: "21:30" },
  saturday: { open: "05:00", close: "21:00" },
  sunday: { open: "05:00", close: "21:00" },
};

const kingdomCoffeeHours: WeekHours = {
  monday: { open: "06:00", close: "20:00" },
  tuesday: { open: "06:00", close: "20:00" },
  wednesday: { open: "06:00", close: "20:00" },
  thursday: { open: "06:00", close: "20:00" },
  friday: { open: "06:00", close: "20:00" },
  saturday: { open: "06:00", close: "20:00" },
  sunday: { open: "07:00", close: "15:00" },
};

const dunkinTypicalHours: WeekHours = {
  monday: { open: "05:00", close: "19:00" },
  tuesday: { open: "05:00", close: "19:00" },
  wednesday: { open: "05:00", close: "19:00" },
  thursday: { open: "05:00", close: "19:00" },
  friday: { open: "05:00", close: "19:00" },
  saturday: { open: "06:00", close: "18:00" },
  sunday: { open: "06:00", close: "18:00" },
};

const dailyDoseHours: WeekHours = {
  monday: { open: "06:30", close: "15:00" },
  tuesday: { open: "06:30", close: "15:00" },
  wednesday: { open: "06:30", close: "15:00" },
  thursday: { open: "06:30", close: "15:00" },
  friday: { open: "06:30", close: "15:00" },
  saturday: { open: "07:00", close: "14:00" },
  sunday: { open: "08:00", close: "14:00" },
};

const brueggersHours: WeekHours = {
  monday: { open: "05:30", close: "17:00" },
  tuesday: { open: "05:30", close: "17:00" },
  wednesday: { open: "05:30", close: "17:00" },
  thursday: { open: "05:30", close: "17:00" },
  friday: { open: "05:30", close: "17:00" },
  saturday: { open: "05:30", close: "17:00" },
  sunday: { open: "05:30", close: "17:00" },
};

const beanCoHours: WeekHours = {
  monday: { open: "07:00", close: "18:00" },
  tuesday: { open: "07:00", close: "18:00" },
  wednesday: { open: "07:00", close: "18:00" },
  thursday: { open: "07:00", close: "18:00" },
  friday: { open: "07:00", close: "18:00" },
  saturday: { open: "07:00", close: "19:00" },
  sunday: { open: "08:00", close: "18:00" },
};

const greatHarvestGroveSquareHours: WeekHours = {
  monday: { open: "06:00", close: "15:00" },
  tuesday: { open: "06:00", close: "18:00" },
  wednesday: { open: "06:00", close: "18:00" },
  thursday: { open: "06:00", close: "18:00" },
  friday: { open: "06:00", close: "18:00" },
  saturday: { open: "06:00", close: "17:00" },
  sunday: { open: "06:00", close: "15:00" },
};

const hinterlandRobinRdHours: WeekHours = {
  monday: { open: "08:00", close: "17:00" },
  tuesday: { open: "08:00", close: "17:00" },
  wednesday: { open: "08:00", close: "17:00" },
  thursday: { open: "08:00", close: "17:00" },
  friday: { open: "08:00", close: "17:00" },
  saturday: { open: "09:00", close: "15:00" },
  sunday: { open: "10:00", close: "14:00" },
};

const uffdaGroveDrHours: WeekHours = {
  monday: { open: "06:30", close: "18:00" },
  tuesday: { open: "06:30", close: "18:00" },
  wednesday: { open: "06:30", close: "18:00" },
  thursday: { open: "06:30", close: "18:00" },
  friday: { open: "06:30", close: "18:00" },
  saturday: { open: "07:00", close: "17:00" },
  sunday: { open: "07:00", close: "15:00" },
};

type SeedShop = {
  name: string;
  slug: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  addressLine1: string;
  postalCode: string;
  hours: WeekHours;
  description?: string | null;
  phone?: string | null;
  websiteUrl?: string | null;
  tags: string[];
  wifiQuality?: number | null;
  noiseLevel?: number | null;
  outletAvailability?: number | null;
  seatingComfort?: number | null;
  parkingQuality?: number | null;
  ratingAvg?: number | null;
  reviewCount?: number | null;
  priceLevel?: number | null;
};

function envFlag(name: string): boolean {
  const v = process.env[name]?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

/** When true, existing seeded rows are updated from this file (see file header). */
function seedOverrideEnabled(): boolean {
  return envFlag("SEED_OVERWRITE") || envFlag("SEED_OVERRIDE");
}

function shopDataFromSeed(shop: SeedShop) {
  return {
    name: shop.name,
    city: shop.city,
    state: shop.state,
    latitude: shop.latitude,
    longitude: shop.longitude,
    hours: shop.hours as object,
    addressLine1: shop.addressLine1,
    postalCode: shop.postalCode,
    description: shop.description ?? null,
    phone: shop.phone ?? null,
    websiteUrl: shop.websiteUrl ?? null,
    wifiQuality: shop.wifiQuality ?? null,
    noiseLevel: shop.noiseLevel ?? null,
    outletAvailability: shop.outletAvailability ?? null,
    seatingComfort: shop.seatingComfort ?? null,
    parkingQuality: shop.parkingQuality ?? null,
    ratingAvg: shop.ratingAvg ?? null,
    reviewCount: shop.reviewCount ?? null,
    priceLevel: shop.priceLevel ?? null,
  };
}

async function main() {
  const seedOverwrite = seedOverrideEnabled();
  const seedPurgeOrphans = envFlag("SEED_PURGE_ORPHANS");

  console.log("🌱 Seeding coffee shops (Maple Grove — coffee / cafe focused)...");
  if (!seedOverwrite) {
    console.log(
      "  New shops + new tag links only; existing shop rows unchanged. Set SEED_OVERRIDE=1 for full re-sync.",
    );
  }
  if (process.env.GOOGLE_PLACES_API_KEY?.trim()) {
    console.log(
      "  (Skipping seed placeholder images — run: pnpm backfill:google-images)",
    );
  }

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

  const tagData = [
    { name: "Quiet", slug: "quiet", categoryId: vibe.id },
    { name: "Cozy", slug: "cozy", categoryId: vibe.id },
    { name: "Modern", slug: "modern", categoryId: vibe.id },
    { name: "Calm", slug: "calm", categoryId: vibe.id },
    { name: "Minimalist", slug: "minimalist", categoryId: vibe.id },

    { name: "WiFi", slug: "wifi", categoryId: amenities.id },
    { name: "Outlets", slug: "outlets", categoryId: amenities.id },
    { name: "Parking Easy", slug: "easy-parking", categoryId: amenities.id },
    { name: "Food", slug: "food", categoryId: amenities.id },
    { name: "Public bathroom", slug: "public-bathroom", categoryId: amenities.id },

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

  async function ensureSeedTagLinksForShop(coffeeShopId: string, shop: SeedShop): Promise<void> {
    for (const tagSlug of shop.tags) {
      const tagId = tags[tagSlug.trim()];
      if (!tagId) {
        console.warn(`Skipping unknown tag slug "${tagSlug}" for shop ${shop.slug}`);
        continue;
      }
      await prisma.coffeeShopTag.upsert({
        where: {
          coffeeShopId_tagId: {
            coffeeShopId,
            tagId,
          },
        },
        update: {},
        create: {
          coffeeShopId,
          tagId,
        },
      });
    }
  }

  // Keep Daily Dose + Kingdom Coffee as fixed local fixtures when rotating other chains.
  const shops: SeedShop[] = [
    {
      name: "Daily Dose Cafe and Espresso",
      slug: "daily-dose-cafe-grove-cir",
      city: "Maple Grove",
      state: "MN",
      addressLine1: "15515 Grove Cir N",
      postalCode: "55369",
      latitude: 45.1350283,
      longitude: -93.4791654,
      hours: dailyDoseHours,
      phone: "+17636570919",
      websiteUrl: "https://dailydosemn.com/",
      description: "Locally owned cafe; espresso, pastries, breakfast sandwiches.",
      tags: ["cozy", "wifi"],
      wifiQuality: 4,
      noiseLevel: 3,
      outletAvailability: 3,
      seatingComfort: 4,
      parkingQuality: 4,
      ratingAvg: 4.6,
      reviewCount: 420,
      priceLevel: 2,
    },
    {
      name: "Kingdom Coffee",
      slug: "kingdom-coffee-main-st",
      city: "Maple Grove",
      state: "MN",
      addressLine1: "7899 Main St N",
      postalCode: "55369",
      latitude: 45.0981013,
      longitude: -93.4418461,
      hours: kingdomCoffeeHours,
      phone: "+17634243866",
      websiteUrl: "https://www.kingdomcoffeemn.com/",
      description: "Specialty coffee roaster & cafe at Main St & Arbor Lakes (former Dunn Bros site).",
      tags: ["modern", "wifi", "cozy", "calm", "easy-parking", "minimalist", "outlets", "food", "public-bathroom"],
      wifiQuality: 4,
      noiseLevel: 4,
      outletAvailability: 4,
      seatingComfort: 4,
      parkingQuality: 4,
      ratingAvg: 4.7,
      reviewCount: 280,
      priceLevel: 2,
    },
    {
      name: "Bean Co Cafe",
      slug: "bean-co-cafe-elm-creek-blvd-n",
      city: "Maple Grove",
      state: "MN",
      addressLine1: "7951 Elm Creek Blvd N Unit 2",
      postalCode: "55369",
      latitude: 45.0945527,
      longitude: -93.40514,
      hours: beanCoHours,
      phone: "+17632081331",
      websiteUrl: "https://www.coffeeshopmaplegrove.com/",
      description:
        "Locally owned coffee shop; espresso, cold brew, crepes, and bakery items — not a full-service restaurant.",
      tags: ["cozy", "wifi"],
      wifiQuality: 4,
      noiseLevel: 3,
      ratingAvg: 4.5,
      reviewCount: 180,
      priceLevel: 2,
    },
    {
      name: "Caribou Coffee — The Grove",
      slug: "caribou-the-grove-maple-grove-pkwy",
      city: "Maple Grove",
      state: "MN",
      addressLine1: "9805 Maple Grove Pkwy",
      postalCode: "55369",
      latitude: 45.1320188,
      longitude: -93.4777291,
      hours: caribouTheGroveHours,
      phone: "+16124263391",
      websiteUrl: "https://locations.cariboucoffee.com/us/mn/maple-grove/9805-maple-grove-parkway",
      description: "Closest Caribou to Arbor Lakes Pkwy; drive-thru & indoor seating.",
      tags: ["wifi", "easy-parking"],
      wifiQuality: 4,
      noiseLevel: 3,
      ratingAvg: 4.3,
      reviewCount: 720,
      priceLevel: 2,
    },
    {
      name: "Starbucks — Elm Creek Blvd N",
      slug: "starbucks-elm-creek-blvd",
      city: "Maple Grove",
      state: "MN",
      addressLine1: "11850 Elm Creek Blvd N",
      postalCode: "55369",
      latitude: 45.0949194,
      longitude: -93.4291018,
      hours: starbucksElmCreekHours,
      phone: "+17634650012",
      websiteUrl: "https://www.starbucks.com/store-locator",
      description: "Arbor Lakes area; Hemlock & Elm Creek Pkwy.",
      tags: ["wifi", "outlets"],
      wifiQuality: 4,
      noiseLevel: 3,
      outletAvailability: 3,
      ratingAvg: 4.3,
      reviewCount: 510,
      priceLevel: 2,
    },
    {
      name: "Bruegger's Bagels",
      slug: "brueggers-bass-lake-rd",
      city: "Maple Grove",
      state: "MN",
      addressLine1: "13384 Bass Lake Rd Ste 104",
      postalCode: "55311",
      latitude: 45.068831,
      longitude: -93.4497643,
      hours: brueggersHours,
      phone: "+17635596968",
      websiteUrl: "https://www.brueggers.com/",
      tags: ["cozy", "wifi"],
      wifiQuality: 3,
      noiseLevel: 3,
      ratingAvg: 4.2,
      reviewCount: 340,
      priceLevel: 1,
    },
    {
      name: "Dunkin'",
      slug: "dunkin-grove-dr-n",
      city: "Maple Grove",
      state: "MN",
      addressLine1: "13530 Grove Dr N",
      postalCode: "55311",
      latitude: 45.1046914,
      longitude: -93.4522039,
      hours: dunkinTypicalHours,
      phone: "+17632735640",
      websiteUrl: "https://locations.dunkindonuts.com/en/mn/maple-grove",
      tags: ["wifi", "easy-parking"],
      wifiQuality: 3,
      noiseLevel: 2,
      ratingAvg: 4.0,
      reviewCount: 290,
      priceLevel: 1,
    },
    {
      name: "Great Harvest Bread Co.",
      slug: "great-harvest-grove-dr-n",
      city: "Maple Grove",
      state: "MN",
      addressLine1: "13714 Grove Dr N",
      postalCode: "55311",
      latitude: 45.104498,
      longitude: -93.4543291,
      hours: greatHarvestGroveSquareHours,
      phone: "+17634161911",
      websiteUrl: "https://maplegrovebread.com/",
      description:
        "Bakery cafe; coffee, sandwiches, and fresh bread — Grove Square. Franchise hours vary (often closed Monday); confirm before visiting.",
      tags: ["cozy", "wifi", "food"],
      wifiQuality: 3,
      noiseLevel: 3,
      ratingAvg: 4.5,
      reviewCount: 210,
      priceLevel: 2,
    },
    {
      name: "Hinterland Coffee Co.",
      slug: "hinterland-coffee-robin-rd-n",
      city: "Maple Grove",
      state: "MN",
      addressLine1: "12133 Robin Rd N",
      postalCode: "55369",
      latitude: 45.0726531,
      longitude: -93.4394816,
      hours: hinterlandRobinRdHours,
      phone: "+16122082889",
      websiteUrl: "https://www.hinterlandmn.com/",
      description: "Local roastery & retail; beans and espresso drinks.",
      tags: ["modern", "calm", "wifi", "outlets"],
      wifiQuality: 3,
      noiseLevel: 3,
      outletAvailability: 3,
      ratingAvg: 4.6,
      reviewCount: 95,
      priceLevel: 2,
    },
    {
      name: "Uffda Donuts",
      slug: "uffda-donuts-grove-dr-n",
      city: "Maple Grove",
      state: "MN",
      addressLine1: "13716 Grove Dr N",
      postalCode: "55311",
      latitude: 45.1045337,
      longitude: -93.4543927,
      hours: uffdaGroveDrHours,
      phone: "+17632024009",
      websiteUrl: "https://uffdadonuts.com/",
      description: "Family-owned donut shop with espresso, smoothies, and sandwiches — Grove Square (next to Great Harvest).",
      tags: ["cozy", "wifi", "food"],
      wifiQuality: 3,
      noiseLevel: 3,
      ratingAvg: 4.4,
      reviewCount: 320,
      priceLevel: 2,
    },
  ];

  const seedSlugs = shops.map((s) => s.slug);

  if (seedPurgeOrphans) {
    const purge = await prisma.coffeeShop.deleteMany({
      where: {
        OR: [
          { slug: { notIn: seedSlugs } },
          { city: { not: "Maple Grove" } },
          { state: { not: "MN" } },
        ],
      },
    });
    if (purge.count > 0) {
      console.log(`   Removed ${purge.count} coffee shop row(s) not in Maple Grove seed list (SEED_PURGE_ORPHANS).`);
    }
  }

  const seedPlaceholderImages = !process.env.GOOGLE_PLACES_API_KEY?.trim();

  for (const shop of shops) {
    const existing = await prisma.coffeeShop.findUnique({ where: { slug: shop.slug } });

    if (existing && !seedOverwrite) {
      await ensureSeedTagLinksForShop(existing.id, shop);
      if (seedPlaceholderImages) {
        const existingImg = await prisma.coffeeShopImage.findFirst({
          where: { coffeeShopId: existing.id },
          orderBy: { sortOrder: "asc" },
        });
        if (!existingImg) {
          await prisma.coffeeShopImage.create({
            data: {
              coffeeShopId: existing.id,
              url: COFFEE_SHOP_PLACEHOLDER_IMAGE_URL,
              sortOrder: 0,
            },
          });
        }
      }
      continue;
    }

    const row = existing
      ? await prisma.coffeeShop.update({
          where: { id: existing.id },
          data: shopDataFromSeed(shop),
        })
      : await prisma.coffeeShop.create({
          data: { slug: shop.slug, ...shopDataFromSeed(shop) },
        });

    if (seedPlaceholderImages) {
      const existingImg = await prisma.coffeeShopImage.findFirst({
        where: { coffeeShopId: row.id },
        orderBy: { sortOrder: "asc" },
      });
      if (!existingImg) {
        await prisma.coffeeShopImage.create({
          data: {
            coffeeShopId: row.id,
            url: COFFEE_SHOP_PLACEHOLDER_IMAGE_URL,
            sortOrder: 0,
          },
        });
      } else if (seedOverwrite) {
        await prisma.coffeeShopImage.update({
          where: { id: existingImg.id },
          data: { url: COFFEE_SHOP_PLACEHOLDER_IMAGE_URL },
        });
      }
    }

    await ensureSeedTagLinksForShop(row.id, shop);

    const keepTagIds = shop.tags
      .map((s) => tags[s.trim()])
      .filter((id): id is string => Boolean(id));
    if (seedOverwrite && keepTagIds.length > 0) {
      await prisma.coffeeShopTag.deleteMany({
        where: {
          coffeeShopId: row.id,
          tagId: { notIn: keepTagIds },
        },
      });
    }
  }

  if (seedOverwrite) {
    const removedTags = await prisma.tag.deleteMany({
      where: { slug: { in: ["bright", "natural-light"] } },
    });
    if (removedTags.count > 0) {
      console.log(`   Removed ${removedTags.count} deprecated tag row(s) (bright, natural-light).`);
    }

    await prisma.coffeeShop.updateMany({
      where: { slug: { in: seedSlugs } },
      data: { googlePlaceId: null },
    });
  }

  console.log(`✅ Seed complete (${shops.length} shops).`);
  console.log(
    "   Optional: pnpm backfill:google-images -- --replace-placeholders (with GOOGLE_PLACES_API_KEY)",
  );
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
