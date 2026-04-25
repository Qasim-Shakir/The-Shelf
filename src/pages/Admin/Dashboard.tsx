// AdminDashboard.tsx
import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Book, Users, Activity, Download, RefreshCw, Archive, Plus, Settings } from "lucide-react";
import axios from "axios";

// ── Types ──────────────────────────────────────────────────────────────────────
interface Stats {
  books:    number;
  users:    number;
  sessions: number;
  archived: number;
}

interface ActivityEntry {
  id:        string;
  type:      "added" | "updated" | "deleted" | "archived" | "restored" | "scrape";
  message:   string;
  adminName: string;
  createdAt: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
const EVENT_COLORS: Record<ActivityEntry["type"], { dot: string; label: string; text: string }> = {
  added:    { dot: "bg-aged-gold",    label: "Book Added",     text: "text-aged-gold"    },
  updated:  { dot: "bg-library-green",label: "Metadata Updated",text: "text-library-green"},
  deleted:  { dot: "bg-red-400",      label: "Book Deleted",   text: "text-red-600"      },
  archived: { dot: "bg-tan-oak",      label: "Archived",       text: "text-tan-oak"      },
  restored: { dot: "bg-library-green",label: "Restored",       text: "text-library-green"},
  scrape:   { dot: "bg-dust",         label: "Scrape Initiated",text: "text-dust"         },
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)   return "just now";
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? "yesterday" : `${d}d ago`;
}

