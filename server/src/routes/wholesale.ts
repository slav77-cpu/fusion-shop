import express, { type Request, type Response, type NextFunction } from "express";
import { prisma } from "../config/db.js";
import { sendWholesaleQuoteEmail } from "../lib/mailer.js";

const router = express.Router();

interface QuoteInput {
  businessName?: string;
  email?: string;
  businessType?: string;
  estVolume?: string;
}

// POST /wholesale/quotes — bulk-pricing quote request from the Wholesale page
router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const b = (req.body || {}) as QuoteInput;
    const businessName = String(b.businessName || "").trim();
    const email = String(b.email || "").trim();
    const businessType = String(b.businessType || "").trim();
    const estVolume = String(b.estVolume || "").trim();

    if (!businessName || !email || !businessType) {
      return res.status(400).json({ message: "Missing business name/email/type" });
    }

    const quote = await prisma.wholesaleQuote.create({
      data: { businessName, email, businessType, estVolume },
    });

    res.status(201).json({ id: quote.id });

    void sendWholesaleQuoteEmail(quote);
  } catch (err) {
    next(err);
  }
});

export default router;
