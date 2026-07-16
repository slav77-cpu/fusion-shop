import type { JSX } from "react";
import { Navigate } from "react-router-dom";
import { isAdminLoggedIn } from "../utils/adminAuth";

export default function ProtectedRoute({ children }: { children: JSX.Element }): JSX.Element {
  if (!isAdminLoggedIn()) {
    return <Navigate to="/admin/login" replace />;
  }
  return children;
}
