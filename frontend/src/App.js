import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Splash from "./pages/Splash";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import DashboardLayout from "./components/DashboardLayout";
import CollectorHome from "./pages/collector/CollectorHome";
import NewListing from "./pages/collector/NewListing";
import Wallet from "./pages/collector/Wallet";
import RecyclerHome from "./pages/recycler/RecyclerHome";
import Purchases from "./pages/recycler/Purchases";
import AdminHome from "./pages/admin/AdminHome";
import AdminLogs from "./pages/admin/AdminLogs";
import AdminUsers from "./pages/admin/AdminUsers";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCancel from "./pages/PaymentCancel";
import Profile from "./pages/Profile";

const Loader = () => (
  <div className="min-h-screen bg-ink flex items-center justify-center" data-testid="auth-loading">
    <div className="relative w-3 h-3 rounded-full bg-acid pulse-ring" />
  </div>
);

function Protected() {
  const { user } = useAuth();
  if (user === null) return <Loader />;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

function RoleRoute({ roles }) {
  const { user } = useAuth();
  return roles.includes(user.role) ? <Outlet /> : <Navigate to="/app" replace />;
}

function RoleHome() {
  const { user } = useAuth();
  if (user.role === "admin") return <AdminHome />;
  if (user.role === "recycler") return <RecyclerHome />;
  return <CollectorHome />;
}

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Splash />} />
            <Route path="/home" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/payment/cancel" element={<PaymentCancel />} />
            <Route element={<Protected />}>
              <Route path="/payment/success" element={<PaymentSuccess />} />
              <Route path="/app" element={<DashboardLayout />}>
                <Route index element={<RoleHome />} />
                <Route path="profile" element={<Profile />} />
                <Route element={<RoleRoute roles={["collector"]} />}>
                  <Route path="new" element={<NewListing />} />
                  <Route path="wallet" element={<Wallet />} />
                </Route>
                <Route element={<RoleRoute roles={["recycler"]} />}>
                  <Route path="purchases" element={<Purchases />} />
                </Route>
                <Route element={<RoleRoute roles={["admin"]} />}>
                  <Route path="logs" element={<AdminLogs />} />
                  <Route path="users" element={<AdminUsers />} />
                </Route>
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster theme="dark" position="top-right" richColors />
      </AuthProvider>
    </div>
  );
}

export default App;
