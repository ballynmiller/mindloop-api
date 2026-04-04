import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { normalizePgConnectionString } from "../src/utils/pgConnectionString.js";

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
 * Maple Grove, MN — real venues only. Addresses/phones from operator & public listings;
 * coordinates from OpenStreetMap Nominatim (approx. building placement). Hours: verify at source.
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

const caribouBassLakeHours: WeekHours = {
  monday: { open: "06:00", close: "19:00" },
  tuesday: { open: "06:00", close: "19:00" },
  wednesday: { open: "06:00", close: "19:00" },
  thursday: { open: "06:00", close: "19:00" },
  friday: { open: "06:00", close: "19:00" },
  saturday: { open: "06:30", close: "18:00" },
  sunday: { open: "06:30", close: "18:00" },
};

const caribouStandardHours: WeekHours = {
  monday: { open: "06:00", close: "20:00" },
  tuesday: { open: "06:00", close: "20:00" },
  wednesday: { open: "06:00", close: "20:00" },
  thursday: { open: "06:00", close: "20:00" },
  friday: { open: "06:00", close: "20:00" },
  saturday: { open: "06:30", close: "20:00" },
  sunday: { open: "06:30", close: "19:00" },
};

const caribouLundsHours: WeekHours = {
  monday: { open: "08:00", close: "20:00" },
  tuesday: { open: "08:00", close: "20:00" },
  wednesday: { open: "08:00", close: "20:00" },
  thursday: { open: "08:00", close: "20:00" },
  friday: { open: "08:00", close: "20:00" },
  saturday: { open: "08:00", close: "20:00" },
  sunday: { open: "08:00", close: "18:00" },
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

const starbucksWedgewoodHours: WeekHours = {
  monday: { open: "04:30", close: "20:00" },
  tuesday: { open: "04:30", close: "20:00" },
  wednesday: { open: "04:30", close: "20:00" },
  thursday: { open: "04:30", close: "20:00" },
  friday: { open: "04:30", close: "20:00" },
  saturday: { open: "05:30", close: "21:00" },
  sunday: { open: "05:30", close: "21:00" },
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

const wholeFoodsHours: WeekHours = {
  monday: { open: "08:00", close: "21:00" },
  tuesday: { open: "08:00", close: "21:00" },
  wednesday: { open: "08:00", close: "21:00" },
  thursday: { open: "08:00", close: "21:00" },
  friday: { open: "08:00", close: "21:00" },
  saturday: { open: "08:00", close: "21:00" },
  sunday: { open: "08:00", close: "21:00" },
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

const cafeZupasHours: WeekHours = {
  monday: { open: "10:30", close: "21:00" },
  tuesday: { open: "10:30", close: "21:00" },
  wednesday: { open: "10:30", close: "21:00" },
  thursday: { open: "10:30", close: "21:00" },
  friday: { open: "10:30", close: "21:00" },
  saturday: { open: "10:30", close: "21:00" },
  sunday: { open: "10:30", close: "21:00" },
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

async function main() {
  console.log("🌱 Seeding Maple Grove coffee shops...");
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
    { name: "Calm", slug: "calm", categoryId: vibe.id },
    { name: "Minimalist", slug: "minimalist", categoryId: vibe.id },
    { name: "Natural Light", slug: "natural-light", categoryId: vibe.id },

    { name: "WiFi", slug: "wifi", categoryId: amenities.id },
    { name: "Outlets", slug: "outlets", categoryId: amenities.id },
    { name: "Parking Easy", slug: "easy-parking", categoryId: amenities.id },

    { name: "Work", slug: "work", categoryId: useCase.id },
    { name: "Quick Stop", slug: "quick-stop", categoryId: useCase.id },
    { name: "Meet", slug: "meet", categoryId: useCase.id },
    { name: "Chill", slug: "chill", categoryId: useCase.id },
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
      description: "Locally owned cafe; espresso, pastries, breakfast sandwiches. Main Maple Grove location.",
      tags: ["cozy", "wifi", "meet", "chill", "work", "natural-light"],
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
      description: "Specialty coffee roaster & cafe at Main St & Arbor Lakes Pkwy (former Dunn Bros site).",
      tags: ["modern", "wifi", "work", "cozy", "meet", "calm"],
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
      name: "Caribou Coffee — Bass Lake Rd & Sycamore Ln",
      slug: "caribou-bass-lake-rd",
      city: "Maple Grove",
      state: "MN",
      addressLine1: "12850 Bass Lake Rd",
      postalCode: "55369",
      latitude: 45.0650122,
      longitude: -93.4421325,
      hours: caribouBassLakeHours,
      phone: "+17635531293",
      websiteUrl: "https://locations.cariboucoffee.com/us/mn/maple-grove/12850-bass-lake-road",
      tags: ["wifi", "quick-stop", "easy-parking", "work"],
      wifiQuality: 4,
      noiseLevel: 3,
      outletAvailability: 3,
      ratingAvg: 4.3,
      reviewCount: 890,
      priceLevel: 2,
    },
    {
      name: "Caribou Coffee — Dunkirk Square",
      slug: "caribou-dunkirk-square",
      city: "Maple Grove",
      state: "MN",
      addressLine1: "16393 County Rd 30",
      postalCode: "55311",
      latitude: 45.1253531,
      longitude: -93.487465,
      hours: caribouStandardHours,
      websiteUrl: "https://locations.cariboucoffee.com/us/mn/maple-grove",
      tags: ["wifi", "quick-stop", "easy-parking", "meet"],
      wifiQuality: 4,
      noiseLevel: 3,
      ratingAvg: 4.2,
      reviewCount: 650,
      priceLevel: 2,
    },
    {
      name: "Caribou Coffee — Lunds & Byerlys Maple Grove",
      slug: "caribou-lunds-maple-grove",
      city: "Maple Grove",
      state: "MN",
      addressLine1: "12880 Elm Creek Blvd N",
      postalCode: "55369",
      latitude: 45.0962704,
      longitude: -93.4442798,
      hours: caribouLundsHours,
      websiteUrl: "https://locations.cariboucoffee.com/us/mn/maple-grove",
      tags: ["wifi", "quick-stop", "bright"],
      wifiQuality: 3,
      noiseLevel: 3,
      ratingAvg: 4.2,
      reviewCount: 410,
      priceLevel: 2,
    },
    {
      name: "Caribou Coffee — The Grove",
      slug: "caribou-maple-grove-pkwy",
      city: "Maple Grove",
      state: "MN",
      addressLine1: "9805 Maple Grove Pkwy",
      postalCode: "55369",
      latitude: 45.1320188,
      longitude: -93.4777291,
      hours: caribouStandardHours,
      websiteUrl: "https://locations.cariboucoffee.com/us/mn/maple-grove",
      tags: ["wifi", "quick-stop", "easy-parking", "meet"],
      wifiQuality: 4,
      noiseLevel: 3,
      ratingAvg: 4.3,
      reviewCount: 720,
      priceLevel: 2,
    },
    {
      name: "Caribou Coffee — Weaver Lake Rd",
      slug: "caribou-weaver-lake-rd",
      city: "Maple Grove",
      state: "MN",
      addressLine1: "13250 Grove Dr",
      postalCode: "55369",
      latitude: 45.1038122,
      longitude: -93.4489389,
      hours: caribouStandardHours,
      websiteUrl: "https://locations.cariboucoffee.com/us/mn/maple-grove",
      tags: ["wifi", "quick-stop", "easy-parking"],
      wifiQuality: 4,
      noiseLevel: 3,
      ratingAvg: 4.2,
      reviewCount: 610,
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
      description: "Arbor Lakes / Hemlock & Elm Creek Pkwy.",
      tags: ["wifi", "work", "quick-stop", "meet"],
      wifiQuality: 4,
      noiseLevel: 3,
      outletAvailability: 3,
      ratingAvg: 4.3,
      reviewCount: 510,
      priceLevel: 2,
    },
    {
      name: "Starbucks — Wedgewood Ln N",
      slug: "starbucks-wedgewood-ln",
      city: "Maple Grove",
      state: "MN",
      addressLine1: "7979 Wedgewood Ln N",
      postalCode: "55369",
      latitude: 45.1009651,
      longitude: -93.4499962,
      hours: starbucksWedgewoodHours,
      phone: "+17634206311",
      websiteUrl: "https://www.starbucks.com/store-locator",
      tags: ["wifi", "quick-stop", "meet"],
      wifiQuality: 4,
      noiseLevel: 3,
      ratingAvg: 4.2,
      reviewCount: 380,
      priceLevel: 2,
    },
    {
      name: "Cafe Zupas",
      slug: "cafe-zupas-fountains",
      city: "Maple Grove",
      state: "MN",
      addressLine1: "11669 Fountains Dr N",
      postalCode: "55369",
      latitude: 45.0942198,
      longitude: -93.4274515,
      hours: cafeZupasHours,
      phone: "+16122525229",
      websiteUrl: "https://www.cafezupas.com/",
      description: "Fast-casual soups, salads, bowls; full espresso bar at Arbor Lakes Fountains.",
      tags: ["bright", "quick-stop", "meet", "wifi", "modern"],
      wifiQuality: 3,
      noiseLevel: 2,
      ratingAvg: 4.4,
      reviewCount: 620,
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
      tags: ["quick-stop", "cozy", "wifi"],
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
      tags: ["quick-stop", "wifi", "easy-parking"],
      wifiQuality: 3,
      noiseLevel: 2,
      ratingAvg: 4.0,
      reviewCount: 290,
      priceLevel: 1,
    },
    {
      name: "Dunkin'",
      slug: "dunkin-zachary-lane-n",
      city: "Maple Grove",
      state: "MN",
      addressLine1: "9595 Zachary Ln N",
      postalCode: "55369",
      latitude: 45.1287777,
      longitude: -93.4230766,
      hours: dunkinTypicalHours,
      phone: "+17632738679",
      websiteUrl: "https://locations.dunkindonuts.com/en/mn/maple-grove",
      tags: ["quick-stop", "wifi", "easy-parking"],
      wifiQuality: 3,
      noiseLevel: 2,
      ratingAvg: 4.1,
      reviewCount: 210,
      priceLevel: 1,
    },
    {
      name: "Whole Foods Market — Allegro Coffee Bar",
      slug: "allegro-whole-foods-elm-creek",
      city: "Maple Grove",
      state: "MN",
      addressLine1: "12201 Elm Creek Blvd N",
      postalCode: "55369",
      latitude: 45.0940647,
      longitude: -93.439534,
      hours: wholeFoodsHours,
      phone: "+17634167300",
      websiteUrl: "https://www.wholefoodsmarket.com/stores/maplegrove",
      description: "In-store Allegro espresso bar at Whole Foods Maple Grove.",
      tags: ["bright", "quick-stop", "wifi", "easy-parking"],
      wifiQuality: 3,
      noiseLevel: 2,
      ratingAvg: 4.2,
      reviewCount: 150,
      priceLevel: 2,
    },
  ];

  const seedSlugs = shops.map((s) => s.slug);

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
    console.log(`   Removed ${purge.count} coffee shop row(s) not in Maple Grove seed list.`);
  }

  const placeholder =
    "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&q=80";
  const seedPlaceholderImages = !process.env.GOOGLE_PLACES_API_KEY?.trim();

  for (const shop of shops) {
    const created = await prisma.coffeeShop.upsert({
      where: { slug: shop.slug },
      update: {
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
      },
      create: {
        name: shop.name,
        slug: shop.slug,
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
      },
    });

    if (seedPlaceholderImages) {
      const existingImg = await prisma.coffeeShopImage.findFirst({
        where: { coffeeShopId: created.id },
        orderBy: { sortOrder: "asc" },
      });
      if (existingImg) {
        await prisma.coffeeShopImage.update({
          where: { id: existingImg.id },
          data: { url: placeholder },
        });
      } else {
        await prisma.coffeeShopImage.create({
          data: {
            coffeeShopId: created.id,
            url: placeholder,
            sortOrder: 0,
          },
        });
      }
    }

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

  await prisma.coffeeShop.updateMany({
    where: { slug: { in: seedSlugs } },
    data: { googlePlaceId: null },
  });

  console.log(`✅ Seed complete (${shops.length} Maple Grove shops).`);
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
