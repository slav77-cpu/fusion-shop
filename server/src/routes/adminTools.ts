import express, { type Request, type Response, type NextFunction } from "express";
import { prisma } from "../config/db.js";
import requireAdmin from "../middleware/requireAdmin.js";
import { demoProducts } from "../lib/demoProducts.js";

// TEMPORARY: lets the admin reseed the demo catalog on an environment with
// no direct DB/shell access, by hitting a normal HTTPS endpoint instead.
// Remove this route (and its mount in index.ts) once no longer needed —
// it's admin-gated, but a standing full-catalog-wipe endpoint isn't
// something to leave lying around indefinitely.
const router = express.Router();

// Additive only — does NOT touch existing products. Adds the demo catalog
// alongside whatever's already there.
router.post("/add-demo", requireAdmin, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    for (const p of demoProducts) {
      await prisma.product.create({ data: p });
    }
    res.json({ added: demoProducts.length });
  } catch (err) {
    next(err);
  }
});

export default router;
