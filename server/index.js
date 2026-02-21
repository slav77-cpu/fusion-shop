import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import { connectDB } from "./src/config/db.js";
import productsRoutes from "./src/routes/product.js";
import ordersRoutes from "./src/routes/orders.js";
import authRoutes from "./src/routes/auth.js";

dotenv.config();

const app = express();

/* ---------------- SECURITY ---------------- */

app.use(helmet());

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 мин
    max: 300, // 300 заявки на IP
    standardHeaders: true,
    legacyHeaders: false,
  })
);

/* ---------------- CORE ---------------- */

app.use(
  cors({
    origin: "*", // после може да го заключим само към твоя frontend
  })
);

app.use(express.json());

/* ---------------- DB ---------------- */

await connectDB();

/* ---------------- ROUTES ---------------- */

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/products", productsRoutes);
app.use("/orders", ordersRoutes);
app.use("/auth", authRoutes);

/* ---------------- SERVER ---------------- */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});