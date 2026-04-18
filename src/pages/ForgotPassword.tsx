import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import axios from "axios";
import { AlertCircle, CheckCircle } from "lucide-react";

export default function ForgotPassword() {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<"request" | "reset">("request");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // If user arrives via reset link, jump straight to reset step
  useEffect(() => {
    const urlToken = searchParams.get("token");
    if (urlToken) {
      setToken(urlToken);
      setStep("reset");
    }
  }, [searchParams]);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const res = await axios.post("/api/auth/forgot-password", { email });
      setMessage(res.data.message);
    } catch (err: any) {
      setError(err.response?.data?.error || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post("/api/auth/reset-password", { token, newPassword });
      setMessage(res.data.message);
    } catch (err: any) {
      setError(err.response?.data?.error || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-warm-linen p-6">
      <h1 className="text-6xl font-serif font-bold mb-16 text-dark-walnut tracking-tight">The Shelf</h1>

      <div className="w-full max-w-md bg-parchment border border-dust p-10 shadow-xl rounded-2xl">
        <h2 className="text-3xl font-serif font-bold mb-2 text-dark-walnut">
          {step === "request" ? "Forgot Password" : "Reset Password"}
        </h2>
        <p className="text-tan-oak text-sm font-medium italic mb-10">
          {step === "request"
            ? "Enter your email and we'll send you a reset link."
            : "Choose a new password for your account."}
        </p>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 text-sm mb-8 border border-red-100 rounded-lg font-bold flex items-center gap-2">
            <AlertCircle size={18} /> {error}
          </div>
        )}

        {message && (
          <div className="bg-green-50 text-library-green p-4 text-sm mb-8 border border-green-100 rounded-lg font-bold flex items-center gap-2">
            <CheckCircle size={18} /> {message}
          </div>
        )}

        {step === "request" ? (
          <form onSubmit={handleRequest} className="space-y-8">
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
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-library-green text-white py-4 rounded-lg font-bold hover:bg-[#3D5A4C] transition-all shadow-lg hover:shadow-xl active:scale-95 disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleReset} className="space-y-8">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-dust mb-2">New Password</label>
              <input
                type="password"
                required
                className="w-full bg-warm-linen border border-dust p-4 text-sm rounded-lg focus:outline-none focus:border-tan-oak transition-colors text-dark-walnut placeholder:text-dust"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="**************"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-dust mb-2">Confirm New Password</label>
              <input
                type="password"
                required
                className="w-full bg-warm-linen border border-dust p-4 text-sm rounded-lg focus:outline-none focus:border-tan-oak transition-colors text-dark-walnut placeholder:text-dust"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="**************"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-library-green text-white py-4 rounded-lg font-bold hover:bg-[#3D5A4C] transition-all shadow-lg hover:shadow-xl active:scale-95 disabled:opacity-50"
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        )}

        <p className="mt-10 text-center text-sm text-tan-oak font-medium">
          Remember your password? <Link to="/login" className="text-library-green font-bold hover:underline">Login</Link>
        </p>
      </div>
    </div>
  );
}