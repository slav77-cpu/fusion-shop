import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import { demoProducts } from "../src/lib/demoProducts.js";

dotenv.config();

const prisma = new PrismaClient();

async function run() {
  // Products referenced by existing order items are kept safe: OrderItem.productId
  // is ON DELETE SET NULL, so this never touches the Order/OrderItem history.
  await prisma.product.deleteMany();
  // create (not createMany) — a couple of entries above nest a priceTiers
  // create, which createMany can't express since it only writes scalar columns.
  for (const p of demoProducts) {
    await prisma.product.create({ data: p });
  }

  console.log(`Seeded ${demoProducts.length} products`);
}

run()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
