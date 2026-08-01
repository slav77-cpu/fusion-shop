import { fileURLToPath } from "node:url";
import path from "node:path";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Runs before any test file's own imports, so config/db.ts's PrismaClient is
// always constructed against the test database — override:true so this wins
// even if the shell/environment already has a dev DATABASE_URL exported.
dotenv.config({ path: path.resolve(__dirname, "../../.env.test"), override: true });
