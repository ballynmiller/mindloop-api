-- CreateTable
CREATE TABLE "UserFavoriteShop" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "coffeeShopId" TEXT NOT NULL,

    CONSTRAINT "UserFavoriteShop_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserFavoriteShop_userId_coffeeShopId_key" ON "UserFavoriteShop"("userId", "coffeeShopId");

-- CreateIndex
CREATE INDEX "UserFavoriteShop_userId_createdAt_idx" ON "UserFavoriteShop"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "UserFavoriteShop_coffeeShopId_idx" ON "UserFavoriteShop"("coffeeShopId");

-- AddForeignKey
ALTER TABLE "UserFavoriteShop" ADD CONSTRAINT "UserFavoriteShop_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFavoriteShop" ADD CONSTRAINT "UserFavoriteShop_coffeeShopId_fkey" FOREIGN KEY ("coffeeShopId") REFERENCES "CoffeeShop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
