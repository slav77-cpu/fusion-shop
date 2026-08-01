import jwt from "jsonwebtoken";

/** A valid admin JWT signed with the test env's JWT_SECRET — lets
 *  route tests hit requireAdmin-gated endpoints without going through
 *  POST /auth/login every time. */
export function adminToken(): string {
  return jwt.sign({ isAdmin: true, username: "test-admin" }, process.env.JWT_SECRET as string, {
    expiresIn: "1h",
  });
}
