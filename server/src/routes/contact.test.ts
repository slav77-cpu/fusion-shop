import request from "supertest";
import { app } from "../app.js";
import { prisma } from "../config/db.js";
import { resetDb } from "../test/db.js";

describe("POST /contact", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("creates a contact message on valid input", async () => {
    const res = await request(app)
      .post("/contact")
      .send({ name: "Test User", email: "a@b.com", category: "General", message: "Hello there" });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeTruthy();

    const rows = await prisma.contactMessage.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.message).toBe("Hello there");
  });

  it("defaults category to 'Общ въпрос' when omitted", async () => {
    const res = await request(app)
      .post("/contact")
      .send({ name: "Test User", email: "a@b.com", message: "Hi" });

    expect(res.status).toBe(201);
    const row = await prisma.contactMessage.findUniqueOrThrow({ where: { id: res.body.id } });
    expect(row.category).toBe("Общ въпрос");
  });

  it("returns 400 when name/email/message are missing", async () => {
    const res = await request(app).post("/contact").send({ name: "Test" });

    expect(res.status).toBe(400);
    expect(await prisma.contactMessage.count()).toBe(0);
  });
});
