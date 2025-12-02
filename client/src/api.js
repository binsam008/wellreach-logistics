// client/src/api.js
import axios from "axios";

// Use Vercel env when deployed, fallback to localhost for development
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || "http://localhost:5000/api",
});

// Set JWT token after login
export const setToken = (token) => {
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common["Authorization"];
  }
};

// Restore token on refresh
const saved = localStorage.getItem("token");
if (saved) setToken(saved);

export default api;
