import request from "supertest";
import { Prisma } from "@prisma/client";
import { app } from "../app.js";
import { prisma } from "../config/db.js";
import { resetDb, makeProduct } from "../test/db.js";
import { adminToken } from "../test/auth.js";

describe("GET /products", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("filters by category", async () => {
    await prisma.product.create({ data: makeProduct({ title: "A", category: "shampoo" }) });
    await prisma.product.create({ data: makeProduct({ title: "B", category: "razor-blades" }) });

    const res = await request(app).get("/products").query({ category: "shampoo" });

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].title).toBe("A");
  });

  it("filters by search query across title/brand/variantName", async () => {
    await prisma.product.create({ data: makeProduct({ title: "Sky Shampoo", brand: "Sky" }) });
    await prisma.product.create({ data: makeProduct({ title: "Astra Blades", brand: "Astra" }) });

    const res = await request(app).get("/products").query({ q: "sky" });

    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].title).toBe("Sky Shampoo");
  });

  it("returns pagination metadata", async () => {
    for (let i = 0; i < 3; i++) {
      await prisma.product.create({ data: makeProduct({ title: `P${i}` }) });
    }

    const res = await request(app).get("/products").query({ limit: 2, page: 1 });

    expect(res.body.total).toBe(3);
    expect(res.body.pages).toBe(2);
    expect(res.body.items).toHaveLength(2);
  });
});

describe("GET /products/meta", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("returns distinct categories and brands", async () => {
    await prisma.product.create({ data: makeProduct({ category: "shampoo", brand: "Sky" }) });
    await prisma.product.create({ data: makeProduct({ category: "shampoo", brand: "Fusion" }) });

    const res = await request(app).get("/products/meta");

    expect(res.body.categories).toEqual(["shampoo"]);
    expect([...res.body.brands].sort()).toEqual(["Fusion", "Sky"]);
  });
});

describe("admin auth on write routes", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("rejects POST /products without a token", async () => {
    const res = await request(app).post("/products").send({ title: "X", price: 1 });
    expect(res.status).toBe(401);
  });

  it("rejects PUT /products/:id without a token", async () => {
    const product = await prisma.product.create({ data: makeProduct() });
    const res = await request(app).put(`/products/${product.id}`).send({ price: 5 });
    expect(res.status).toBe(401);
  });
});

describe("PUT /products/:id price tiers", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("fully replaces the tier set on save", async () => {
    const product = await prisma.product.create({
      data: makeProduct({
        priceTiers: {
          create: [{ label: "Old tier", unitQty: 5, price: new Prisma.Decimal(20), moqTiers: 1 }],
        },
      }),
    });

    const res = await request(app)
      .put(`/products/${product.id}`)
      .set("Authorization", `Bearer ${adminToken()}`)
      .send({ priceTiers: [{ label: "New tier", unitQty: 10, price: 40, moqTiers: 1 }] });

    expect(res.status).toBe(200);
    expect(res.body.priceTiers).toHaveLength(1);
    expect(res.body.priceTiers[0].label).toBe("New tier");

    const stored = await prisma.productPriceTier.findMany({ where: { productId: product.id } });
    expect(stored).toHaveLength(1);
    expect(stored[0]?.label).toBe("New tier");
  });
});
