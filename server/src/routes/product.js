

// GET /products
import express from "express";
import Product from "../models/Product.js";
import requireAdmin from "../middleware/requireAdmin.js";


const router = express.Router();

// GET /products?q=&category=&brand=&minPrice=&maxPrice=&sort=&page=&limit=
router.get("/", async (req, res, next) => {
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
    } = req.query;

    const filter = {};

    if (q) {
      filter.$or = [
        { title: { $regex: q, $options: "i" } },
        { brand: { $regex: q, $options: "i" } },
        { variantName: { $regex: q, $options: "i" } },
      ];
    }

    if (category) filter.category = category;
    if (brand) filter.brand = brand;

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    // sorting
    let sortObj = { createdAt: -1 }; // newest
    if (sort === "price_asc") sortObj = { price: 1 };
    if (sort === "price_desc") sortObj = { price: -1 };
    if (sort === "title_asc") sortObj = { title: 1 };

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(50, Math.max(1, Number(limit) || 10));
    const skip = (pageNum - 1) * limitNum;

    const total = await Product.countDocuments(filter);

    const items = await Product.find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum);

    res.json({
      items,
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    next(err);
  }
});

// meta за dropdown-и
router.get("/meta", async (req, res, next) => {
  try {
    const categories = await Product.distinct("category");
    const brands = await Product.distinct("brand");

    res.json({
      categories: categories.filter(Boolean).sort(),
      brands: brands.filter(Boolean).sort(),
    });
  } catch (err) {
    next(err);
  }
});
// ADMIN: create product
router.post("/", requireAdmin, async (req, res, next) => {
  try {
    const p = req.body;

    if (!p?.title || p?.price === undefined) {
      return res.status(400).json({ message: "Missing title/price" });
    }

    const created = await Product.create({
      title: String(p.title).trim(),
      variantName: String(p.variantName || "").trim(),
      brand: String(p.brand || "").trim(),
      category: String(p.category || "").trim(),
      packLabel: String(p.packLabel || "").trim(), // "400 ml" / "5 pcs"
      sizeMl: p.sizeMl ? Number(p.sizeMl) : undefined,
      pcs: p.pcs ? Number(p.pcs) : undefined,
      price: Number(p.price),
      imageUrl: String(p.imageUrl || "").trim(),
      inStock: Boolean(p.inStock),
      tag: String(p.tag || "").trim(),
      groupId: String(p.groupId || "").trim(),
    });

    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

// ADMIN: update product
router.put("/:id", requireAdmin, async (req, res, next) => {
  try {
    const p = req.body;

    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      {
        title: p.title !== undefined ? String(p.title).trim() : undefined,
        variantName: p.variantName !== undefined ? String(p.variantName).trim() : undefined,
        brand: p.brand !== undefined ? String(p.brand).trim() : undefined,
        category: p.category !== undefined ? String(p.category).trim() : undefined,
        packLabel: p.packLabel !== undefined ? String(p.packLabel).trim() : undefined,
        sizeMl: p.sizeMl !== undefined && p.sizeMl !== "" ? Number(p.sizeMl) : undefined,
        pcs: p.pcs !== undefined && p.pcs !== "" ? Number(p.pcs) : undefined,
        price: p.price !== undefined ? Number(p.price) : undefined,
        imageUrl: p.imageUrl !== undefined ? String(p.imageUrl).trim() : undefined,
        inStock: p.inStock !== undefined ? Boolean(p.inStock) : undefined,
        tag: p.tag !== undefined ? String(p.tag).trim() : undefined,
        groupId: p.groupId !== undefined ? String(p.groupId).trim() : undefined,
      },
      { new: true, runValidators: true }
    );

    if (!updated) return res.status(404).json({ message: "Product not found" });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// ADMIN: delete product
router.delete("/:id", requireAdmin, async (req, res, next) => {
  try {
    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Product not found" });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ADMIN: get single product (за edit form)
router.get("/:id", requireAdmin, async (req, res, next) => {
  try {
    const p = await Product.findById(req.params.id);
    if (!p) return res.status(404).json({ message: "Product not found" });
    res.json(p);
  } catch (err) {
    next(err);
  }
});


export default router;
