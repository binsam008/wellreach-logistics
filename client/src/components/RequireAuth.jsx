// client/src/components/RequireAuth.jsx
import React from "react";
import { Navigate } from "react-router-dom";

export default function RequireAuth({ children }) {
  const token = localStorage.getItem("token"); // or wherever you store it

  if (!token) {
    // Not logged in → go to admin login
    return <Navigate to="/admin" replace />;
  }

  return children;
}
