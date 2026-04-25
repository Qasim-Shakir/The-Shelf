import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { AlertCircle } from "lucide-react";

export default function Signup() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const { signup } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!regex.test(formData.password)) {
      setError("Password must be at least 8 characters, include an uppercase, lowercase, number, and special character.");
      return;
    }

    setLoading(true);
    try {
      await signup(formData.fullName, formData.email, formData.password);
      navigate("/library");
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-warm-linen p-6 py-12">
      <h1 className="text-6xl font-serif font-bold mb-16 text-dark-walnut tracking-tight">The Shelf</h1>
      
      <div className="w-full max-w-md bg-parchment border border-dust p-10 shadow-xl rounded-2xl">
        <h2 className="text-3xl font-serif font-bold mb-2 text-dark-walnut">Create account</h2>
        <p className="text-tan-oak text-sm font-medium italic mb-10">Start your reading journey today!</p>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 text-sm mb-8 border border-red-100 rounded-lg font-bold flex items-center gap-2">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-dust mb-2">Full Name</label>
            <input
              type="text"
              required
              className="w-full bg-warm-linen border border-dust p-4 text-sm rounded-lg focus:outline-none focus:border-tan-oak transition-colors text-dark-walnut placeholder:text-dust"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              placeholder="Jane Austen"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-dust mb-2">Email Address</label>
            <input
              type="email"
              required
              className="w-full bg-warm-linen border border-dust p-4 text-sm rounded-lg focus:outline-none focus:border-tan-oak transition-colors text-dark-walnut placeholder:text-dust"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="jane@example.com"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-dust mb-2">
              Password
            </label>
            <input
              type="password"
              required
              className="w-full bg-warm-linen border border-dust p-4 text-sm rounded-lg focus:outline-none focus:border-tan-oak transition-colors text-dark-walnut placeholder:text-dust"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="**************"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-dust mb-2">Confirm Password</label>
            <input
              type="password"
              required
              className="w-full bg-warm-linen border border-dust p-4 text-sm rounded-lg focus:outline-none focus:border-tan-oak transition-colors text-dark-walnut placeholder:text-dust"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              placeholder="**************"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-library-green text-white py-4 rounded-lg font-bold hover:bg-[#3D5A4C] transition-all shadow-lg hover:shadow-xl active:scale-95 disabled:opacity-50"
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <p className="mt-10 text-center text-sm text-tan-oak font-medium">
          Already have an account? <Link to="/login" className="text-library-green font-bold hover:underline">Login</Link>
        </p>
      </div>
    </div>
  );
}
