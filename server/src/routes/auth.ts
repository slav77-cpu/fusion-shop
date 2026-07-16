import express, { type Request, type Response } from "express";
import jwt, { type SignOptions } from "jsonwebtoken";

const router = express.Router();

router.post("/login", (req: Request, res: Response) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ message: "Missing credentials" });
  }

  const ok =
    username === process.env.ADMIN_USER &&
    password === process.env.ADMIN_PASS;

  if (!ok) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const signOptions: SignOptions = {
    expiresIn: (process.env.JWT_EXPIRES_IN || "7d") as SignOptions["expiresIn"],
  };

  const token = jwt.sign(
    { isAdmin: true, username },
    process.env.JWT_SECRET as string,
    signOptions
  );

  res.json({ token });
});

export default router;
