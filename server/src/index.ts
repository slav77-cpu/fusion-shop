import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import { connectDB } from "./config/db.js";
import productsRoutes from "./routes/products.js";
import ordersRoutes from "./routes/orders.js";
import authRoutes from "./routes/auth.js";
import stockRoutes from "./routes/stock.js";
import paymentsWebhookRoutes from "./routes/payments.js";
import errorHandler from "./middleware/errorHandler.js";

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

const corsOrigin = process.env.CORS_ORIGIN || "*";

app.use(
  cors({
    origin: corsOrigin === "*" ? "*" : corsOrigin.split(",").map((o) => o.trim()),
  })
);

// IMPORTANT: mounted before express.json() — Stripe webhook signature
// verification needs the raw, unparsed request body.
app.use("/webhooks", paymentsWebhookRoutes);

app.use(express.json());

/* ---------------- DB ---------------- */

await connectDB();

/* ---------------- ROUTES ---------------- */

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/products", productsRoutes);
app.use("/orders", ordersRoutes);
app.use("/auth", authRoutes);
app.use("/stock", stockRoutes);

/* ---------------- ERRORS ---------------- */

app.use(errorHandler);

/* ---------------- SERVER ---------------- */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
