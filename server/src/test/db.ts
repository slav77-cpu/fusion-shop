import { Prisma } from "@prisma/client";
import { prisma } from "../config/db.js";

/** Clears every table touched by the routes under test, in FK-safe order.
 *  Call from beforeEach so each test starts from a known-empty state. */
export async function resetDb(): Promise<void> {
  await prisma.$transaction([
    prisma.orderItem.deleteMany(),
    prisma.order.deleteMany(),
    prisma.stockAudit.deleteMany(),
    prisma.productPriceTier.deleteMany(),
    prisma.product.deleteMany(),
    prisma.wholesaleQuote.deleteMany(),
    prisma.contactMessage.deleteMany(),
  ]);
}

export function makeProduct(overrides: Partial<Prisma.ProductCreateInput> = {}): Prisma.ProductCreateInput {
  return {
    title: "Test Product",
    brand: "TestBrand",
    category: "test-category",
    price: new Prisma.Decimal(9.99),
    stockQty: 10,
    ...overrides,
  };
}
