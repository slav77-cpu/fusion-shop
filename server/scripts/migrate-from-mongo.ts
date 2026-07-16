/**
 * One-off data migration: copies existing Product/Order data from the old
 * MongoDB (Mongoose) database into the new PostgreSQL (Prisma) database.
 *
 * This script is NOT part of the regular app — it's meant to be run once
 * while cutting over. It needs the `mongoose` package, which is not a
 * dependency of the new server anymore, so install it temporarily:
 *
 *   cd server
 *   npm install --no-save mongoose
 *   MIGRATE_MONGO_URI="<your old MONGO_URI>" npx tsx scripts/migrate-from-mongo.ts
 *
 * Mongo's ObjectId strings are kept as-is as the new Postgres row `id`
 * (Prisma's `id` column is just text, not a real `uuid` type, so this is
 * safe) — this preserves the Order -> Product references without having to
 * rewrite every id.
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import { PrismaClient, Prisma, OrderStatus } from "@prisma/client";

dotenv.config();

const prisma = new PrismaClient();

const MONGO_URI = process.env.MIGRATE_MONGO_URI;
if (!MONGO_URI) {
  console.error("Set MIGRATE_MONGO_URI to the old Mongo connection string before running this script.");
  process.exit(1);
}

// Minimal schemas — just enough to read the existing collections as-is.
const productSchema = new mongoose.Schema({}, { strict: false, collection: "products" });
const orderSchema = new mongoose.Schema({}, { strict: false, collection: "orders" });

const MongoProduct = mongoose.model("MigrateProduct", productSchema);
const MongoOrder = mongoose.model("MigrateOrder", orderSchema);

interface MongoProductDoc {
  _id: mongoose.Types.ObjectId;
  title?: string;
  variantName?: string;
  brand?: string;
  category?: string;
  packLabel?: string;
  pcs?: number;
  sizeMl?: number;
  price?: number;
  imageUrl?: string;
  // Old schema only ever had this yes/no flag, never a real count.
  inStock?: boolean;
  // In case you'd already added a manual quantity field to Mongo before
  // migrating — used in preference to inStock below if present.
  stockQty?: number;
  tag?: string;
  groupId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// The old app never tracked real quantities, only in-stock/out-of-stock. On
// migration, "in stock" products get this as a starting count — adjust to
// taste, or do a proper count via the new admin "Ревизия" page right after.
const DEFAULT_STOCK_QTY_WHEN_IN_STOCK = Number(process.env.MIGRATE_DEFAULT_STOCK_QTY || 10);

interface MongoOrderItemDoc {
  productId?: mongoose.Types.ObjectId | string;
  title: string;
  variantName?: string;
  price: number;
  qty: number;
}

interface MongoOrderDoc {
  _id: mongoose.Types.ObjectId;
  customer?: { name?: string; phone?: string; address?: string; note?: string };
  items?: MongoOrderItemDoc[];
  total?: number;
  status?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const VALID_STATUSES = new Set(Object.values(OrderStatus));

async function migrateProducts(): Promise<Set<string>> {
  const products = (await MongoProduct.find().lean()) as unknown as MongoProductDoc[];
  const migratedIds = new Set<string>();

  for (const p of products) {
    const id = String(p._id);
    await prisma.product.upsert({
      where: { id },
      create: {
        id,
        title: p.title || "",
        variantName: p.variantName || "",
        brand: p.brand || "",
        category: p.category || "",
        packLabel: p.packLabel || "",
        pcs: p.pcs ?? undefined,
        sizeMl: p.sizeMl ?? undefined,
        price: new Prisma.Decimal(p.price ?? 0),
        imageUrl: p.imageUrl || "",
        stockQty:
          p.stockQty !== undefined
            ? Math.max(0, Number(p.stockQty))
            : p.inStock
              ? DEFAULT_STOCK_QTY_WHEN_IN_STOCK
              : 0,
        tag: p.tag || "",
        groupId: p.groupId || "",
        createdAt: p.createdAt ?? undefined,
        updatedAt: p.updatedAt ?? undefined,
      },
      update: {},
    });
    migratedIds.add(id);
  }

  console.log(`Migrated ${products.length} products`);
  return migratedIds;
}

async function migrateOrders(knownProductIds: Set<string>): Promise<void> {
  const orders = (await MongoOrder.find().lean()) as unknown as MongoOrderDoc[];

  for (const o of orders) {
    const id = String(o._id);
    const status = VALID_STATUSES.has(o.status as OrderStatus) ? (o.status as OrderStatus) : OrderStatus.new;

    await prisma.order.upsert({
      where: { id },
      create: {
        id,
        customerName: o.customer?.name || "",
        customerPhone: o.customer?.phone || "",
        customerAddress: o.customer?.address || "",
        customerNote: o.customer?.note || "",
        total: new Prisma.Decimal(o.total ?? 0),
        status,
        createdAt: o.createdAt ?? undefined,
        updatedAt: o.updatedAt ?? undefined,
        items: {
          create: (o.items || []).map((i) => {
            const productId = i.productId ? String(i.productId) : undefined;
            return {
              // Only link productId if that product actually made it into Postgres
              // (e.g. wasn't deleted from Mongo already) — otherwise leave it null,
              // matching the app's own "product was deleted" behavior.
              productId: productId && knownProductIds.has(productId) ? productId : undefined,
              title: i.title,
              variantName: i.variantName || "",
              price: new Prisma.Decimal(i.price ?? 0),
              qty: i.qty ?? 1,
            };
          }),
        },
      },
      update: {},
    });
  }

  console.log(`Migrated ${orders.length} orders`);
}

async function run() {
  await mongoose.connect(MONGO_URI as string);
  console.log("Connected to Mongo");

  const productIds = await migrateProducts();
  await migrateOrders(productIds);

  await mongoose.disconnect();
  console.log("Done.");
}

run()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
