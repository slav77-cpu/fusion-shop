import "express";

export interface AdminTokenPayload {
  isAdmin: true;
  username: string;
  iat?: number;
  exp?: number;
}

declare module "express-serve-static-core" {
  interface Request {
    user?: AdminTokenPayload;
  }
}
