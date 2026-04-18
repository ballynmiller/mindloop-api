import type { Prisma, PrismaClient } from "../../generated/prisma/client.js";
import { NotFoundError, ValidationError } from "../utils/errors.js";
import { coffeeShopToFavoriteListDto } from "./shopDto.js";
import type { RecommendationShopDto } from "../recommendations/service.js";

const MIN_SEARCH_LEN = 3;
const MAX_LIMIT = 50;

export type FavoritesListMeta = {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
};

export type FavoritesListResult = {
  shops: RecommendationShopDto[];
  meta: FavoritesListMeta;
};

const shopInclude = {
  tags: { include: { tag: true } },
  images: { orderBy: { sortOrder: "asc" as const }, take: 1 },
} satisfies Prisma.CoffeeShopInclude;

export async function getFavoriteShopIds(prisma: PrismaClient, userId: string): Promise<string[]> {
  const rows = await prisma.userFavoriteShop.findMany({
    where: { userId },
    select: { coffeeShopId: true },
  });
  return rows.map((r) => r.coffeeShopId);
}

export async function listFavorites(
  prisma: PrismaClient,
  userId: string,
  page: number,
  limit: number,
  searchRaw: string | undefined,
  timeZone: string,
): Promise<FavoritesListResult> {
  if (page < 1) throw new ValidationError("page must be >= 1");
  const lim = Math.min(Math.max(limit, 1), MAX_LIMIT);
  const skip = (page - 1) * lim;

  const q = searchRaw?.trim() ?? "";
  const useSearch = q.length >= MIN_SEARCH_LEN;

  const shopWhere: Prisma.CoffeeShopWhereInput | undefined = useSearch
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { city: { contains: q, mode: "insensitive" } },
          { state: { contains: q, mode: "insensitive" } },
        ],
      }
    : undefined;

  const where: Prisma.UserFavoriteShopWhereInput = {
    userId,
    ...(shopWhere ? { coffeeShop: { is: shopWhere } } : {}),
  };

  const [total, rows] = await prisma.$transaction([
    prisma.userFavoriteShop.count({ where }),
    prisma.userFavoriteShop.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: lim,
      include: {
        coffeeShop: {
          include: shopInclude,
        },
      },
    }),
  ]);

  const shops = rows.map((r) => coffeeShopToFavoriteListDto(r.coffeeShop, timeZone));

  return {
    shops,
    meta: {
      page,
      limit: lim,
      total,
      hasMore: skip + rows.length < total,
    },
  };
}

export async function toggleFavorite(
  prisma: PrismaClient,
  userId: string,
  coffeeShopId: string,
  timeZone: string,
): Promise<{ favorited: boolean; shop: RecommendationShopDto | null }> {
  const shop = await prisma.coffeeShop.findFirst({
    where: { id: coffeeShopId, isActive: true },
    include: shopInclude,
  });
  if (!shop) {
    throw new NotFoundError("Coffee shop not found");
  }

  const existing = await prisma.userFavoriteShop.findUnique({
    where: {
      userId_coffeeShopId: { userId, coffeeShopId },
    },
  });

  if (existing) {
    await prisma.userFavoriteShop.delete({
      where: { id: existing.id },
    });
    return { favorited: false, shop: null };
  }

  await prisma.userFavoriteShop.create({
    data: { userId, coffeeShopId },
  });

  return {
    favorited: true,
    shop: coffeeShopToFavoriteListDto(shop, timeZone),
  };
}
