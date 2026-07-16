import { PrismaClient } from "@prisma/client";

// Reuse a single PrismaClient instance (important with `tsx watch` / hot reload,
// and generally recommended by Prisma to avoid exhausting DB connections).
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma = global.__prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.__prisma = prisma;
}

export async function connectDB(): Promise<void> {
  try {
    await prisma.$connect();
    console.log("PostgreSQL connected");
  } catch (err) {
    console.error("PostgreSQL connection error:", (err as Error).message);
    process.exit(1);
  }
}
