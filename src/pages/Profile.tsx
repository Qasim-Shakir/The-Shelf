import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { User as UserIcon, CheckCircle, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function Profile() {
  const[activeTab, setActiveTab] = useState<"edit" | "history" | "security">("edit");
  const[history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const { user } = useAuth();
  const navigate = useNavigate();

  // Form states
  const[username, setUsername] = useState("");
  const[currentPassword, setCurrentPassword] = useState("");
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="font-serif italic text-lg text-tan-oak animate-pulse">Loading profile…</p>
      </div>
    );
  }

  const stats = {
    started: history.length,
    finished: history.filter((h: any) => h.percentage >= 99).length,
    inProgress: history.filter((h: any) => h.percentage < 99 && h.percentage > 0).length,
    hours: Math.floor(history.length * 2.5),
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      
      {/* ── TOP SECTION (User Info & Tabs) ── */}
      <div className="flex flex-col lg:flex-row gap-6 sm:gap-8 items-stretch lg:items-start mb-10 sm:mb-12">
        
        {/* User Card */}
        <div className="w-full lg:w-1/2 bg-parchment border border-dust p-6 sm:p-8 rounded-2xl flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 shadow-sm text-center sm:text-left">
          <div className="w-20 sm:w-24 h-20 sm:h-24 bg-warm-linen rounded-full flex items-center justify-center text-dust border border-dust shrink-0">
            <UserIcon className="w-10 h-10 sm:w-12 sm:h-12" />
          </div>
          <div className="min-w-0 w-full">
            <h1 className="text-3xl sm:text-4xl font-serif font-bold mb-1 text-dark-walnut tracking-tight truncate">
              {user?.username}
            </h1>
            <p className="text-sm sm:text-base text-tan-oak font-medium italic truncate">
              {user?.email}
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex-1 flex flex-col sm:flex-row gap-2 border border-dust p-1.5 rounded-xl bg-parchment shadow-sm">
          <button
            onClick={() => setActiveTab("edit")}
            className={`cursor-pointer flex-1 py-3 px-4 sm:px-6 rounded-lg text-xs sm:text-sm font-bold transition-all ${
              activeTab === "edit" 
                ? "bg-library-green text-white shadow-md" 
                : "text-tan-oak hover:text-dark-walnut hover:bg-warm-linen"
            }`}
          >
            Edit Profile
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`cursor-pointer flex-1 py-3 px-4 sm:px-6 rounded-lg text-xs sm:text-sm font-bold transition-all ${
              activeTab === "history" 
                ? "bg-library-green text-white shadow-md" 
                : "text-tan-oak hover:text-dark-walnut hover:bg-warm-linen"
            }`}
          >
            Reading History
          </button>
          <button
            onClick={() => setActiveTab("security")}
            className={`cursor-pointer flex-1 py-3 px-4 sm:px-6 rounded-lg text-xs sm:text-sm font-bold transition-all ${
              activeTab === "security" 
                ? "bg-library-green text-white shadow-md" 
                : "text-tan-oak hover:text-dark-walnut hover:bg-warm-linen"
            }`}
          >
            Security
          </button>
        </div>
      </div>

      {/* ── STATS CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-12 sm:mb-16">
        <div className="bg-parchment border border-dust p-5 sm:p-8 rounded-xl shadow-sm">
          <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-dust mb-2 sm:mb-3">Books Started</p>
          <p className="text-4xl sm:text-5xl font-serif font-bold text-dark-walnut">{stats.started}</p>
        </div>
        <div className="bg-parchment border border-dust p-5 sm:p-8 rounded-xl shadow-sm">
          <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-dust mb-2 sm:mb-3">Books Finished</p>
          <p className="text-4xl sm:text-5xl font-serif font-bold text-dark-walnut">{stats.finished}</p>
        </div>
        <div className="bg-parchment border border-dust p-5 sm:p-8 rounded-xl shadow-sm">
          <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-dust mb-2 sm:mb-3">In Progress</p>
          <p className="text-4xl sm:text-5xl font-serif font-bold text-dark-walnut">{stats.inProgress}</p>
        </div>
        <div className="bg-[#EFE9DD] border border-dust p-5 sm:p-8 rounded-xl shadow-sm">
          <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-tan-oak mb-2 sm:mb-3">Reading Hours</p>
          <p className="text-4xl sm:text-5xl font-serif font-bold text-tan-oak">{stats.hours}</p>
        </div>
      </div>

      {message && (
        <div className="bg-green-50 text-library-green p-4 rounded-lg mb-8 sm:mb-10 border border-green-100 text-xs sm:text-sm font-bold flex items-center gap-2">
          <CheckCircle size={18} className="shrink-0" />
          {message}
        </div>
      )}

      {/* ── TAB CONTENT: EDIT PROFILE ── */}
      {activeTab === "edit" && (
        <div className="max-w-2xl bg-parchment p-6 sm:p-10 rounded-2xl border border-dust shadow-sm">
          <h2 className="text-2xl sm:text-3xl font-serif font-bold mb-8 sm:mb-10 text-dark-walnut">Edit Profile</h2>
          <form onSubmit={handleUpdateProfile} className="space-y-6 sm:space-y-8">
            <div>
              <label className="block text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-dust mb-2">Full Name</label>
              <input
                type="text"
                className="w-full bg-warm-linen border border-dust p-3 sm:p-4 rounded-lg focus:outline-none focus:border-tan-oak transition-colors text-sm sm:text-base text-dark-walnut"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-dust mb-2">Email Address</label>
              <input
                type="email"
                disabled
                className="w-full bg-warm-linen border border-dust p-3 sm:p-4 rounded-lg text-sm sm:text-base text-dust cursor-not-allowed opacity-60"
                value={user?.email}
              />
            </div>
            <button type="submit" className="cursor-pointer w-full sm:w-auto bg-library-green text-white px-8 sm:px-10 py-3.5 sm:py-4 rounded-lg text-sm sm:text-base font-bold hover:bg-[#3D5A4C] transition-all shadow-md active:scale-95">
              Save Changes
            </button>
          </form>
        </div>
      )}

      {/* ── TAB CONTENT: READING HISTORY ── */}
      {activeTab === "history" && (
        <div className="bg-parchment p-6 sm:p-10 rounded-2xl border border-dust shadow-sm">
          <div className="flex justify-between items-center mb-8 sm:mb-10">
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-dark-walnut">Reading History</h2>
          </div>
          
          <div className="space-y-4 sm:space-y-8">
            {history.length === 0 ? (
              <p className="text-dust font-serif italic text-center py-12">No reading history yet. Open a book to get started!</p>
            ) : (
              history.map((h: any) => (
                <div 
                  key={h.id} 
                  onClick={() => navigate(`/book/${h.book.id}`)} 
                  className="flex gap-4 sm:gap-8 p-4 sm:p-6 bg-warm-linen border border-dust rounded-xl hover:border-tan-oak hover:shadow-md cursor-pointer transition-all group"
                >
                  {/* Book Cover */}
                  <div className="w-16 sm:w-24 h-24 sm:h-36 bg-parchment rounded-lg overflow-hidden shrink-0 border border-dust shadow-sm">
                    <img 
                      src={h.book.coverUrl || "https://via.placeholder.com/150x225?text=No+Cover"} 
                      alt={h.book.title} 
                      className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" 
                      referrerPolicy="no-referrer" 
                    />
                  </div>

                  {/* Book Info & Progress */}
                  <div className="flex-1 flex flex-col justify-center min-w-0">
                    <div className="flex justify-between items-start mb-3 sm:mb-4 gap-3">
                      <div className="min-w-0">
                        <h3 className="font-serif font-bold text-lg sm:text-xl text-dark-walnut group-hover:text-library-green transition-colors line-clamp-2 leading-tight">
                          {h.book.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-tan-oak font-medium italic truncate mt-1">
                          {h.book.author}
                        </p>
                      </div>
                      
                      <div className="text-right shrink-0">
                        <p className="text-xl sm:text-2xl font-serif font-bold text-dark-walnut leading-none">
                          {Math.round(h.percentage)}%
                        </p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); 
                            navigate(`/read/${h.book.id}`);
                          }}
                          className="cursor-pointer text-[9px] sm:text-[10px] font-bold text-library-green hover:underline uppercase tracking-widest mt-1.5 sm:mt-2 block w-full text-right"
                        >
                          {h.percentage >= 99 ? "Read Again" : "Continue"}
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-1.5 bg-dust/50 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${h.percentage >= 99 ? "bg-library-green" : "bg-aged-gold"}`} 
                        style={{ width: `${Math.max(2, h.percentage)}%` }} 
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── TAB CONTENT: SECURITY ── */}
      {activeTab === "security" && (
        <div className="max-w-2xl bg-parchment p-6 sm:p-10 rounded-2xl border border-dust shadow-sm">
          <h2 className="text-2xl sm:text-3xl font-serif font-bold mb-8 sm:mb-10 text-dark-walnut">Security</h2>
          <form onSubmit={handleUpdatePassword} className="space-y-6 sm:space-y-8 mb-12 sm:mb-16">
            <div>
              <label className="block text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-dust mb-2">Current Password</label>
              <input
                type="password"
                placeholder="Enter current password"
                className="w-full bg-warm-linen border border-dust p-3 sm:p-4 rounded-lg focus:outline-none focus:border-tan-oak transition-colors text-sm sm:text-base text-dark-walnut"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-dust mb-2">New Password</label>
              <input
                type="password"
                placeholder="Enter new password"
                className="w-full bg-warm-linen border border-dust p-3 sm:p-4 rounded-lg focus:outline-none focus:border-tan-oak transition-colors text-sm sm:text-base text-dark-walnut"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-dust mb-2">Confirm New Password</label>
              <input
                type="password"
                placeholder="Confirm new password"
                className="w-full bg-warm-linen border border-dust p-3 sm:p-4 rounded-lg focus:outline-none focus:border-tan-oak transition-colors text-sm sm:text-base text-dark-walnut"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <button type="submit" className="cursor-pointer w-full sm:w-auto bg-aged-gold text-white px-8 sm:px-10 py-3.5 sm:py-4 rounded-lg text-sm sm:text-base font-bold hover:bg-[#B8985E] transition-all shadow-md active:scale-95">
              Update Password
            </button>
          </form>

          {/* Danger Zone */}
          <div className="pt-10 sm:pt-12 border-t border-dust">
            <h3 className="text-lg sm:text-xl font-serif font-bold text-red-700 mb-4 sm:mb-6 flex items-center gap-2">
              <AlertCircle size={20} />
              Danger Zone
            </h3>
            <div className="bg-red-50 border border-red-100 p-6 sm:p-8 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div>
                <p className="font-bold text-red-900 text-base sm:text-lg">Delete Account</p>
                <p className="text-xs sm:text-sm text-red-600 font-medium mt-1">This action will permanently remove your library and reading history.</p>
              </div>
              <button className="cursor-pointer w-full md:w-auto bg-red-600 text-white px-6 sm:px-8 py-3.5 sm:py-4 rounded-lg text-sm sm:text-base font-bold hover:bg-red-700 transition-all shadow-md active:scale-95 shrink-0">
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}