import { PrismaClient, Prisma } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

const products: Prisma.ProductCreateInput[] = [
  {
    title: "Sky Shampoo",
    variantName: "Vanilla",
    brand: "Sky",
    category: "shampoo",
    sizeMl: 400,
    price: new Prisma.Decimal(6.9),
    stockQty: 25,
    groupId: "sky-shampoo-400",
  },
  {
    title: "Sky Shampoo",
    variantName: "Rose",
    brand: "Sky",
    category: "shampoo",
    sizeMl: 400,
    price: new Prisma.Decimal(6.9),
    stockQty: 25,
    groupId: "sky-shampoo-400",
  },
  {
    title: "Astra Blades",
    variantName: "Green (5 pcs)",
    brand: "Astra",
    category: "razor-blades",
    price: new Prisma.Decimal(2.5),
    stockQty: 40,
    groupId: "astra-blades",
  },
];

async function run() {
  // Products referenced by existing order items are kept safe: OrderItem.productId
  // is ON DELETE SET NULL, so this never touches the Order/OrderItem history.
  await prisma.product.deleteMany();
  await prisma.product.createMany({ data: products });

  console.log(`Seeded ${products.length} products`);
}

run()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
