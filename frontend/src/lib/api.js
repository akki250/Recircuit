import axios from "axios";

export const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;
const TOKEN_KEY = "rc_token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

export const api = axios.create({ baseURL: API, withCredentials: true });
api.interceptors.request.use((cfg) => {
  const t = getToken();
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

export const fileUrl = (path) => (path ? `${API}/files/${path}?auth=${getToken() || ""}` : null);

export const inr = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(n) || 0);

export const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

export function errMsg(e) {
  const detail = e?.response?.data?.detail;
  if (detail == null) return e?.message || "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((d) => (d && typeof d.msg === "string" ? d.msg : JSON.stringify(d))).join(" ");
  if (typeof detail.msg === "string") return detail.msg;
  return String(detail);
}
