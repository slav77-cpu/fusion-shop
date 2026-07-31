import express, { type Request, type Response, type NextFunction } from "express";
import { prisma } from "../config/db.js";
import { sendContactMessageEmail } from "../lib/mailer.js";

const router = express.Router();

interface ContactInput {
  name?: string;
  email?: string;
  category?: string;
  message?: string;
}

// POST /contact — contact form submission from the Contact page
router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const b = (req.body || {}) as ContactInput;
    const name = String(b.name || "").trim();
    const email = String(b.email || "").trim();
    const category = String(b.category || "").trim();
    const message = String(b.message || "").trim();

    if (!name || !email || !message) {
      return res.status(400).json({ message: "Missing name/email/message" });
    }

    const contactMessage = await prisma.contactMessage.create({
      data: { name, email, category: category || "Общ въпрос", message },
    });

    res.status(201).json({ id: contactMessage.id });

    void sendContactMessageEmail(contactMessage);
  } catch (err) {
    next(err);
  }
});

export default router;
