// client/src/api.js
import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api",
});

// call this after login / on app start
export const setToken = (token) => {
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common["Authorization"];
  }
};

// if page is refreshed, keep token if it exists
const saved = localStorage.getItem("token");
if (saved) {
  setToken(saved);
}

export default api;
