import express, { type Request, type Response, type NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../config/db.js";
import requireAdmin from "../middleware/requireAdmin.js";
import { serializeProduct, serializeStockAudit } from "../lib/serialize.js";

const router = express.Router();

// All stock/revision endpoints are admin-only.
router.use(requireAdmin);

// GET /stock/products?q=  — full product list (system quantities) to count against.
// Deliberately not paginated like the public catalog: a revision session wants
// to see everything on one screen.
router.get("/products", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q } = req.query as Record<string, string | undefined>;

    const where: Prisma.ProductWhereInput = q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { brand: { contains: q, mode: "insensitive" } },
            { variantName: { contains: q, mode: "insensitive" } },
          ],
        }
      : {};

    const items = await prisma.product.findMany({
      where,
      orderBy: [{ category: "asc" }, { title: "asc" }],
    });

    res.json({ items: items.map(serializeProduct) });
  } catch (err) {
    next(err);
  }
});

// POST /stock/audits  { productId, countedQty, note? }
// Records a stock count and reconciles Product.stockQty to the counted value.
router.post("/audits", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId, countedQty, note } = (req.body || {}) as {
      productId?: string;
      countedQty?: number | string;
      note?: string;
    };

    if (!productId) {
      return res.status(400).json({ message: "Missing productId" });
    }

    const counted = Number(countedQty);
    if (!Number.isFinite(counted) || counted < 0) {
      return res.status(400).json({ message: "Невалидно преброено количество" });
    }

    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) return null;

      const systemQty = product.stockQty;
      const difference = counted - systemQty;

      const audit = await tx.stockAudit.create({
        data: {
          productId,
          systemQty,
          countedQty: counted,
          difference,
          note: note?.trim() || undefined,
        },
      });

      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: { stockQty: counted },
      });

      return { audit, updatedProduct };
    });

    if (!result) return res.status(404).json({ message: "Product not found" });

    res.status(201).json({
      audit: serializeStockAudit({ ...result.audit, product: result.updatedProduct }),
      product: serializeProduct(result.updatedProduct),
    });
  } catch (err) {
    next(err);
  }
});

// GET /stock/audits?productId=&page=&limit=  — revision history
router.get("/audits", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId, page = "1", limit = "50" } = req.query as Record<string, string | undefined>;

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(200, Math.max(1, Number(limit) || 50));
    const skip = (pageNum - 1) * limitNum;

    const where: Prisma.StockAuditWhereInput = productId ? { productId } : {};

    const [total, items] = await Promise.all([
      prisma.stockAudit.count({ where }),
      prisma.stockAudit.findMany({
        where,
        include: { product: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
      }),
    ]);

    res.json({
      items: items.map(serializeStockAudit),
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum) || 1,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
