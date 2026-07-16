import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import type { AdminTokenPayload } from "../types/express.js";

export default function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      res.status(401).json({ message: "Missing token" });
      return;
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET as string) as AdminTokenPayload;

    if (!payload?.isAdmin) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }

    req.user = payload;
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
}
