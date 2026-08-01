import request from "supertest";
import { app } from "../app.js";
import { prisma } from "../config/db.js";
import { resetDb } from "../test/db.js";

describe("POST /wholesale/quotes", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("creates a quote on valid input", async () => {
    const res = await request(app)
      .post("/wholesale/quotes")
      .send({ businessName: "Test Hotel", email: "a@b.com", businessType: "Hotel", estVolume: "50 cases/mo" });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeTruthy();

    const rows = await prisma.wholesaleQuote.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.businessName).toBe("Test Hotel");
  });

  it("returns 400 when businessName/email/businessType are missing", async () => {
    const res = await request(app).post("/wholesale/quotes").send({ businessName: "Test" });

    expect(res.status).toBe(400);
    expect(await prisma.wholesaleQuote.count()).toBe(0);
  });
});
