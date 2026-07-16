import express, { type Request, type Response, type NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../config/db.js";
import requireAdmin from "../middleware/requireAdmin.js";
import { serializeProduct } from "../lib/serialize.js";

const router = express.Router();

// GET /products?q=&category=&brand=&minPrice=&maxPrice=&sort=&page=&limit=
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      q,
      category,
      brand,
      minPrice,
      maxPrice,
      sort = "newest",
      page = "1",
      limit = "10",
    } = req.query as Record<string, string | undefined>;

    const where: Prisma.ProductWhereInput = {};

    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { brand: { contains: q, mode: "insensitive" } },
        { variantName: { contains: q, mode: "insensitive" } },
      ];
    }

    if (category) where.category = category;
    if (brand) where.brand = brand;

    if (minPrice || maxPrice) {
      const priceFilter: Prisma.DecimalFilter = {};
      if (minPrice) priceFilter.gte = new Prisma.Decimal(minPrice);
      if (maxPrice) priceFilter.lte = new Prisma.Decimal(maxPrice);
      where.price = priceFilter;
    }

    let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: "desc" }; // newest
    if (sort === "price_asc") orderBy = { price: "asc" };
    if (sort === "price_desc") orderBy = { price: "desc" };
    if (sort === "title_asc") orderBy = { title: "asc" };

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(50, Math.max(1, Number(limit) || 10));
    const skip = (pageNum - 1) * limitNum;

    const [total, items] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({ where, orderBy, skip, take: limitNum }),
    ]);

    res.json({
      items: items.map(serializeProduct),
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum) || 1,
    });
  } catch (err) {
    next(err);
  }
});

// meta за dropdown-и
router.get("/meta", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [categories, brands] = await Promise.all([
      prisma.product.findMany({
        where: { category: { not: null } },
        distinct: ["category"],
        select: { category: true },
      }),
      prisma.product.findMany({
        where: { brand: { not: null } },
        distinct: ["brand"],
        select: { brand: true },
      }),
    ]);

    res.json({
      categories: categories.map((c) => c.category).filter(Boolean).sort() as string[],
      brands: brands.map((b) => b.brand).filter(Boolean).sort() as string[],
    });
  } catch (err) {
    next(err);
  }
});

// ADMIN: create product
router.post("/", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const p = req.body || {};

    if (!p?.title || p?.price === undefined) {
      return res.status(400).json({ message: "Missing title/price" });
    }

    const created = await prisma.product.create({
      data: {
        title: String(p.title).trim(),
        variantName: String(p.variantName || "").trim(),
        brand: String(p.brand || "").trim(),
        category: String(p.category || "").trim(),
        packLabel: String(p.packLabel || "").trim(), // "400 ml" / "5 pcs"
        sizeMl: p.sizeMl ? Number(p.sizeMl) : undefined,
        pcs: p.pcs ? Number(p.pcs) : undefined,
        price: new Prisma.Decimal(Number(p.price)),
        imageUrl: String(p.imageUrl || "").trim(),
        stockQty: p.stockQty !== undefined && p.stockQty !== "" ? Math.max(0, Number(p.stockQty)) : 0,
        tag: String(p.tag || "").trim(),
        groupId: String(p.groupId || "").trim(),
      },
    });

    res.status(201).json(serializeProduct(created));
  } catch (err) {
    next(err);
  }
});

// ADMIN: update product
router.put("/:id", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const p = req.body || {};

    const data: Prisma.ProductUpdateInput = {
      title: p.title !== undefined ? String(p.title).trim() : undefined,
      variantName: p.variantName !== undefined ? String(p.variantName).trim() : undefined,
      brand: p.brand !== undefined ? String(p.brand).trim() : undefined,
      category: p.category !== undefined ? String(p.category).trim() : undefined,
      packLabel: p.packLabel !== undefined ? String(p.packLabel).trim() : undefined,
      sizeMl: p.sizeMl !== undefined && p.sizeMl !== "" ? Number(p.sizeMl) : undefined,
      pcs: p.pcs !== undefined && p.pcs !== "" ? Number(p.pcs) : undefined,
      price: p.price !== undefined ? new Prisma.Decimal(Number(p.price)) : undefined,
      imageUrl: p.imageUrl !== undefined ? String(p.imageUrl).trim() : undefined,
      stockQty: p.stockQty !== undefined && p.stockQty !== "" ? Math.max(0, Number(p.stockQty)) : undefined,
      tag: p.tag !== undefined ? String(p.tag).trim() : undefined,
      groupId: p.groupId !== undefined ? String(p.groupId).trim() : undefined,
    };

    const updated = await prisma.product.update({ where: { id: String(req.params.id) }, data });
    res.json(serializeProduct(updated));
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return res.status(404).json({ message: "Product not found" });
    }
    next(err);
  }
});

// ADMIN: delete product
router.delete("/:id", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.product.delete({ where: { id: String(req.params.id) } });
    res.json({ ok: true });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return res.status(404).json({ message: "Product not found" });
    }
    next(err);
  }
});

// ADMIN: get single product (за edit form)
router.get("/:id", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const p = await prisma.product.findUnique({ where: { id: String(req.params.id) } });
    if (!p) return res.status(404).json({ message: "Product not found" });
    res.json(serializeProduct(p));
  } catch (err) {
    next(err);
  }
});

export default router;
