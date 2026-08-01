import request from "supertest";
import { app } from "../app.js";
import { prisma } from "../config/db.js";
import { resetDb, makeProduct } from "../test/db.js";

const validCustomer = { name: "Ivan Ivanov", phone: "0888123456", address: "Sofia, ul. Test 1" };

describe("POST /orders", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("decrements stock and creates an order with its items", async () => {
    const product = await prisma.product.create({ data: makeProduct({ stockQty: 5 }) });

    const res = await request(app)
      .post("/orders")
      .send({ customer: validCustomer, items: [{ productId: product.id, qty: 2 }] });

    expect(res.status).toBe(201);
    expect(res.body.orderId).toBeTruthy();

    const updated = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(updated.stockQty).toBe(3);

    const order = await prisma.order.findUniqueOrThrow({
      where: { id: res.body.orderId },
      include: { items: true },
    });
    expect(order.items).toHaveLength(1);
    expect(order.items[0]?.qty).toBe(2);
    expect(Number(order.total)).toBeCloseTo(2 * 9.99, 2);
  });

  it("returns 409 and leaves stock unchanged when ordering more than available", async () => {
    const product = await prisma.product.create({ data: makeProduct({ stockQty: 1 }) });

    const res = await request(app)
      .post("/orders")
      .send({ customer: validCustomer, items: [{ productId: product.id, qty: 5 }] });

    expect(res.status).toBe(409);

    const unchanged = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(unchanged.stockQty).toBe(1);
    expect(await prisma.order.count()).toBe(0);
  });

  it("returns 400 when required customer fields are missing", async () => {
    const product = await prisma.product.create({ data: makeProduct() });

    const res = await request(app)
      .post("/orders")
      .send({ customer: { name: "Ivan" }, items: [{ productId: product.id, qty: 1 }] });

    expect(res.status).toBe(400);
  });

  it("returns 400 for an empty cart", async () => {
    const res = await request(app).post("/orders").send({ customer: validCustomer, items: [] });
    expect(res.status).toBe(400);
  });

  it("returns 400 and creates nothing for an unknown productId", async () => {
    const res = await request(app)
      .post("/orders")
      .send({ customer: validCustomer, items: [{ productId: "does-not-exist", qty: 1 }] });

    expect(res.status).toBe(400);
    expect(await prisma.order.count()).toBe(0);
  });
});
