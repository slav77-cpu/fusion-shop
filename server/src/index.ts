import { app } from "./app.js";
import { connectDB } from "./config/db.js";

/* ---------------- DB ---------------- */

await connectDB();

/* ---------------- SERVER ---------------- */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
