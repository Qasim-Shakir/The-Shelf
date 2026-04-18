import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Layout } from "./components/Layout";
import ForgotPassword from "./pages/ForgotPassword";

// Pages
import Landingpage from "./pages/Landingpage";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Library from "./pages/Library";
import BookDetail from "./pages/BookDetail";
import Reader from "./pages/Reader";
import Profile from "./pages/Profile";
import AdminDashboard from "./pages/Admin/Dashboard";
import IngestBooks from "./pages/Admin/IngestBooks";
import ManageBooks from "./pages/Admin/ManageBooks";

const ProtectedRoute: React.FC<{ children: React.ReactNode; adminOnly?: boolean }> = ({ children, adminOnly = false }) => {
  const { user, isAuthReady } = useAuth();

  if (!isAuthReady) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (adminOnly && user.role !== "admin") return <Navigate to="/library" />;

  return <>{children}</>;
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/landingpage"element={<Landingpage />} /> 
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            
            <Route path="/library" element={<ProtectedRoute><Library /></ProtectedRoute>} />
            <Route path="/book/:id" element={<ProtectedRoute><BookDetail /></ProtectedRoute>} />
            <Route path="/read/:id" element={<ProtectedRoute><Reader /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            
            {/* Admin Routes */}
            <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/ingest" element={<ProtectedRoute adminOnly><IngestBooks /></ProtectedRoute>} />
            <Route path="/admin/manage" element={<ProtectedRoute adminOnly><ManageBooks /></ProtectedRoute>} />
            
            <Route path="/" element={<Navigate to="/landingpage" />} />
          </Routes>
        </Layout>
      </Router>
    </AuthProvider>
  );
}
