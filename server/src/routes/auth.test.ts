import request from "supertest";
import { app } from "../app.js";

describe("POST /auth/login", () => {
  it("returns a token for correct credentials", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ username: process.env.ADMIN_USER, password: process.env.ADMIN_PASS });

    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe("string");
    expect(res.body.token.length).toBeGreaterThan(0);
  });

  it("returns 401 for a wrong password", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ username: process.env.ADMIN_USER, password: "wrong-password" });

    expect(res.status).toBe(401);
  });

  it("returns 400 when credentials are missing", async () => {
    const res = await request(app).post("/auth/login").send({});
    expect(res.status).toBe(400);
  });
});
