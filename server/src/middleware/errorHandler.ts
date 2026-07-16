import type { Request, Response, NextFunction } from "express";

// Centralized error handler — must be registered last (4-arg signature).
export default function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  console.error(err);
  const message = err instanceof Error ? err.message : "Internal server error";
  res.status(500).json({ message });
}