// Admin nav shared across all admin pages
export function AdminNav({ active }: { active: "dashboard" | "ingest" | "manage" }) {
  const tabs = [
    { key: "dashboard", label: "Admin Dashboard", to: "/admin"         },
    { key: "ingest",    label: "Ingest Books",    to: "/admin/ingest"  },
    { key: "manage",    label: "Manage Books",    to: "/admin/manage"  },
  ] as const;

  return (
    <div className="flex gap-0 border-b border-dust mb-12 overflow-x-auto">
      {tabs.map((t) => (
        <Link key={t.key} to={t.to}
          className={`pb-4 px-6 border-b-2 font-bold text-sm shrink-0 transition-colors ${
            active === t.key
              ? "border-dark-walnut text-dark-walnut"
              : "border-transparent text-dust hover:text-tan-oak"
          }`}>
          {t.label}
        </Link>
      ))}
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { token }                   = useAuth();
  // All keys default to 0 so statCards never receives undefined even before
  // the API responds or if the server omits a field.
  const [stats,    setStats]        = useState<Stats>({ books: 0, users: 0, sessions: 0, archived: 0 });
  const [activity, setActivity]     = useState<ActivityEntry[]>([]);
  const [loading,  setLoading]      = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting]   = useState(false);
  const [error,    setError]        = useState("");

  const headers = { Authorization: `Bearer ${token}` };

  const fetchAll = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    else        setRefreshing(true);
    setError("");
    try {
      const [statsRes, activityRes] = await Promise.all([
        axios.get("/api/admin/stats",    { headers }),
        axios.get("/api/admin/activity", { headers }),
      ]);
      // Merge with defaults so partial API responses never leave a field undefined
      setStats({ books: 0, users: 0, sessions: 0, archived: 0, ...statsRes.data });
      setActivity(activityRes.data ?? []);
    } catch (err: any) {
      setError(err.response?.data?.error ?? "Failed to load dashboard data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Export activity log as CSV
  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await axios.get("/api/admin/activity/export", {
        headers,
        responseType: "blob",
      });
      const url  = URL.createObjectURL(res.data);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `shelf-activity-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Fallback: build CSV client-side from fetched data
      const rows = [
        ["Type", "Message", "Admin", "When"],
        ...activity.map((e) => [e.type, `"${e.message}"`, e.adminName, e.createdAt]),
      ];
      const csv  = rows.map((r) => r.join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `shelf-activity-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  // ?? 0 ensures undefined from a partial API response never reaches .toLocaleString()
  const statCards = [
    { label: "Active Books",     value: stats.books    ?? 0, icon: Book,     accent: false },
    { label: "Total Users",      value: stats.users    ?? 0, icon: Users,    accent: false },
    { label: "Reading Sessions", value: stats.sessions ?? 0, icon: Activity, accent: false },
    { label: "Archived Books",   value: stats.archived ?? 0, icon: Archive,  accent: true  },
  ];

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">

      {/* Header */}
      <div className="flex justify-between items-start mb-12">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-dust mb-2">The Shelf</p>
          <h1 className="text-4xl font-serif font-bold text-dark-walnut mb-3">Admin Dashboard</h1>
          <p className="text-tan-oak font-medium italic">Manage the library. Choose an action.</p>
        </div>
        <div className="flex items-center gap-3 mt-2">
          <Link to="/library"
            className="text-[10px] font-bold uppercase tracking-widest text-tan-oak border border-dust px-4 py-2.5 rounded-lg hover:bg-parchment transition-colors">
            ← Library View
          </Link>
          <Link to="/admin/ingest"
            className="flex items-center gap-2 bg-library-green text-white text-[10px] font-bold uppercase tracking-widest px-4 py-2.5 rounded-lg hover:bg-[#3D5A4C] transition-all shadow-sm">
            <Plus size={14} /> Ingest Books
          </Link>
        </div>
      </div>

      <AdminNav active="dashboard" />

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-100 text-red-700 text-sm font-bold px-5 py-4 rounded-xl mb-8">
          {error}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-14">
        {statCards.map(({ label, value, icon: Icon, accent }) => (
          <div key={label}
            className={`border border-dust p-7 rounded-xl shadow-sm ${accent ? "bg-[#EFE9DD]" : "bg-parchment"}`}>
            <div className="flex justify-between items-start mb-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-dust">{label}</p>
              <Icon size={18} className={accent ? "text-tan-oak" : "text-dust"} />
            </div>
            {loading
              ? <div className="h-12 w-16 bg-dust/30 rounded animate-pulse" />
              : <p className={`text-5xl font-serif font-bold ${accent ? "text-tan-oak" : "text-dark-walnut"}`}>
                  {(value ?? 0).toLocaleString()}
                </p>
            }
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-14">
        {[
          { icon: Plus,     label: "Ingest New Books",  to: "/admin/ingest", primary: true  },
          { icon: Settings, label: "Manage Books",      to: "/admin/manage", primary: false },
          { icon: Archive,  label: "View Archived",     to: "/admin/manage?filter=archived", primary: false },
        ].map(({ icon: Icon, label, to, primary }) => (
          <Link key={label} to={to}
            className={`flex items-center gap-3 px-6 py-4 rounded-xl border font-bold text-sm transition-all
              ${primary
                ? "bg-library-green text-white border-library-green hover:bg-[#3D5A4C] shadow-sm"
                : "bg-parchment text-tan-oak border-dust hover:border-tan-oak hover:text-dark-walnut"
              }`}>
            <Icon size={18} />
            {label}
          </Link>
        ))}
      </div>

      {/* Activity log */}
      <div className="bg-parchment border border-dust rounded-2xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-dust flex justify-between items-center">
          <h3 className="font-serif font-bold text-xl text-dark-walnut">Recent Admin Activity</h3>
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchAll(true)}
              disabled={refreshing}
              className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-tan-oak border border-dust px-4 py-2 rounded-lg hover:bg-warm-linen transition-colors">
              <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
              Refresh
            </button>
            <button
              onClick={handleExport}
              disabled={exporting || activity.length === 0}
              className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-tan-oak border border-dust px-4 py-2 rounded-lg hover:bg-warm-linen transition-colors disabled:opacity-40">
              <Download size={13} className={exporting ? "animate-bounce" : ""} />
              Export CSV
            </button>
          </div>
        </div>

        <div className="divide-y divide-dust">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-4 p-6">
                <div className="w-2 h-2 rounded-full bg-dust/40 mt-2 shrink-0 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-dust/30 rounded animate-pulse w-3/4" />
                  <div className="h-2.5 bg-dust/20 rounded animate-pulse w-1/3" />
                </div>
              </div>
            ))
          ) : activity.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-dust gap-3">
              <Activity size={36} strokeWidth={1} />
              <p className="font-serif italic">No admin activity recorded yet.</p>
            </div>
          ) : (
            activity.slice(0, 20).map((entry) => {
              const cfg = EVENT_COLORS[entry.type] ?? EVENT_COLORS.updated;
              return (
                <div key={entry.id} className="flex items-start gap-4 px-6 py-5 hover:bg-warm-linen transition-colors">
                  <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${cfg.dot}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-dark-walnut">
                      <span className={`font-bold ${cfg.text}`}>{cfg.label}:&nbsp;</span>
                      {entry.message}
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-dust mt-1">
                      by {entry.adminName} · {timeAgo(entry.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}