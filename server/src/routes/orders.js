import express from "express";
import Order from "../models/Order.js";
import requireAdmin from "../middleware/requireAdmin.js";

const router = express.Router();

// POST /orders
router.post("/", async (req, res, next) => {
  try {
    const { customer, items } = req.body;

    if (!customer?.name || !customer?.phone || !customer?.address) {
      return res.status(400).json({ message: "Missing customer fields" });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    // server-side total calc (никога не вярваме на клиента)
    const total = items.reduce((sum, i) => sum + Number(i.price) * Number(i.qty), 0);

    const order = await Order.create({
      customer: {
        name: customer.name,
        phone: customer.phone,
        address: customer.address,
        note: customer.note || "",
      },
      items: items.map((i) => ({
        productId: i.productId,
        title: i.title,
        variantName: i.variantName || "",
        price: Number(i.price),
        qty: Number(i.qty),
      })),
      total,
      status: "new",
    });

    res.status(201).json({ orderId: order._id });
  } catch (err) {
    next(err);
  }
});
// GET /orders?page=&limit=&status=
router.get("/", requireAdmin,async (req, res, next) => {
  try {
    const { page = "1", limit = "20", status, phone, name, from, to } = req.query;

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const filter = {};
    if (status) filter.status = status;

    // Live search (case-insensitive)
    if (phone) {
      const p = String(phone).trim();
      if (p) filter["customer.phone"] = { $regex: p, $options: "i" };
    }

    if (name) {
      const n = String(name).trim();
      if (n) filter["customer.name"] = { $regex: n, $options: "i" };
    }

    // Date range filter (createdAt)
    // expects from/to like: YYYY-MM-DD (from date inclusive, to date inclusive)
    if (from || to) {
      filter.createdAt = {};

      if (from) {
        const dFrom = new Date(String(from));
        if (!Number.isNaN(dFrom.getTime())) {
          dFrom.setHours(0, 0, 0, 0);
          filter.createdAt.$gte = dFrom;
        }
      }

      if (to) {
        const dTo = new Date(String(to));
        if (!Number.isNaN(dTo.getTime())) {
          dTo.setHours(23, 59, 59, 999);
          filter.createdAt.$lte = dTo;
        }
      }

      // if both dates invalid, remove filter
      if (Object.keys(filter.createdAt).length === 0) delete filter.createdAt;
    }

    const total = await Order.countDocuments(filter);

    const items = await Order.find(filter)
      .sort({ createdAt: -1 }) // newest first
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
// GET /orders/:id
router.get("/:id", requireAdmin,async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json(order);
  } catch (err) {
    next(err);
  }
});
// PATCH /orders/:id/status
router.patch("/:id/status",requireAdmin, async (req, res, next) => {
  try {
    const { status } = req.body;

    const allowed = ["new", "confirmed", "shipped", "done", "cancelled"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!order) return res.status(404).json({ message: "Order not found" });

    res.json({ _id: order._id, status: order.status });
  } catch (err) {
    next(err);
  }
});



export default router;
