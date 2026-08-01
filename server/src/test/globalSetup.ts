import { fileURLToPath } from "node:url";
import path from "node:path";
import { execSync } from "node:child_process";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(__dirname, "../..");

// Runs once, in a plain Node process outside the test workers, before the
// suite starts — applies pending migrations to the test database so the
// schema is current without touching the dev/prod databases.
export default function globalSetup() {
  const { parsed } = dotenv.config({ path: path.resolve(serverRoot, ".env.test") });
  const testDbUrl = parsed?.DATABASE_URL;

  if (!testDbUrl) {
    throw new Error(
      "server/.env.test is missing DATABASE_URL — create it before running tests (see server/.env for the local Postgres connection shape)."
    );
  }
  if (!testDbUrl.includes("_test")) {
    throw new Error(
      `Refusing to migrate a database whose name doesn't contain "_test": ${testDbUrl}. This is a safety check to stop tests from ever pointing at dev/prod.`
    );
  }

  execSync("npx prisma migrate deploy", {
    cwd: serverRoot,
    env: { ...process.env, DATABASE_URL: testDbUrl },
    stdio: "inherit",
  });
}
