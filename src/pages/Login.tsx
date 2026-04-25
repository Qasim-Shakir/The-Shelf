import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { AlertCircle } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const { login, sessionExpired, clearExpired } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
      navigate("/library");
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to log in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-warm-linen p-6">
      <h1 className="text-6xl font-serif font-bold mb-16 text-dark-walnut tracking-tight">The Shelf</h1>
      
      <div className="w-full max-w-md bg-parchment border border-dust p-10 shadow-xl rounded-2xl">
        <h2 className="text-3xl font-serif font-bold mb-2 text-dark-walnut">Welcome back</h2>
        <p className="text-tan-oak text-sm font-medium italic mb-10">Login to continue reading</p>

        {sessionExpired && (
          <div className="mb-6 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 font-medium flex items-center justify-between">
            <span>Your session expired due to inactivity. Please log in again.</span>
            <button onClick={clearExpired} className="ml-4 text-amber-500 hover:text-amber-700 font-bold text-lg leading-none">×</button>
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-600 p-4 text-sm mb-8 border border-red-100 rounded-lg font-bold flex items-center gap-2">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-dust mb-2">Email Address</label>
            <input
              type="email"
              required
              className="w-full bg-warm-linen border border-dust p-4 text-sm rounded-lg focus:outline-none focus:border-tan-oak transition-colors text-dark-walnut placeholder:text-dust"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-dust">Password</label>
              <Link to="/forgot-password" className="text-[10px] font-bold uppercase tracking-widest text-library-green hover:underline">Forgot Password?</Link>
            </div>
            <input
              type="password"
              required
              className="w-full bg-warm-linen border border-dust p-4 text-sm rounded-lg focus:outline-none focus:border-tan-oak transition-colors text-dark-walnut placeholder:text-dust"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="**************"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-library-green text-white py-4 rounded-lg font-bold hover:bg-[#3D5A4C] transition-all shadow-lg hover:shadow-xl active:scale-95 disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="mt-10 text-center text-sm text-tan-oak font-medium">
          New here? <Link to="/signup" className="text-library-green font-bold hover:underline">Create Account</Link>
        </p>
      </div>
    </div>
  );
}
