-- CreateEnum
CREATE TYPE "TagSource" AS ENUM ('EDITORIAL', 'IMPORTED', 'INFERRED', 'USER_CONFIRMED');

-- CreateEnum
CREATE TYPE "ImageSource" AS ENUM ('EDITORIAL', 'OWNER', 'USER');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "city" TEXT,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "state" TEXT;

-- CreateTable
CREATE TABLE "CoffeeShop" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postalCode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'US',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "phone" TEXT,
    "websiteUrl" TEXT,
    "googlePlaceId" TEXT,
    "hours" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoffeeShop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoffeeShopImage" (
    "id" TEXT NOT NULL,
    "coffeeShopId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "altText" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "source" "ImageSource" NOT NULL DEFAULT 'EDITORIAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoffeeShopImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TagCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TagCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFilterable" BOOLEAN NOT NULL DEFAULT true,
    "isPreference" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoffeeShopTag" (
    "id" TEXT NOT NULL,
    "coffeeShopId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "source" "TagSource" NOT NULL DEFAULT 'EDITORIAL',
    "confidence" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoffeeShopTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPreferredTag" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPreferredTag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CoffeeShop_slug_key" ON "CoffeeShop"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "CoffeeShop_googlePlaceId_key" ON "CoffeeShop"("googlePlaceId");

-- CreateIndex
CREATE INDEX "CoffeeShop_city_state_idx" ON "CoffeeShop"("city", "state");

-- CreateIndex
CREATE INDEX "CoffeeShop_latitude_longitude_idx" ON "CoffeeShop"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "CoffeeShopImage_coffeeShopId_sortOrder_idx" ON "CoffeeShopImage"("coffeeShopId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "TagCategory_name_key" ON "TagCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "TagCategory_slug_key" ON "TagCategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_slug_key" ON "Tag"("slug");

-- CreateIndex
CREATE INDEX "Tag_categoryId_sortOrder_idx" ON "Tag"("categoryId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_categoryId_name_key" ON "Tag"("categoryId", "name");

-- CreateIndex
CREATE INDEX "CoffeeShopTag_coffeeShopId_idx" ON "CoffeeShopTag"("coffeeShopId");

-- CreateIndex
CREATE INDEX "CoffeeShopTag_tagId_idx" ON "CoffeeShopTag"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "CoffeeShopTag_coffeeShopId_tagId_key" ON "CoffeeShopTag"("coffeeShopId", "tagId");

-- CreateIndex
CREATE INDEX "UserPreferredTag_userId_idx" ON "UserPreferredTag"("userId");

-- CreateIndex
CREATE INDEX "UserPreferredTag_tagId_idx" ON "UserPreferredTag"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPreferredTag_userId_tagId_key" ON "UserPreferredTag"("userId", "tagId");

-- AddForeignKey
ALTER TABLE "CoffeeShopImage" ADD CONSTRAINT "CoffeeShopImage_coffeeShopId_fkey" FOREIGN KEY ("coffeeShopId") REFERENCES "CoffeeShop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "TagCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoffeeShopTag" ADD CONSTRAINT "CoffeeShopTag_coffeeShopId_fkey" FOREIGN KEY ("coffeeShopId") REFERENCES "CoffeeShop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoffeeShopTag" ADD CONSTRAINT "CoffeeShopTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPreferredTag" ADD CONSTRAINT "UserPreferredTag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPreferredTag" ADD CONSTRAINT "UserPreferredTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
