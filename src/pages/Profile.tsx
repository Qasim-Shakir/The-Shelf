import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { User as UserIcon, BookOpen, CheckCircle, Clock, Shield, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function Profile() {
  const [activeTab, setActiveTab] = useState<"edit" | "history" | "security">("edit");
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const { user } = useAuth();
  const navigate = useNavigate();

  // Form states
  const [username, setUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        setUsername(user.username);
        // Fetch reading history
        const response = await axios.get("/api/profile/history", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });
        setHistory(response.data);
      } catch (err) {
        console.error("Failed to fetch profile data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setMessage("");
    try {
      await axios.put("/api/profile", { username }, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      setMessage("Profile updated successfully!");
    } catch (err) {
      setMessage("Failed to update profile.");
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    if (newPassword !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }
    try {
      await axios.put("/api/profile/password", { currentPassword, newPassword }, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      setMessage("Password updated successfully!");
      setNewPassword("");
      setConfirmPassword("");
      setCurrentPassword("");
    } catch (err: any) {
      setMessage(`Failed: ${err.response?.data?.error || err.message}`);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;

  const stats = {
    started: history.length,
    finished: history.filter((h: any) => h.percentage >= 99).length,
    inProgress: history.filter((h: any) => h.percentage < 99 && h.percentage > 0).length,
    hours: Math.floor(history.length * 2.5),
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="flex flex-col md:flex-row gap-8 items-start mb-12">
        <div className="w-full md:w-1/2 bg-parchment border border-dust p-8 rounded-2xl flex items-center gap-8 shadow-sm">
          <div className="w-24 h-24 bg-warm-linen rounded-full flex items-center justify-center text-dust border border-dust">
            <UserIcon size={48} />
          </div>
          <div>
            <h1 className="text-4xl font-serif font-bold mb-1 text-dark-walnut tracking-tight">{user?.username}</h1>
            <p className="text-tan-oak font-medium italic">{user?.email}</p>
          </div>
        </div>

        <div className="flex-1 flex gap-2 border border-dust p-1.5 rounded-xl bg-parchment shadow-sm">
          <button
            onClick={() => setActiveTab("edit")}
            className={`flex-1 py-3 px-6 rounded-lg text-sm font-bold transition-all ${activeTab === "edit" ? "bg-library-green text-white shadow-lg" : "text-tan-oak hover:text-dark-walnut"}`}
          >
            Edit Profile
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex-1 py-3 px-6 rounded-lg text-sm font-bold transition-all ${activeTab === "history" ? "bg-library-green text-white shadow-lg" : "text-tan-oak hover:text-dark-walnut"}`}
          >
            Reading History
          </button>
          <button
            onClick={() => setActiveTab("security")}
            className={`flex-1 py-3 px-6 rounded-lg text-sm font-bold transition-all ${activeTab === "security" ? "bg-library-green text-white shadow-lg" : "text-tan-oak hover:text-dark-walnut"}`}
          >
            Security
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
        <div className="bg-parchment border border-dust p-8 rounded-xl shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-dust mb-3">Books Started</p>
          <p className="text-5xl font-serif font-bold text-dark-walnut">{stats.started}</p>
        </div>
        <div className="bg-parchment border border-dust p-8 rounded-xl shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-dust mb-3">Books Finished</p>
          <p className="text-5xl font-serif font-bold text-dark-walnut">{stats.finished}</p>
        </div>
        <div className="bg-parchment border border-dust p-8 rounded-xl shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-dust mb-3">Books In Progress</p>
          <p className="text-5xl font-serif font-bold text-dark-walnut">{stats.inProgress}</p>
        </div>
        <div className="bg-[#EFE9DD] border border-dust p-8 rounded-xl shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-tan-oak mb-3">Reading Hours</p>
          <p className="text-5xl font-serif font-bold text-tan-oak">{stats.hours}</p>
        </div>
      </div>

      {message && (
        <div className="bg-green-50 text-library-green p-4 rounded-lg mb-10 border border-green-100 text-sm font-bold flex items-center gap-2">
          <CheckCircle size={18} />
          {message}
        </div>
      )}

      {activeTab === "edit" && (
        <div className="max-w-2xl bg-parchment p-10 rounded-2xl border border-dust shadow-sm">
          <h2 className="text-3xl font-serif font-bold mb-10 text-dark-walnut">Edit Profile</h2>
          <form onSubmit={handleUpdateProfile} className="space-y-8">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-dust mb-2">Full Name</label>
              <input
                type="text"
                className="w-full bg-warm-linen border border-dust p-4 rounded-lg focus:outline-none focus:border-tan-oak transition-colors text-dark-walnut"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-dust mb-2">Email Address</label>
              <input
                type="email"
                disabled
                className="w-full bg-warm-linen border border-dust p-4 rounded-lg text-dust cursor-not-allowed opacity-60"
                value={user?.email}
              />
            </div>
            <button type="submit" className="bg-library-green text-white px-10 py-4 rounded-lg font-bold hover:bg-[#3D5A4C] transition-all shadow-lg hover:shadow-xl active:scale-95">
              Save Changes
            </button>
          </form>
        </div>
      )}

      {activeTab === "history" && (
        <div className="bg-parchment p-10 rounded-2xl border border-dust shadow-sm">
          <div className="flex justify-between items-center mb-10">
            <h2 className="text-3xl font-serif font-bold text-dark-walnut">Reading History</h2>
          </div>
          <div className="space-y-8">
            {history.map((h: any) => (
              <div key={h.id} className="flex gap-8 p-6 bg-warm-linen border border-dust rounded-xl hover:border-tan-oak transition-all group">
                <div className="w-24 h-36 bg-parchment rounded-lg overflow-hidden flex-shrink-0 border border-dust shadow-sm">
                  <img src={h.book.coverUrl} alt={h.book.title} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" referrerPolicy="no-referrer" />
                </div>
                <div className="flex-1 flex flex-col justify-center">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-serif font-bold text-xl text-dark-walnut group-hover:text-library-green transition-colors">{h.book.title}</h3>
                      <p className="text-tan-oak font-medium italic">{h.book.author}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-serif font-bold text-dark-walnut">{Math.round(h.percentage)}%</p>
                      <button
                        onClick={() => navigate(`/read/${h.book.id}`)}
                        className="text-[10px] font-bold text-library-green hover:underline uppercase tracking-widest mt-2 block"
                      >
                        {h.percentage >= 99 ? "Read Again" : "Continue"}
                      </button>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-dust rounded-full overflow-hidden">
                    <div className={`h-full ${h.percentage >= 99 ? "bg-library-green" : "bg-aged-gold"}`} style={{ width: `${h.percentage}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "security" && (
        <div className="max-w-2xl bg-parchment p-10 rounded-2xl border border-dust shadow-sm">
          <h2 className="text-3xl font-serif font-bold mb-10 text-dark-walnut">Security</h2>
          <form onSubmit={handleUpdatePassword} className="space-y-8 mb-16">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-dust mb-2">Current Password</label>
              <input
                type="password"
                placeholder="Enter current password"
                className="w-full bg-warm-linen border border-dust p-4 rounded-lg focus:outline-none focus:border-tan-oak transition-colors text-dark-walnut"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-dust mb-2">New Password</label>
              <input
                type="password"
                placeholder="Enter new password"
                className="w-full bg-warm-linen border border-dust p-4 rounded-lg focus:outline-none focus:border-tan-oak transition-colors text-dark-walnut"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-dust mb-2">Confirm New Password</label>
              <input
                type="password"
                placeholder="Confirm new password"
                className="w-full bg-warm-linen border border-dust p-4 rounded-lg focus:outline-none focus:border-tan-oak transition-colors text-dark-walnut"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <button type="submit" className="bg-aged-gold text-white px-10 py-4 rounded-lg font-bold hover:bg-[#B8985E] transition-all shadow-lg hover:shadow-xl active:scale-95">
              Update Password
            </button>
          </form>

          <div className="pt-12 border-t border-dust">
            <h3 className="text-xl font-serif font-bold text-red-700 mb-6 flex items-center gap-2">
              <AlertCircle size={20} />
              Danger Zone
            </h3>
            <div className="bg-red-50 border border-red-100 p-8 rounded-xl flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <p className="font-bold text-red-900 text-lg">Delete Account</p>
                <p className="text-sm text-red-600 font-medium">This action will permanently remove your library and reading history.</p>
              </div>
              <button className="bg-red-600 text-white px-8 py-4 rounded-lg font-bold hover:bg-red-700 transition-all shadow-md active:scale-95">
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
